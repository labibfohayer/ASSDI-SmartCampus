import datetime
import zoneinfo
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Avg, Q
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.academic.models import ClassTopic, Subject
from apps.accounts.models import UserRole
from apps.accounts.permissions import IsCoordinator, IsTeacher
from apps.audit.models import AuditLog
from apps.batches.models import Batch, TeacherAssignment
from apps.class_sessions.models import ClassSession, SessionAudience, SessionStatus
from apps.students.models import EducationBackground, EnrollmentStatus, Student, StudentStatus

from .constants import ALL_BANDS, get_understanding_band, rating_to_percentage
from .models import (
    HelpRequest,
    HelpRequestMessage,
    HelpRequestStatus,
    LearningFeedback,
    SubjectUnderstandingHistory,
    SubjectUnderstandingProgress,
)
from .serializers import (
    FeedbackSummarySerializer,
    HelpRequestMessageSerializer,
    HelpRequestResolveSerializer,
    HelpRequestSerializer,
    LearningFeedbackCreateSerializer,
    LearningFeedbackSerializer,
    LearningFeedbackStudentReadSerializer,
    StudentProgressSerializer,
    SubjectUnderstandingHistorySerializer,
    SubjectUnderstandingProgressSerializer,
    TopicUnderstandingSerializer,
)
from .signals import help_request_created


