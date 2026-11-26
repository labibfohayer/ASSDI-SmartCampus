import zoneinfo
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.models import UserRole
from apps.batches.models import TeacherAssignment
from apps.class_sessions.models import ClassSession
from apps.students.models import Enrollment, EnrollmentStatus, Student
from .models import (
    Homework,
    HomeworkSubmission,
    HomeworkSubmissionStatus,
    MicroQuiz,
    QuizAttempt,
    SpeakingVideoStatus,
    SpeakingVideoSubmission,
)
from .serializers import (
    HomeworkSerializer,
    HomeworkSubmissionSerializer,
    MicroQuizSerializer,
    QuizAttemptSerializer,
    SpeakingVideoEvaluationSerializer,
    SpeakingVideoSubmissionSerializer,
)


class MicroQuizViewSet(viewsets.ModelViewSet):
    """
    CRUD for MicroQuiz + instant MCQ auto-grading submit action.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MicroQuizSerializer

    def get_queryset(self):
        user = self.request.user
        qs = MicroQuiz.objects.select_related(
            "session", "session__batch", "session__subject", "topic"
        ).prefetch_related("questions")

        # Session filtering
        session_id = self.request.query_params.get("session")
        if session_id:
            qs = qs.filter(session_id=session_id)

        if user.role in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.OBSERVER]:
            return qs

        if user.role == UserRole.TEACHER:
            return qs.filter(
                Q(session__teacher_user=user)
                | Q(session__batch__teacher_assignments__teacher_user=user)
            ).distinct()

        if user.role == UserRole.STUDENT:
            if self.action in ["submit", "retrieve"]:
                return qs.filter(is_active=True)
            student = Student.objects.filter(user=user).first()
            if not student:
                return MicroQuiz.objects.none()
            enrolled_batch_ids = Enrollment.objects.filter(
                student=student, status=EnrollmentStatus.ACTIVE
            ).values_list("batch_id", flat=True)
            return qs.filter(session__batch_id__in=enrolled_batch_ids, is_active=True).distinct()

        return MicroQuiz.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        session = serializer.validated_data.get("session")

        if user.role in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR]:
            serializer.save(created_by=user)
            return

        if user.role == UserRole.TEACHER:
            is_assigned = (session.teacher_user == user) or TeacherAssignment.objects.filter(
                batch=session.batch,
                subject=session.subject,
                teacher_user=user,
            ).exists()
            if not is_assigned:
                raise PermissionDenied("You are not assigned to teach this batch/session.")
            serializer.save(created_by=user)
            return

        raise PermissionDenied("You do not have permission to create quizzes.")

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        if user.role != UserRole.STUDENT:
            return Response(
                {"detail": "Only students can submit quiz attempts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        student = Student.objects.filter(user=user).first()
        if not student:
            return Response(
                {"detail": "Student profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check batch enrollment
        is_enrolled = Enrollment.objects.filter(
            student=student,
            batch=quiz.session.batch,
            status=EnrollmentStatus.ACTIVE,
        ).exists()
        if not is_enrolled:
            return Response(
                {"detail": "You are not actively enrolled in this batch."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Unique submission check: student can only attempt once
        if QuizAttempt.objects.filter(quiz=quiz, student=student).exists():
            return Response(
                {"detail": "You have already completed this quiz."},
                status=status.HTTP_409_CONFLICT,
            )

        # Calculate score
        student_answers = request.data.get("answers", {})
        questions = quiz.questions.all()
        total_questions = questions.count()
        score = 0

        for q in questions:
            chosen = student_answers.get(str(q.id)) or student_answers.get(q.id)
            if chosen and str(chosen).strip().upper() == str(q.correct_option).strip().upper():
                score += q.points

        passed = True if total_questions == 0 else (score >= (total_questions * 0.5))

        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=student,
            answers=student_answers,
            score=score,
            total_questions=total_questions,
            passed=passed,
            submitted_at=timezone.now(),
        )

        serializer = QuizAttemptSerializer(attempt, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class HomeworkViewSet(viewsets.ModelViewSet):
    """
    CRUD for Homework + Student Submission + Teacher Grading.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = HomeworkSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Homework.objects.select_related("session", "session__batch", "created_by")

        session_id = self.request.query_params.get("session")
        if session_id:
            qs = qs.filter(session_id=session_id)

        if user.role in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.OBSERVER]:
            return qs

        if user.role == UserRole.TEACHER:
            return qs.filter(
                Q(session__teacher_user=user)
                | Q(session__batch__teacher_assignments__teacher_user=user)
            ).distinct()

        if user.role == UserRole.STUDENT:
            if self.action in ["submit", "my_submission", "retrieve"]:
                return qs
            student = Student.objects.filter(user=user).first()
            if not student:
                return Homework.objects.none()
            enrolled_batch_ids = Enrollment.objects.filter(
                student=student, status=EnrollmentStatus.ACTIVE
            ).values_list("batch_id", flat=True)
            return qs.filter(session__batch_id__in=enrolled_batch_ids).distinct()

        return Homework.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        session = serializer.validated_data.get("session")

        if user.role in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR]:
            serializer.save(created_by=user)
            return

        if user.role == UserRole.TEACHER:
            is_assigned = (session.teacher_user == user) or TeacherAssignment.objects.filter(
                batch=session.batch,
                subject=session.subject,
                teacher_user=user,
            ).exists()
            if not is_assigned:
                raise PermissionDenied("You are not assigned to teach this batch/session.")
            serializer.save(created_by=user)
            return

        raise PermissionDenied("You do not have permission to create homework.")

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        homework = self.get_object()
        user = request.user

        if user.role != UserRole.STUDENT:
            return Response(
                {"detail": "Only students can submit homework."},
                status=status.HTTP_403_FORBIDDEN,
            )

        student = Student.objects.filter(user=user).first()
        if not student:
            return Response(
                {"detail": "Student profile not found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check batch enrollment
        is_enrolled = Enrollment.objects.filter(
            student=student,
            batch=homework.session.batch,
            status=EnrollmentStatus.ACTIVE,
        ).exists()
        if not is_enrolled:
            return Response(
                {"detail": "You are not actively enrolled in this batch."},
                status=status.HTTP_403_FORBIDDEN,
            )

        submission_text = request.data.get("submission_text", "")
        attachment_url = request.data.get("attachment_url", "")

        submission, created = HomeworkSubmission.objects.get_or_create(
            homework=homework,
            student=student,
            defaults={
                "submission_text": submission_text,
                "attachment_url": attachment_url,
                "status": HomeworkSubmissionStatus.SUBMITTED,
                "submitted_at": timezone.now(),
            },
        )

        if not created:
            submission.submission_text = submission_text
            submission.attachment_url = attachment_url
            submission.status = HomeworkSubmissionStatus.SUBMITTED
            submission.submitted_at = timezone.now()
            submission.save()

        serializer = HomeworkSubmissionSerializer(submission, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="my-submission")
    def my_submission(self, request, pk=None):
        homework = self.get_object()
        user = request.user

        student = Student.objects.filter(user=user).first()
        if not student:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        submission = HomeworkSubmission.objects.filter(
            homework=homework,
            student=student,
        ).first()

        if not submission:
            return Response({"detail": "No submission found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = HomeworkSubmissionSerializer(submission, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path=r"review/(?P<submission_id>[^/.]+)")
    def review(self, request, pk=None, submission_id=None):
        homework = self.get_object()
        user = request.user

        # Permission check
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR]:
            is_assigned = (homework.session.teacher_user == user) or TeacherAssignment.objects.filter(
                batch=homework.session.batch,
                subject=homework.session.subject,
                teacher_user=user,
            ).exists()
            if not is_assigned:
                return Response(
                    {"detail": "You are not assigned to grade this homework."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        submission = get_object_or_404(
            HomeworkSubmission, id=submission_id, homework=homework
        )

        score = request.data.get("score")
        teacher_feedback = request.data.get("teacher_feedback", "")

        if score is not None:
            submission.score = int(score)
        submission.teacher_feedback = teacher_feedback
        submission.status = HomeworkSubmissionStatus.REVIEWED
        submission.reviewed_at = timezone.now()
        submission.reviewed_by = user
        submission.save()

        serializer = HomeworkSubmissionSerializer(submission, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="submissions")
    def submissions(self, request, pk=None):
        homework = self.get_object()
        user = request.user

        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR]:
            is_assigned = (homework.session.teacher_user == user) or TeacherAssignment.objects.filter(
                batch=homework.session.batch,
                subject=homework.session.subject,
                teacher_user=user,
            ).exists()
            if not is_assigned:
                return Response(
                    {"detail": "Permission denied."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        subs = homework.submissions.select_related("student", "student__user").all()
        serializer = HomeworkSubmissionSerializer(subs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class SpeakingVideoSubmissionViewSet(viewsets.ModelViewSet):
    """
    Speaking Video Assignment & Assessment (Section 11).
    Supports video uploads, YouTube/drive stream links, multi-criteria rubric evaluation,
    and original-quality video downloads.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SpeakingVideoSubmissionSerializer

    def get_queryset(self):
        user = self.request.user
        qs = SpeakingVideoSubmission.objects.select_related(
            "student", "student__user", "batch", "subject", "evaluated_by"
        )

        batch_id = self.request.query_params.get("batch")
        if batch_id:
            qs = qs.filter(batch_id=batch_id)

        subject_id = self.request.query_params.get("subject")
        if subject_id:
            qs = qs.filter(subject_id=subject_id)

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        level_param = self.request.query_params.get("level")
        if level_param:
            qs = qs.filter(level=level_param)

        if user.role == UserRole.STUDENT:
            return qs.filter(student__user=user)

        if user.role == UserRole.TEACHER:
            assigned_batches = TeacherAssignment.objects.filter(teacher_user=user).values_list("batch_id", flat=True)
            return qs.filter(Q(batch_id__in=assigned_batches) | Q(evaluated_by=user))

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != UserRole.STUDENT:
            raise PermissionDenied("Only students can submit speaking videos.")
        student = Student.objects.filter(user=user).first()
        if not student:
            raise PermissionDenied("Active student record required.")
        serializer.save(student=student)

    @action(detail=True, methods=["post"], url_path="evaluate")
    def evaluate(self, request, pk=None):
        submission = self.get_object()
        user = request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.TEACHER]:
            raise PermissionDenied("Only teachers or administrators can evaluate speaking videos.")

        serializer = SpeakingVideoEvaluationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        submission.score_body_language = data["score_body_language"]
        submission.score_pronunciation_fluency = data["score_pronunciation_fluency"]
        submission.score_content_vocabulary = data["score_content_vocabulary"]
        submission.score_presentation_delivery = data["score_presentation_delivery"]
        submission.teacher_feedback = data.get("teacher_feedback", "")
        submission.revision_reason = data.get("revision_reason", "")
        submission.status = data.get("status", SpeakingVideoStatus.EVALUATED)
        submission.evaluated_by = user
        submission.evaluated_at = timezone.now()

        # Calculate sum and letter grade
        submission.calculate_total_and_grade()
        submission.save()

        res_serializer = SpeakingVideoSubmissionSerializer(submission, context={"request": request})
        return Response(res_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="download_original")
    def download_original(self, request, pk=None):
        submission = self.get_object()
        if submission.video_file:
            from django.http import FileResponse
            response = FileResponse(submission.video_file.open("rb"), as_attachment=True)
            response["Content-Disposition"] = f'attachment; filename="{submission.video_file.name.split("/")[-1]}"'
            return response
        elif submission.video_url:
            from django.shortcuts import redirect
            return redirect(submission.video_url)
        return Response({"detail": "No video file or stream URL available."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        qs = self.get_queryset()
        total = qs.count()
        submitted = qs.filter(status=SpeakingVideoStatus.SUBMITTED).count()
        under_review = qs.filter(status=SpeakingVideoStatus.UNDER_REVIEW).count()
        evaluated = qs.filter(status=SpeakingVideoStatus.EVALUATED).count()
        needs_revision = qs.filter(status=SpeakingVideoStatus.REVISION_REQUESTED).count()

        return Response({
            "total_videos": total,
            "submitted": submitted,
            "under_review": under_review,
            "evaluated": evaluated,
            "needs_revision": needs_revision,
        }, status=status.HTTP_200_OK)

