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
from .models import HelpRequest, HelpRequestStatus, LearningFeedback
from .serializers import (
    FeedbackSummarySerializer,
    HelpRequestResolveSerializer,
    HelpRequestSerializer,
    LearningFeedbackCreateSerializer,
    LearningFeedbackSerializer,
    LearningFeedbackStudentReadSerializer,
    StudentProgressSerializer,
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


class HelpRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Teacher Assistance Requests Board.
    Follows forward-only lifecycle: pending -> in_progress -> resolved.
    Strictly scoped: teachers see assigned requests; students see only their own.
    Observer is strictly forbidden (HTTP 403).
    """

    serializer_class = HelpRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["student__student_id_number", "student__user__full_name", "topic__title"]
    ordering_fields = ["created_at", "status"]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return HelpRequest.objects.none()

        # Observer strictly forbidden (User Change 4)
        if user.role == UserRole.OBSERVER:
            raise PermissionDenied("Observers are not permitted to access help requests.")

        qs = HelpRequest.objects.select_related(
            "feedback", "student", "student__user", "session", "session__batch",
            "session__subject", "topic", "teacher_user", "resolved_by"
        )

        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        batch_id = self.request.query_params.get("batch_id")
        if batch_id:
            qs = qs.filter(session__batch_id=batch_id)

        subject_id = self.request.query_params.get("subject_id")
        if subject_id:
            qs = qs.filter(session__subject_id=subject_id)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(session__session_date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(session__session_date__lte=date_to)

        if user.role == UserRole.SUPER_ADMIN:
            return qs.order_by("created_at")

        if user.role == UserRole.COORDINATOR:
            assigned = user.coordinator_course_assignments.values_list("course_id", flat=True)
            return qs.filter(session__batch__course_id__in=assigned).order_by("created_at")

        if user.role == UserRole.TEACHER:
            return qs.filter(teacher_user=user).order_by("created_at")

        if user.role == UserRole.STUDENT:
            return qs.filter(student__user=user).order_by("-created_at")

        return HelpRequest.objects.none()

    def get_object(self):
        pk = self.kwargs.get("pk")
        user = self.request.user

        if user.role == UserRole.OBSERVER:
            raise PermissionDenied("Observers are not permitted to access help requests.")

        try:
            hr = HelpRequest.objects.select_related(
                "feedback", "student", "student__user", "session", "session__batch",
                "session__subject", "topic", "teacher_user", "resolved_by"
            ).get(pk=pk)
        except HelpRequest.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Help request not found.")

        if user.role == UserRole.STUDENT and hr.student.user != user:
            raise PermissionDenied("Students can only view their own help requests.")
        elif user.role == UserRole.TEACHER and hr.teacher_user != user:
            raise PermissionDenied("Teachers can only access help requests assigned to them.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=hr.session.batch.course).exists():
                raise PermissionDenied("Coordinators can only access help requests for their assigned course(s).")

        return hr

    def retrieve(self, request, *args, **kwargs):
        # User Change 4: Observer gets 403 on detail as well
        if request.user.role == UserRole.OBSERVER:
            raise PermissionDenied("Observers are not permitted to access help requests.")
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request, pk=None):
        """Transitions help request from pending -> in_progress."""
        hr = self.get_object()
        user = request.user

        if user.role == UserRole.TEACHER and hr.teacher_user != user:
            raise PermissionDenied("You can only update help requests assigned to you.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=hr.session.batch.course).exists():
                raise PermissionDenied("You can only update requests for your assigned course(s).")
        elif user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.TEACHER]:
            raise PermissionDenied("You do not have permission to update help requests.")

        try:
            hr.transition_to(HelpRequestStatus.IN_PROGRESS, by_user=user)
        except ValidationError as e:
            raise DRFValidationError({"detail": str(e)})

        return Response(self.get_serializer(hr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        """Transitions help request to resolved, records teacher note, and writes AuditLog."""
        hr = self.get_object()
        user = request.user

        if user.role == UserRole.TEACHER and hr.teacher_user != user:
            raise PermissionDenied("You can only resolve help requests assigned to you.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=hr.session.batch.course).exists():
                raise PermissionDenied("You can only resolve requests for your assigned course(s).")
        elif user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.TEACHER]:
            raise PermissionDenied("You do not have permission to resolve help requests.")

        serializer = HelpRequestResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        teacher_note = serializer.validated_data.get("teacher_note", "")

        old_status = hr.status
        try:
            hr.transition_to(HelpRequestStatus.RESOLVED, by_user=user, note=teacher_note)
        except ValidationError as e:
            raise DRFValidationError({"detail": str(e)})

        # Write AuditLog entry
        AuditLog.objects.create(
            actor_user=user,
            action="RESOLVE_HELP_REQUEST",
            entity_name="HelpRequest",
            entity_id=str(hr.id),
            old_values={"status": old_status},
            new_values={"status": HelpRequestStatus.RESOLVED, "teacher_note": teacher_note, "resolved_by": user.login_id},
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        return Response(self.get_serializer(hr).data, status=status.HTTP_200_OK)