class LearningFeedbackViewSet(viewsets.GenericViewSet):
    """
    Daily 10-15s learning feedback submissions by enrolled students.
    Enforces timing window, audience matching, duplicate detection (409),
    safe client_submission_id retry, and atomic HelpRequest creation.
    """

    serializer_class = LearningFeedbackSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return LearningFeedback.objects.none()

        qs = LearningFeedback.objects.select_related(
            "session", "session__subject", "session__batch", "student", "student__user", "topic"
        )

        if user.role == UserRole.STUDENT:
            return qs.filter(student__user=user)

        if user.role == UserRole.SUPER_ADMIN:
            return qs

        if user.role == UserRole.COORDINATOR:
            assigned = user.coordinator_course_assignments.values_list("course_id", flat=True)
            return qs.filter(session__batch__course_id__in=assigned)

        if user.role == UserRole.TEACHER:
            return qs.filter(session__teacher_user=user)

        # Observer never sees individual feedback rows
        return LearningFeedback.objects.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role != UserRole.STUDENT:
            raise PermissionDenied("Only enrolled students can submit feedback.")

        student = Student.objects.filter(user=user, status=StudentStatus.ACTIVE).first()
        if not student:
            raise PermissionDenied("Active student profile required to submit feedback.")

        serializer = LearningFeedbackCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session = serializer.validated_data["session"]
        rating = serializer.validated_data["understanding_rating"]
        needs_help = serializer.validated_data.get("needs_help", False)
        student_comment = serializer.validated_data.get("student_comment", "")
        client_submission_id = serializer.validated_data.get("client_submission_id")

        # 1. Session Status Check: only published sessions
        if session.status != SessionStatus.PUBLISHED:
            raise DRFValidationError({"session": "Cannot submit feedback for a draft or cancelled session."})

        # 2. Enrollment Check: student must have active enrollment in session's batch
        is_enrolled = student.enrollments.filter(batch=session.batch, status=EnrollmentStatus.ACTIVE).exists()
        if not is_enrolled:
            raise PermissionDenied("You are not enrolled in the batch for this session.")

        # 3. Audience Rule: student background must match session audience
        if session.audience == SessionAudience.GENERAL:
            if student.education_background != EducationBackground.GENERAL:
                raise PermissionDenied("This session is restricted to general students.")
        elif session.audience == SessionAudience.MADRASA:
            if student.education_background not in [EducationBackground.ALIYA, EducationBackground.QAWMI]:
                raise PermissionDenied("This session is restricted to madrasa students.")

        # 4. Submission Timing Window in Asia/Dhaka
        dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
        now_dhaka = timezone.now().astimezone(dhaka_tz)
        session_end_dt = datetime.datetime.combine(session.session_date, session.end_time, tzinfo=dhaka_tz)

        if now_dhaka < session_end_dt:
            raise DRFValidationError({"detail": "Feedback submission opens only after the session ends."})

        window_hours = getattr(settings, "FEEDBACK_WINDOW_HOURS", 24)
        window_close_dt = session_end_dt + datetime.timedelta(hours=window_hours)
        if now_dhaka > window_close_dt:
            raise DRFValidationError({"detail": "Feedback submission window has closed."})

        # 5. Safe Idempotency for client_submission_id (User Change 2)
        if client_submission_id:
            existing_sub = LearningFeedback.objects.filter(client_submission_id=client_submission_id).first()
            if existing_sub:
                if existing_sub.student == student and existing_sub.session_id == session.id:
                    # Safe idempotent retry: return original object with HTTP 200 OK
                    return Response(LearningFeedbackSerializer(existing_sub).data, status=status.HTTP_200_OK)
                else:
                    # Belongs to another student or session: reject safely without leaking data
                    raise DRFValidationError({"client_submission_id": "Invalid submission identifier."})

        # 6. One feedback per (session, student) -> 409 Conflict if duplicate
        if LearningFeedback.objects.filter(session=session, student=student).exists():
            return Response(
                {"code": "ALREADY_SUBMITTED", "detail": "Feedback already submitted for this class."},
                status=status.HTTP_409_CONFLICT,
            )

        # 7. Atomic Creation of Feedback & HelpRequest (User Change 3)
        with transaction.atomic():
            feedback = LearningFeedback.objects.create(
                session=session,
                student=student,
                topic=session.topic,
                understanding_rating=rating,
                needs_help=needs_help,
                student_comment=student_comment,
                client_submission_id=client_submission_id,
                submitted_at=timezone.now(),
            )

            if needs_help:
                help_req = HelpRequest.objects.create(
                    feedback=feedback,
                    student=student,
                    teacher_user=session.teacher_user,
                    session=session,
                    topic=session.topic,
                    student_message=student_comment,  # copy comment into message
                    status=HelpRequestStatus.PENDING,
                )
                help_request_created.send(
                    sender=HelpRequest,
                    help_request=help_req,
                    created_by_user=user,
                )

        return Response(LearningFeedbackSerializer(feedback).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request):
        """Returns the authenticated student's own feedback history."""
        user = request.user
        if user.role != UserRole.STUDENT:
            raise PermissionDenied("Only students have a personal feedback history.")
        qs = LearningFeedback.objects.filter(student__user=user).select_related(
            "session", "session__subject", "topic"
        ).order_by("-submitted_at")
        serializer = LearningFeedbackSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class HelpRequestViewSet(viewsets.ModelViewSet):
    """
    Teacher Assistance & 10-Step Student Learning Problem Lifecycle (Section 9.2, 9.3).
    Follows: Draft -> Submitted -> Awaiting Teacher -> Answered -> Follow-up Required -> Resolved -> Reopened.
    Tracks 24h overdue status, threaded conversation messages, and student resolution confirmation.
    """

    serializer_class = HelpRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["student__student_id_number", "student__user__full_name", "topic__title", "unclear_part", "student_message"]
    ordering_fields = ["created_at", "status"]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return HelpRequest.objects.none()

        if user.role == UserRole.OBSERVER:
            raise PermissionDenied("Observers are not permitted to access help requests.")

        qs = HelpRequest.objects.select_related(
            "feedback", "student", "student__user", "session", "session__batch",
            "session__subject", "subject", "topic", "teacher_user", "resolved_by"
        ).prefetch_related("messages", "messages__sender_user")

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        batch_id = self.request.query_params.get("batch_id")
        if batch_id:
            qs = qs.filter(Q(session__batch_id=batch_id) | Q(student__enrollments__batch_id=batch_id))

        subject_id = self.request.query_params.get("subject_id")
        if subject_id:
            qs = qs.filter(Q(session__subject_id=subject_id) | Q(subject_id=subject_id))

        if user.role == UserRole.SUPER_ADMIN:
            return qs.order_by("-created_at")

        if user.role == UserRole.COORDINATOR:
            assigned = user.coordinator_course_assignments.values_list("course_id", flat=True)
            return qs.filter(
                Q(session__batch__course_id__in=assigned) |
                Q(student__enrollments__batch__course_id__in=assigned)
            ).distinct().order_by("-created_at")

        if user.role == UserRole.TEACHER:
            return qs.filter(teacher_user=user).order_by("-created_at")

        if user.role == UserRole.STUDENT:
            return qs.filter(student__user=user).order_by("-created_at")

        return HelpRequest.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != UserRole.STUDENT:
            raise PermissionDenied("Only students can submit learning questions.")

        student = Student.objects.filter(user=user, status=StudentStatus.ACTIVE).first()
        if not student:
            raise PermissionDenied("Active student record required.")

        subject_id = self.request.data.get("subject")
        session_id = self.request.data.get("session")
        unclear_part = self.request.data.get("unclear_part", "")
        student_message = self.request.data.get("student_message", "")
        reported_pct = self.request.data.get("reported_understanding_pct")

        # Find teacher
        teacher = None
        session = None
        subject = None

        if session_id:
            session = ClassSession.objects.filter(id=session_id).first()
            if session:
                teacher = session.teacher_user
                subject = session.subject

        if not subject and subject_id:
            subject = Subject.objects.filter(id=subject_id).first()

        if not teacher and subject:
            # Look up assigned teacher for student's current batch
            active_enrollment = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).first()
            if active_enrollment:
                assign = TeacherAssignment.objects.filter(batch=active_enrollment.batch, subject=subject).first()
                if assign:
                    teacher = assign.teacher_user

        if not teacher:
            # Fallback to any teacher or staff
            first_teacher = TeacherAssignment.objects.first()
            teacher = first_teacher.teacher_user if first_teacher else user

        hr = serializer.save(
            student=student,
            teacher_user=teacher,
            session=session,
            subject=subject,
            unclear_part=unclear_part,
            student_message=student_message,
            reported_understanding_pct=reported_pct,
            status=HelpRequestStatus.SUBMITTED,
        )

        # Create initial message if student wrote a message
        if student_message:
            HelpRequestMessage.objects.create(
                help_request=hr,
                sender_user=user,
                message_text=student_message,
                is_teacher_response=False,
            )

    @action(detail=True, methods=["post"], url_path="reply")
    def reply(self, request, pk=None):
        """Threaded reply endpoint for teacher or student (Section 9.4)."""
        hr = self.get_object()
        user = request.user
        message_text = request.data.get("message_text", "").strip()
        if not message_text:
            raise DRFValidationError({"message_text": "Message text cannot be empty."})

        attached_url = request.data.get("attached_resource_url", "")
        attached_name = request.data.get("attached_resource_name", "")

        is_teacher = user.role in [UserRole.TEACHER, UserRole.COORDINATOR, UserRole.SUPER_ADMIN]

        msg = HelpRequestMessage.objects.create(
            help_request=hr,
            sender_user=user,
            message_text=message_text,
            attached_resource_url=attached_url,
            attached_resource_name=attached_name,
            is_teacher_response=is_teacher,
        )

        if is_teacher:
            hr.status = HelpRequestStatus.ANSWERED
            hr.last_teacher_response_at = timezone.now()
            hr.teacher_note = message_text
            hr.save(update_fields=["status", "last_teacher_response_at", "teacher_note"])
        else:
            hr.status = HelpRequestStatus.FOLLOW_UP_REQUIRED
            hr.student_resolution_confirmed = False
            hr.save(update_fields=["status", "student_resolution_confirmed"])

        return Response(self.get_serializer(hr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="mark_understood")
    def mark_understood(self, request, pk=None):
        """Student marks question as understood and resolved (Section 9.2 Step 10)."""
        hr = self.get_object()
        user = request.user
        if user.role != UserRole.STUDENT and hr.student.user != user:
            raise PermissionDenied("Only the inquiring student can confirm understanding.")

        hr.student_resolution_confirmed = True
        hr.status = HelpRequestStatus.RESOLVED
        hr.resolved_at = timezone.now()
        hr.resolved_by = user
        hr.save(update_fields=["student_resolution_confirmed", "status", "resolved_at", "resolved_by"])

        return Response(self.get_serializer(hr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="mark_unclear")
    def mark_unclear(self, request, pk=None):
        """Student marks question as still unclear, requiring further follow-up (Section 9.2 Step 10)."""
        hr = self.get_object()
        user = request.user
        if user.role != UserRole.STUDENT and hr.student.user != user:
            raise PermissionDenied("Only the inquiring student can mark as unclear.")

        hr.student_resolution_confirmed = False
        hr.status = HelpRequestStatus.FOLLOW_UP_REQUIRED
        hr.save(update_fields=["student_resolution_confirmed", "status"])

        return Response(self.get_serializer(hr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        """Teacher or admin marks request as resolved with final note."""
        hr = self.get_object()
        user = request.user
        teacher_note = request.data.get("teacher_note", "")

        hr.status = HelpRequestStatus.RESOLVED
        hr.resolved_at = timezone.now()
        hr.resolved_by = user
        if teacher_note:
            hr.teacher_note = teacher_note
        hr.save()

        return Response(self.get_serializer(hr).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """Aggregated KPIs for questions, response times, and overdue alerts (Section 9.5)."""
        qs = self.get_queryset()
        now = timezone.now()
        overdue_threshold = now - datetime.timedelta(hours=24)

        total = qs.count()
        awaiting = qs.filter(status__in=[HelpRequestStatus.PENDING, HelpRequestStatus.SUBMITTED, HelpRequestStatus.AWAITING_TEACHER]).count()
        answered = qs.filter(status=HelpRequestStatus.ANSWERED).count()
        follow_up = qs.filter(status=HelpRequestStatus.FOLLOW_UP_REQUIRED).count()
        resolved = qs.filter(status=HelpRequestStatus.RESOLVED).count()
        overdue = qs.filter(
            status__in=[HelpRequestStatus.PENDING, HelpRequestStatus.SUBMITTED, HelpRequestStatus.AWAITING_TEACHER, HelpRequestStatus.REOPENED],
            created_at__lt=overdue_threshold,
        ).count()

        return Response({
            "total_questions": total,
            "awaiting_response": awaiting,
            "answered": answered,
            "follow_up_required": follow_up,
            "resolved": resolved,
            "overdue_count": overdue,
        }, status=status.HTTP_200_OK)


class SubjectUnderstandingViewSet(viewsets.ModelViewSet):
    """
    Subject Understanding Percentage Management (Section 9.1).
    Allows students to report 0-100% understanding with slider.
    Allows teachers & admins to monitor understanding trends and low-score (< 50%) alerts.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = SubjectUnderstandingProgressSerializer

    def get_queryset(self):
        user = self.request.user
        qs = SubjectUnderstandingProgress.objects.select_related(
            "student", "student__user", "subject"
        ).prefetch_related("history")

        subject_id = self.request.query_params.get("subject")
        if subject_id:
            qs = qs.filter(subject_id=subject_id)

        if user.role == UserRole.STUDENT:
            return qs.filter(student__user=user)

        if user.role == UserRole.TEACHER:
            assigned_subjects = TeacherAssignment.objects.filter(teacher_user=user).values_list("subject_id", flat=True)
            return qs.filter(subject_id__in=assigned_subjects)

        return qs

    def create(self, request, *args, **kwargs):
        """Update or create understanding percentage (0-100%) and log history."""
        user = request.user
        if user.role != UserRole.STUDENT:
            raise PermissionDenied("Only students can report subject understanding.")

        student = Student.objects.filter(user=user, status=StudentStatus.ACTIVE).first()
        if not student:
            raise PermissionDenied("Active student record required.")

        subject_id = request.data.get("subject")
        pct = int(request.data.get("understanding_percentage", 0))
        notes = request.data.get("student_notes", "")

        if not subject_id:
            raise DRFValidationError({"subject": "Subject is required."})
        subject = get_object_or_404(Subject, id=subject_id)

        record, created = SubjectUnderstandingProgress.objects.get_or_create(
            student=student,
            subject=subject,
            defaults={"understanding_percentage": pct, "previous_percentage": 0, "student_notes": notes},
        )

        if not created:
            record.previous_percentage = record.understanding_percentage
            record.understanding_percentage = pct
            if notes:
                record.student_notes = notes
            record.save()

        # Log history
        SubjectUnderstandingHistory.objects.create(
            progress=record,
            percentage=pct,
            notes=notes,
        )

        serializer = self.get_serializer(record)
        return Response(serializer.data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="analytics")
    def analytics(self, request):
        """Subject-wise understanding averages and low understanding (< 50%) alerts (Section 9.6)."""
        qs = SubjectUnderstandingProgress.objects.select_related("subject", "student", "student__user")
        subjects = Subject.objects.all()

        results = []
        for s in subjects:
            s_qs = qs.filter(subject=s)
            count = s_qs.count()
            avg_pct = s_qs.aggregate(Avg("understanding_percentage"))["understanding_percentage__avg"] or 0
            low_understanding = s_qs.filter(understanding_percentage__lt=50).count()

            results.append({
                "subject_id": s.id,
                "subject_name": s.name,
                "subject_code": s.code,
                "total_reports": count,
                "average_percentage": round(avg_pct, 1),
                "low_understanding_count": low_understanding,
            })

        return Response(results, status=status.HTTP_200_OK)

