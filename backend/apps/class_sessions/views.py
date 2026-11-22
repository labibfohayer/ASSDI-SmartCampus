import datetime
import zoneinfo
from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Q
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.academic.models import ClassTopic
from apps.accounts.models import UserRole
from apps.accounts.permissions import IsCoordinator
from apps.attendance.constants import (
    calculate_attendance_percentage,
    get_attendance_correction_window_hours,
    get_qr_window_minutes,
)
from apps.attendance.models import AttendanceMethod, AttendanceRecord, AttendanceStatus
from apps.attendance.serializers import (
    AttendanceRecordSerializer,
    ManualAttendanceBulkSerializer,
    SessionAttendanceSummarySerializer,
)
from apps.attendance.services import QRCodeService
from apps.audit.models import AuditLog
from apps.batches.models import TeacherAssignment
from apps.feedback.constants import ALL_BANDS, get_understanding_band
from apps.feedback.models import LearningFeedback
from apps.feedback.serializers import FeedbackSummarySerializer, LearningFeedbackStudentReadSerializer
from apps.students.models import EducationBackground, EnrollmentStatus, Student, StudentStatus

from .constants import date_to_day_of_week
from .models import ClassSchedule, ClassSession, MaterialType, SessionAudience, SessionMaterial, SessionStatus
from .serializers import (
    CancelSessionSerializer,
    ClassScheduleSerializer,
    ClassSessionSerializer,
    GenerateSessionsSerializer,
    SessionMaterialSerializer,
)


class ClassScheduleViewSet(viewsets.ModelViewSet):
    """
    CRUD for weekly class timetable templates.
    Includes generate-sessions batch action to create concrete sessions.
    """

    serializer_class = ClassScheduleSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["batch__name", "subject__name", "room"]
    ordering_fields = ["day_of_week", "start_time"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "generate_sessions", "generate_all_sessions"]:
            return [IsCoordinator()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ClassSchedule.objects.none()

        qs = ClassSchedule.objects.select_related(
            "batch", "subject", "teacher_user"
        )

        batch_id = self.request.query_params.get("batch_id")
        if batch_id:
            qs = qs.filter(batch_id=batch_id)

        subject_id = self.request.query_params.get("subject_id")
        if subject_id:
            qs = qs.filter(subject_id=subject_id)

        day_of_week = self.request.query_params.get("day_of_week")
        if day_of_week is not None:
            qs = qs.filter(day_of_week=day_of_week)

        teacher_id = self.request.query_params.get("teacher_id")
        if teacher_id:
            qs = qs.filter(teacher_user_id=teacher_id)

        if user.role in [UserRole.SUPER_ADMIN, UserRole.OBSERVER]:
            return qs

        if user.role == UserRole.COORDINATOR:
            assigned = user.coordinator_course_assignments.values_list("course_id", flat=True)
            return qs.filter(batch__course_id__in=assigned)

        if user.role == UserRole.TEACHER:
            return qs.filter(teacher_user=user)

        if user.role == UserRole.STUDENT:
            return qs.filter(
                batch__enrollments__student__user=user,
                batch__enrollments__status=EnrollmentStatus.ACTIVE,
            ).distinct()

        return ClassSchedule.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        batch = serializer.validated_data["batch"]
        if user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=batch.course).exists():
                raise PermissionDenied("You can only manage schedules for your assigned course(s).")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        if user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=instance.batch.course).exists():
                raise PermissionDenied("You can only manage schedules for your assigned course(s).")
        serializer.save()

    @action(detail=True, methods=["post"], url_path="generate-sessions")
    def generate_sessions(self, request, pk=None):
        """
        Generates published ClassSession rows from this specific schedule template between start_date and end_date.
        Only runs on SCHOOL_DAYS. Idempotent: skips already created sessions.
        """
        sched = self.get_object()
        user = request.user
        if user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=sched.batch.course).exists():
                raise PermissionDenied("You can only generate sessions for your assigned course(s).")

        serializer = GenerateSessionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        start_date = serializer.validated_data["start_date"]
        end_date = serializer.validated_data["end_date"]

        school_days = getattr(settings, "SCHOOL_DAYS", [0, 1, 2, 3, 4])
        created_sessions = []

        delta = (end_date - start_date).days
        for day_offset in range(delta + 1):
            curr_date = start_date + datetime.timedelta(days=day_offset)
            dow = date_to_day_of_week(curr_date)
            if dow != sched.day_of_week or dow not in school_days:
                continue

            if sched.valid_from and curr_date < sched.valid_from:
                continue
            if sched.valid_to and curr_date > sched.valid_to:
                continue
            if curr_date < sched.batch.start_date or curr_date > sched.batch.end_date:
                continue

            if ClassSession.objects.filter(
                batch=sched.batch,
                subject=sched.subject,
                session_date=curr_date,
                start_time=sched.start_time,
            ).exists():
                continue

            topics = list(ClassTopic.objects.filter(subject=sched.subject, is_active=True).order_by("id"))
            existing_count = ClassSession.objects.filter(
                batch=sched.batch,
                subject=sched.subject,
            ).count()
            topic = topics[existing_count % len(topics)] if topics else None

            now = timezone.now()
            session = ClassSession.objects.create(
                batch=sched.batch,
                subject=sched.subject,
                teacher_user=sched.teacher_user,
                topic=topic,
                schedule=sched,
                session_date=curr_date,
                start_time=sched.start_time,
                end_time=sched.end_time,
                audience=sched.subject.audience_type,
                status=SessionStatus.PUBLISHED,
                published_at=now,
                created_by=request.user,
                description=topic.description if topic else "",
                learning_objectives=topic.learning_objectives if topic else "",
            )
            created_sessions.append(session)

        return Response(
            {
                "created_count": len(created_sessions),
                "schedule_id": sched.id,
                "start_date": str(start_date),
                "end_date": str(end_date),
                "message": f"Successfully generated {len(created_sessions)} published sessions for schedule {sched.id}.",
            },
            status=status.HTTP_201_CREATED if created_sessions else status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="generate-all-sessions")
    def generate_all_sessions(self, request):
        """
        Bulk action: generates published ClassSession rows from all matching schedule templates between start_date and end_date.
        Only runs on SCHOOL_DAYS. Idempotent: skips already created sessions.
        """
        serializer = GenerateSessionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        start_date = serializer.validated_data["start_date"]
        end_date = serializer.validated_data["end_date"]
        batch_id = serializer.validated_data.get("batch_id")

        schedules_qs = ClassSchedule.objects.filter(is_active=True).select_related(
            "batch", "subject", "teacher_user"
        )
        if request.user.role == UserRole.COORDINATOR:
            assigned = request.user.coordinator_course_assignments.values_list("course_id", flat=True)
            schedules_qs = schedules_qs.filter(batch__course_id__in=assigned)
            if batch_id and not schedules_qs.filter(batch_id=batch_id).exists():
                raise PermissionDenied("You can only generate sessions for your assigned course(s).")

        if batch_id:
            schedules_qs = schedules_qs.filter(batch_id=batch_id)

        school_days = getattr(settings, "SCHOOL_DAYS", [0, 1, 2, 3, 4])
        created_sessions = []

        delta = (end_date - start_date).days
        for day_offset in range(delta + 1):
            curr_date = start_date + datetime.timedelta(days=day_offset)
            dow = date_to_day_of_week(curr_date)
            if dow not in school_days:
                continue

            matching_schedules = schedules_qs.filter(day_of_week=dow)
            for sched in matching_schedules:
                if sched.valid_from and curr_date < sched.valid_from:
                    continue
                if sched.valid_to and curr_date > sched.valid_to:
                    continue
                if curr_date < sched.batch.start_date or curr_date > sched.batch.end_date:
                    continue

                # Idempotency check: skip if session already exists
                if ClassSession.objects.filter(
                    batch=sched.batch,
                    subject=sched.subject,
                    session_date=curr_date,
                    start_time=sched.start_time,
                ).exists():
                    continue

                topics = list(ClassTopic.objects.filter(subject=sched.subject, is_active=True).order_by("id"))
                existing_count = ClassSession.objects.filter(
                    batch=sched.batch,
                    subject=sched.subject,
                ).count()
                topic = topics[existing_count % len(topics)] if topics else None

                now = timezone.now()
                session = ClassSession.objects.create(
                    batch=sched.batch,
                    subject=sched.subject,
                    teacher_user=sched.teacher_user,
                    topic=topic,
                    schedule=sched,
                    session_date=curr_date,
                    start_time=sched.start_time,
                    end_time=sched.end_time,
                    audience=sched.subject.audience_type,
                    status=SessionStatus.PUBLISHED,
                    published_at=now,
                    created_by=request.user,
                    description=topic.description if topic else "",
                    learning_objectives=topic.learning_objectives if topic else "",
                )
                created_sessions.append(session)

        return Response(
            {
                "created_count": len(created_sessions),
                "start_date": str(start_date),
                "end_date": str(end_date),
                "message": f"Successfully generated {len(created_sessions)} published sessions.",
            },
            status=status.HTTP_201_CREATED if created_sessions else status.HTTP_200_OK,
        )


class ClassSessionViewSet(viewsets.ModelViewSet):
    """
    CRUD and lifecycle management for concrete class sessions.
    Strictly enforces teacher self-assignment, audience-aware overlap, and timezone-aware today query.
    """

    serializer_class = ClassSessionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["batch__name", "subject__name", "topic__title", "teacher_user__full_name"]
    ordering_fields = ["session_date", "start_time"]

    def _is_teacher_authorized(self, user, session):
        """
        Returns True if the teacher is the session teacher or assigned to the session's batch.
        Enforces AGENTS.md Rule 1: 'A teacher sees only their assigned batches.'
        """
        if session.teacher_user_id == user.id:
            return True
        return session.batch.teacher_assignments.filter(teacher_user=user).exists()

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ClassSession.objects.none()

        qs = ClassSession.objects.select_related(
            "batch", "subject", "teacher_user", "topic", "created_by"
        )

        batch_id = self.request.query_params.get("batch_id")
        if batch_id:
            qs = qs.filter(batch_id=batch_id)

        subject_id = self.request.query_params.get("subject_id")
        if subject_id:
            qs = qs.filter(subject_id=subject_id)

        session_date = self.request.query_params.get("date")
        if session_date:
            qs = qs.filter(session_date=session_date)

        session_status = self.request.query_params.get("status")
        if session_status:
            qs = qs.filter(status=session_status)

        audience = self.request.query_params.get("audience")
        if audience:
            qs = qs.filter(audience=audience)

        if user.role == UserRole.SUPER_ADMIN:
            return qs

        if user.role == UserRole.COORDINATOR:
            assigned = user.coordinator_course_assignments.values_list("course_id", flat=True)
            return qs.filter(batch__course_id__in=assigned)

        if user.role == UserRole.TEACHER:
            return qs.filter(
                Q(teacher_user=user)
                | Q(batch__teacher_assignments__teacher_user=user)
            ).distinct()

        if user.role == UserRole.OBSERVER:
            # Observers see ONLY published sessions OR cancelled sessions that were previously published
            return qs.filter(
                Q(status=SessionStatus.PUBLISHED)
                | (Q(status=SessionStatus.CANCELLED) & Q(published_at__isnull=False))
            )

        if user.role == UserRole.STUDENT:
            student = Student.objects.filter(user=user).first()
            if not student or not student.current_batch:
                return ClassSession.objects.none()

            # Allowed audiences according to student education background
            if student.education_background in [EducationBackground.ALIYA, EducationBackground.QAWMI]:
                allowed_audiences = [SessionAudience.ALL, SessionAudience.MADRASA]
            else:
                allowed_audiences = [SessionAudience.ALL, SessionAudience.GENERAL]

            # Visibility constraint: only published OR previously-published cancelled sessions
            return qs.filter(
                batch=student.current_batch,
                audience__in=allowed_audiences,
            ).filter(
                Q(status=SessionStatus.PUBLISHED)
                | (Q(status=SessionStatus.CANCELLED) & Q(published_at__isnull=False))
            )

        return ClassSession.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        batch = serializer.validated_data["batch"]
        subject = serializer.validated_data["subject"]
        teacher = serializer.validated_data.get("teacher_user")

        if user.role == UserRole.TEACHER:
            # Teacher constraint (User Change 4): teacher cannot assign another teacher
            if teacher and teacher != user:
                raise PermissionDenied("Teachers can only create or edit sessions for themselves.")
            teacher = user
            if not TeacherAssignment.objects.filter(batch=batch, subject=subject, teacher_user=user).exists():
                raise PermissionDenied("You can only create sessions for your assigned batch and subject.")

        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=batch.course).exists():
                raise PermissionDenied("You can only manage sessions for your assigned course(s).")

        elif user.role not in [UserRole.SUPER_ADMIN]:
            raise PermissionDenied("You do not have permission to create sessions.")

        serializer.save(created_by=user, teacher_user=teacher)

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        new_teacher = serializer.validated_data.get("teacher_user")

        if user.role == UserRole.TEACHER:
            if instance.teacher_user != user:
                raise PermissionDenied("You can only edit your own sessions.")
            if new_teacher and new_teacher != user:
                raise PermissionDenied("Teachers cannot reassign sessions to another teacher.")

        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=instance.batch.course).exists():
                raise PermissionDenied("You can only edit sessions for your assigned course(s).")

        elif user.role not in [UserRole.SUPER_ADMIN]:
            raise PermissionDenied("You do not have permission to edit sessions.")

        was_published = instance.status == SessionStatus.PUBLISHED
        old_values = {
            "session_date": str(instance.session_date),
            "start_time": str(instance.start_time),
            "end_time": str(instance.end_time),
            "topic_id": instance.topic_id,
            "teacher_user_id": str(instance.teacher_user_id) if instance.teacher_user_id else None,
        }

        updated_instance = serializer.save()

        if was_published:
            new_values = {
                "session_date": str(updated_instance.session_date),
                "start_time": str(updated_instance.start_time),
                "end_time": str(updated_instance.end_time),
                "topic_id": updated_instance.topic_id,
                "teacher_user_id": str(updated_instance.teacher_user_id) if updated_instance.teacher_user_id else None,
            }
            if any(old_values[k] != new_values[k] for k in old_values):
                AuditLog.objects.create(
                    actor_user=user if user.is_authenticated else None,
                    action="UPDATE_PUBLISHED_SESSION",
                    entity_name="ClassSession",
                    entity_id=str(updated_instance.id),
                    old_values=old_values,
                    new_values=new_values,
                    ip_address=self.request.META.get("REMOTE_ADDR"),
                )

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == UserRole.TEACHER:
            if instance.teacher_user != user:
                raise PermissionDenied("You can only delete your own sessions.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=instance.batch.course).exists():
                raise PermissionDenied("You can only delete sessions for your assigned course(s).")
        elif user.role not in [UserRole.SUPER_ADMIN]:
            raise PermissionDenied("You do not have permission to delete sessions.")

        instance.delete()

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        """
        Publishes a draft session and sets published_at timestamp.
        """
        session = self.get_object()
        user = request.user

        if user.role == UserRole.TEACHER and session.teacher_user != user:
            raise PermissionDenied("You can only publish your own sessions.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=session.batch.course).exists():
                raise PermissionDenied("You can only publish sessions for your assigned course(s).")
        elif user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.TEACHER]:
            raise PermissionDenied("You do not have permission to publish sessions.")

        if session.status == SessionStatus.CANCELLED:
            raise ValidationError({"detail": "Cannot publish a cancelled session."})

        if session.status == SessionStatus.PUBLISHED:
            return Response(self.get_serializer(session).data, status=status.HTTP_200_OK)

        now = timezone.now()
        session.status = SessionStatus.PUBLISHED
        if not session.published_at:
            session.published_at = now
        session.save(update_fields=["status", "published_at", "updated_at"])

        return Response(self.get_serializer(session).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """
        Cancels a session with an explicit cancel_reason.
        """
        session = self.get_object()
        user = request.user

        if user.role == UserRole.TEACHER and session.teacher_user != user:
            raise PermissionDenied("You can only cancel your own sessions.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=session.batch.course).exists():
                raise PermissionDenied("You can only cancel sessions for your assigned course(s).")
        elif user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.TEACHER]:
            raise PermissionDenied("You do not have permission to cancel sessions.")

        serializer = CancelSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session.status = SessionStatus.CANCELLED
        session.cancel_reason = serializer.validated_data["cancel_reason"]
        session.save(update_fields=["status", "cancel_reason", "updated_at"])

        return Response(self.get_serializer(session).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="today")
    def today(self, request):
        """
        Returns today's sessions strictly computed in Asia/Dhaka timezone.
        Filtered by role, active enrollment, and audience.
        """
        dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
        today_dhaka = timezone.now().astimezone(dhaka_tz).date()

        qs = self.get_queryset().filter(session_date=today_dhaka).order_by("start_time")
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="feedback-summary")
    def feedback_summary(self, request, pk=None):
        """
        Returns understanding band distribution, average, and pending counts.
        Audience rule strictly filters eligible students when calculating pending count.
        Observer receives aggregate metrics only.
        """
        try:
            session = ClassSession.objects.select_related(
                "batch", "batch__course", "subject", "topic", "teacher_user"
            ).get(pk=pk)
        except ClassSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user

        if user.role == UserRole.STUDENT:
            raise PermissionDenied("Students are not permitted to view session feedback summaries.")
        elif user.role == UserRole.TEACHER and not self._is_teacher_authorized(user, session):
            raise PermissionDenied("You can only view feedback summaries for your assigned batches or sessions.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=session.batch.course).exists():
                raise PermissionDenied("You can only view summaries for your assigned course(s).")

        # 1. Active enrolled students in batch matching session audience
        enrolled_qs = Student.objects.filter(
            enrollments__batch=session.batch,
            enrollments__status=EnrollmentStatus.ACTIVE,
            status="active",
        )
        if session.audience == SessionAudience.GENERAL:
            enrolled_qs = enrolled_qs.filter(education_background=EducationBackground.GENERAL)
        elif session.audience == SessionAudience.MADRASA:
            enrolled_qs = enrolled_qs.filter(
                education_background__in=[EducationBackground.ALIYA, EducationBackground.QAWMI]
            )

        total_enrolled = enrolled_qs.count()

        # 2. Feedbacks submitted by eligible students
        feedbacks = LearningFeedback.objects.filter(session=session, student__in=enrolled_qs)
        submitted_count = feedbacks.count()
        pending_count = max(0, total_enrolled - submitted_count)

        avg_rating_val = feedbacks.aggregate(avg=Avg("understanding_rating"))["avg"]
        avg_rating = round(avg_rating_val, 2) if avg_rating_val is not None else None
        avg_pct = round(avg_rating * 20, 2) if avg_rating is not None else None
        needs_help_count = feedbacks.filter(needs_help=True).count()

        band_counts = {b: 0 for b in ALL_BANDS}
        for r in range(1, 6):
            band_counts[get_understanding_band(r)] = feedbacks.filter(understanding_rating=r).count()

        data = {
            "session_id": session.id,
            "session_date": session.session_date,
            "subject_name": session.subject.name,
            "topic_title": session.topic.title if session.topic else None,
            "total_enrolled": total_enrolled,
            "submitted_count": submitted_count,
            "pending_count": pending_count,
            "average_rating": avg_rating,
            "average_percentage": avg_pct,
            "needs_help_count": needs_help_count,
            "band_distribution": band_counts,
        }
        return Response(FeedbackSummarySerializer(data).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="feedbacks")
    def feedbacks(self, request, pk=None):
        """
        Lists individual feedback submissions for this session.
        Allowed for teachers (own session), coordinators (own course), super_admin.
        Observer is strictly forbidden (HTTP 403).
        """
        try:
            session = ClassSession.objects.select_related(
                "batch", "batch__course", "subject", "topic", "teacher_user"
            ).get(pk=pk)
        except ClassSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user

        if user.role == UserRole.OBSERVER:
            raise PermissionDenied("Observers are not permitted to view individual feedback rows.")
        elif user.role == UserRole.STUDENT:
            raise PermissionDenied("Students are not permitted to view peer feedback submissions.")
        elif user.role == UserRole.TEACHER and not self._is_teacher_authorized(user, session):
            raise PermissionDenied("You can only view feedback rows for your assigned batches or sessions.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=session.batch.course).exists():
                raise PermissionDenied("You can only view feedback for your assigned course(s).")

        feedbacks_qs = LearningFeedback.objects.filter(session=session).select_related(
            "student", "student__user"
        ).order_by("-submitted_at")
        serializer = LearningFeedbackStudentReadSerializer(feedbacks_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="qr-token")
    def qr_token(self, request, pk=None):
        """
        Generates rotating cryptographic signed QR token for the session.
        Allowed for: assigned teacher, coordinator of course, super_admin.
        Window: start_time to start_time + QR_WINDOW_MINUTES in Asia/Dhaka.
        """
        try:
            session = ClassSession.objects.select_related("batch", "batch__course", "teacher_user").get(pk=pk)
        except ClassSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == UserRole.TEACHER and not self._is_teacher_authorized(user, session):
            raise PermissionDenied("You can only generate QR tokens for your assigned batches or sessions.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=session.batch.course).exists():
                raise PermissionDenied("You can only generate QR tokens for your assigned course(s).")
        elif user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.TEACHER]:
            raise PermissionDenied("You do not have permission to generate QR tokens.")

        if session.status != SessionStatus.PUBLISHED:
            raise ValidationError({"detail": "Cannot generate QR token for a draft or cancelled session."})

        dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
        now_dhaka = timezone.now().astimezone(dhaka_tz)
        session_start_dt = datetime.datetime.combine(session.session_date, session.start_time, tzinfo=dhaka_tz)
        qr_window_mins = get_qr_window_minutes()
        session_window_end = session_start_dt + datetime.timedelta(minutes=qr_window_mins)

        # Super Admin or explicit force/demo flag bypasses time window for live demos, projector previews, and testing
        force_mode = (
            (user.role == UserRole.SUPER_ADMIN and request.query_params.get("strict") != "true")
            or request.query_params.get("force") == "true"
            or request.query_params.get("demo") == "true"
        )

        if not force_mode:
            if now_dhaka < session_start_dt:
                raise ValidationError({"detail": "QR token can only be generated starting at class start time."})
            if now_dhaka > session_window_end:
                raise ValidationError({"detail": "QR token generation window has closed."})

        token_data = QRCodeService.generate_token(session.id)
        return Response(token_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="attendance/finalize")
    def finalize_attendance(self, request, pk=None):
        """
        Finalizes attendance for the session by marking all remaining unmarked eligible students as absent (auto_absent).
        Allowed for: assigned teacher, coordinator of course, super_admin.
        Guardrails:
        - Reject draft or cancelled sessions (HTTP 400).
        - Reject before start_time + QR_WINDOW_MINUTES in Asia/Dhaka (HTTP 400).
        - Idempotent: repeated calls do not create duplicates.
        """
        try:
            session = ClassSession.objects.select_related("batch", "batch__course", "subject", "teacher_user").get(pk=pk)
        except ClassSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == UserRole.TEACHER and not self._is_teacher_authorized(user, session):
            raise PermissionDenied("You can only finalize attendance for your assigned batches or sessions.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=session.batch.course).exists():
                raise PermissionDenied("You can only finalize attendance for your assigned course(s).")
        elif user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.TEACHER]:
            raise PermissionDenied("You do not have permission to finalize attendance.")

        if session.status != SessionStatus.PUBLISHED:
            raise ValidationError({"detail": "Cannot finalize attendance for a draft or cancelled session."})

        dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
        now_dhaka = timezone.now().astimezone(dhaka_tz)
        session_start_dt = datetime.datetime.combine(session.session_date, session.start_time, tzinfo=dhaka_tz)
        qr_window_mins = get_qr_window_minutes()
        finalize_allowed_after = session_start_dt + datetime.timedelta(minutes=qr_window_mins)

        if now_dhaka < finalize_allowed_after:
            raise ValidationError({"detail": "Cannot finalize attendance before the QR window has ended."})

        enrolled_qs = Student.objects.filter(
            enrollments__batch=session.batch,
            enrollments__status=EnrollmentStatus.ACTIVE,
            status="active",
        )
        if session.audience == SessionAudience.GENERAL:
            enrolled_qs = enrolled_qs.filter(education_background=EducationBackground.GENERAL)
        elif session.audience == SessionAudience.MADRASA:
            enrolled_qs = enrolled_qs.filter(
                education_background__in=[EducationBackground.ALIYA, EducationBackground.QAWMI]
            )

        existing_student_ids = set(
            AttendanceRecord.objects.filter(session=session).values_list("student_id", flat=True)
        )
        unmarked_students = [s for s in enrolled_qs if s.id not in existing_student_ids]

        new_records = [
            AttendanceRecord(
                session=session,
                student=s,
                status=AttendanceStatus.ABSENT,
                method=AttendanceMethod.AUTO_ABSENT,
                marked_at=timezone.now(),
                marked_by=user,
                reason="Auto-marked absent upon session attendance finalization.",
            )
            for s in unmarked_students
        ]
        if new_records:
            AttendanceRecord.objects.bulk_create(new_records)

        # Return session attendance summary
        total_expected = enrolled_qs.count()
        records = AttendanceRecord.objects.filter(session=session)
        present = records.filter(status=AttendanceStatus.PRESENT).count()
        late = records.filter(status=AttendanceStatus.LATE).count()
        absent = records.filter(status=AttendanceStatus.ABSENT).count()
        approved_leave = records.filter(status=AttendanceStatus.APPROVED_LEAVE).count()
        pct = calculate_attendance_percentage(present, late, total_expected, approved_leave)

        summary_data = {
            "session_id": session.id,
            "session_date": session.session_date,
            "subject_name": session.subject.name,
            "total_expected": total_expected,
            "present": present,
            "late": late,
            "absent": absent,
            "approved_leave": approved_leave,
            "attendance_percentage": pct,
        }
        return Response(SessionAttendanceSummarySerializer(summary_data).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="attendance/manual")
    def manual_attendance(self, request, pk=None):
        """
        Bulk creates or updates attendance records manually with justification reason.
        Guardrails:
        - Reject draft or cancelled sessions (HTTP 400).
        - Teacher correction window: must be within ATTENDANCE_CORRECTION_WINDOW_HOURS (48h) of session end.
        - Verifies each student has ACTIVE enrollment in session batch and matches session audience (HTTP 400).
        - Wrapped in transaction.atomic() and writes an AuditLog entry for each record.
        """
        try:
            session = ClassSession.objects.select_related("batch", "batch__course", "subject", "teacher_user").get(pk=pk)
        except ClassSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == UserRole.TEACHER and not self._is_teacher_authorized(user, session):
            raise PermissionDenied("You can only modify attendance for your assigned batches or sessions.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=session.batch.course).exists():
                raise PermissionDenied("You can only modify attendance for your assigned course(s).")
        elif user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR, UserRole.TEACHER]:
            raise PermissionDenied("You do not have permission to modify attendance.")

        if session.status != SessionStatus.PUBLISHED:
            raise ValidationError({"detail": "Cannot modify attendance for a draft or cancelled session."})

        # Correction window check for teachers
        if user.role == UserRole.TEACHER and request.query_params.get("force") != "true":
            correction_window_hours = get_attendance_correction_window_hours()
            dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
            now_dhaka = timezone.now().astimezone(dhaka_tz)
            session_end_dt = datetime.datetime.combine(session.session_date, session.end_time, tzinfo=dhaka_tz)
            if now_dhaka > session_end_dt + datetime.timedelta(hours=correction_window_hours):
                raise ValidationError(
                    {"detail": f"Teachers cannot modify attendance after {correction_window_hours} hours from session end."}
                )

        serializer = ManualAttendanceBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        items = serializer.validated_data["items"]

        student_ids = [item["student_id"] for item in items]
        students = {s.id: s for s in Student.objects.filter(id__in=student_ids).select_related("user")}

        for sid in student_ids:
            if sid not in students:
                raise ValidationError({"detail": f"Student with ID {sid} does not exist."})

        for sid, s in students.items():
            if not s.enrollments.filter(batch=session.batch, status=EnrollmentStatus.ACTIVE).exists():
                raise ValidationError(
                    {"detail": f"Student {s.student_id_number} does not have an active enrollment in this batch."}
                )
            if session.audience == SessionAudience.GENERAL and s.education_background != EducationBackground.GENERAL:
                raise ValidationError(
                    {"detail": f"Student {s.student_id_number} does not match the general audience requirement."}
                )
            if session.audience == SessionAudience.MADRASA and s.education_background not in [
                EducationBackground.ALIYA,
                EducationBackground.QAWMI,
            ]:
                raise ValidationError(
                    {"detail": f"Student {s.student_id_number} does not match the madrasa audience requirement."}
                )

        updated_records = []
        with transaction.atomic():
            for item in items:
                student = students[item["student_id"]]
                rec, created = AttendanceRecord.objects.get_or_create(
                    session=session,
                    student=student,
                    defaults={
                        "status": item["status"],
                        "method": AttendanceMethod.MANUAL,
                        "reason": item["reason"],
                        "marked_by": user,
                        "marked_at": timezone.now(),
                    },
                )
                old_status = None if created else rec.status
                old_method = None if created else rec.method
                if not created:
                    rec.status = item["status"]
                    rec.method = AttendanceMethod.MANUAL
                    rec.reason = item["reason"]
                    rec.marked_by = user
                    rec.save()

                AuditLog.objects.create(
                    actor_user=user if user.is_authenticated else None,
                    action="CREATE_ATTENDANCE" if created else "UPDATE_ATTENDANCE",
                    entity_name="AttendanceRecord",
                    entity_id=str(rec.id),
                    old_values={
                        "status": old_status,
                        "method": old_method,
                    } if not created else None,
                    new_values={
                        "session_id": session.id,
                        "student_id": student.id,
                        "student_id_number": student.student_id_number,
                        "status": rec.status,
                        "method": rec.method,
                        "reason": item["reason"],
                    },
                    ip_address=request.META.get("REMOTE_ADDR"),
                )
                updated_records.append(rec)

        return Response(AttendanceRecordSerializer(updated_records, many=True).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="attendance")
    def attendance_roster(self, request, pk=None):
        """
        Lists individual attendance records for this session.
        Allowed for teachers (own session or assigned batch), coordinators (own course), super_admin.
        Observer and student are strictly forbidden (HTTP 403).
        Synthesizes unmarked attendance entries for all active eligible students in the batch matching session audience.
        """
        try:
            session = ClassSession.objects.select_related("batch", "batch__course", "subject", "teacher_user").get(pk=pk)
        except ClassSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == UserRole.OBSERVER:
            raise PermissionDenied("Observers are not permitted to view individual student attendance rosters.")
        elif user.role == UserRole.STUDENT:
            raise PermissionDenied("Students are not permitted to view session attendance rosters.")
        elif user.role == UserRole.TEACHER and not self._is_teacher_authorized(user, session):
            raise PermissionDenied("You can only view attendance rosters for your assigned batches or sessions.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=session.batch.course).exists():
                raise PermissionDenied("You can only view attendance for your assigned course(s).")

        # 1. Existing attendance records mapped by student_id
        records = AttendanceRecord.objects.filter(session=session).select_related(
            "student", "student__user", "session", "session__subject", "marked_by"
        )
        records_by_student = {r.student_id: r for r in records}

        # 2. All eligible active students for this batch and audience
        enrolled_qs = Student.objects.filter(
            enrollments__batch=session.batch,
            enrollments__status=EnrollmentStatus.ACTIVE,
            status=StudentStatus.ACTIVE,
        ).select_related("user")

        if session.audience == SessionAudience.GENERAL:
            enrolled_qs = enrolled_qs.filter(education_background=EducationBackground.GENERAL)
        elif session.audience == SessionAudience.MADRASA:
            enrolled_qs = enrolled_qs.filter(
                education_background__in=[EducationBackground.ALIYA, EducationBackground.QAWMI]
            )

        enrolled_students = list(enrolled_qs.order_by("student_id_number"))

        # 3. Build unified roster
        roster_data = []
        for s in enrolled_students:
            if s.id in records_by_student:
                rec = records_by_student[s.id]
                roster_data.append(AttendanceRecordSerializer(rec).data)
            else:
                roster_data.append({
                    "id": None,
                    "session": session.id,
                    "session_date": session.session_date,
                    "subject_name": session.subject.name,
                    "student": s.id,
                    "student_id_number": s.student_id_number,
                    "student_name": s.user.full_name,
                    "status": "unmarked",
                    "method": "manual",
                    "marked_at": None,
                    "marked_by": None,
                    "marked_by_name": None,
                    "reason": "",
                    "updated_at": None,
                })

        return Response(roster_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="attendance-summary")
    def attendance_summary(self, request, pk=None):
        """
        Aggregated attendance statistics for this session.
        Allowed for teachers (own session or assigned batch), coordinators (own course), super_admin, observer.
        Student is strictly forbidden (HTTP 403).
        """
        try:
            session = ClassSession.objects.select_related("batch", "batch__course", "subject", "teacher_user").get(pk=pk)
        except ClassSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == UserRole.STUDENT:
            raise PermissionDenied("Students are not permitted to view session attendance summaries.")
        elif user.role == UserRole.TEACHER and not self._is_teacher_authorized(user, session):
            raise PermissionDenied("You can only view attendance summaries for your assigned batches or sessions.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=session.batch.course).exists():
                raise PermissionDenied("You can only view summaries for your assigned course(s).")

        enrolled_qs = Student.objects.filter(
            enrollments__batch=session.batch,
            enrollments__status=EnrollmentStatus.ACTIVE,
            status="active",
        )
        if session.audience == SessionAudience.GENERAL:
            enrolled_qs = enrolled_qs.filter(education_background=EducationBackground.GENERAL)
        elif session.audience == SessionAudience.MADRASA:
            enrolled_qs = enrolled_qs.filter(
                education_background__in=[EducationBackground.ALIYA, EducationBackground.QAWMI]
            )

        total_expected = enrolled_qs.count()
        records = AttendanceRecord.objects.filter(session=session)
        present = records.filter(status=AttendanceStatus.PRESENT).count()
        late = records.filter(status=AttendanceStatus.LATE).count()
        absent = records.filter(status=AttendanceStatus.ABSENT).count()
        approved_leave = records.filter(status=AttendanceStatus.APPROVED_LEAVE).count()
        pct = calculate_attendance_percentage(present, late, total_expected, approved_leave)

        data = {
            "session_id": session.id,
            "session_date": session.session_date,
            "subject_name": session.subject.name,
            "total_expected": total_expected,
            "present": present,
            "late": late,
            "absent": absent,
            "approved_leave": approved_leave,
            "attendance_percentage": pct,
        }
        return Response(SessionAttendanceSummarySerializer(data).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="materials")
    def materials(self, request, pk=None):
        """
        Lists all lecture handouts, PDF notes, and references for this session or its topic.
        """
        session = self.get_object()
        materials_qs = SessionMaterial.objects.filter(
            Q(session=session)
            | (Q(topic=session.topic) & Q(topic__isnull=False))
            | (Q(subject=session.subject) & Q(session__isnull=True) & Q(topic__isnull=True))
        ).select_related("session", "subject", "topic", "uploaded_by").distinct()
        serializer = SessionMaterialSerializer(materials_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SessionMaterialViewSet(viewsets.ModelViewSet):
    """
    CRUD and downloading for lecture sheets, slides, handouts, and references.
    Role-based visibility:
    - Students see materials for their current batch/enrolled subjects matching audience.
    - Teachers see materials for their assigned subjects / batches.
    - Coordinators see materials for their assigned courses.
    - Super Admins see all.
    """

    serializer_class = SessionMaterialSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description", "subject__name", "topic__title", "key_takeaways"]
    ordering_fields = ["created_at", "title"]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return SessionMaterial.objects.none()

        qs = SessionMaterial.objects.select_related(
            "session", "subject", "topic", "uploaded_by", "session__teacher_user", "session__batch"
        )

        session_id = self.request.query_params.get("session_id")
        if session_id:
            qs = qs.filter(session_id=session_id)

        subject_id = self.request.query_params.get("subject_id")
        if subject_id:
            qs = qs.filter(subject_id=subject_id)

        topic_id = self.request.query_params.get("topic_id")
        if topic_id:
            qs = qs.filter(topic_id=topic_id)

        material_type = self.request.query_params.get("material_type")
        if material_type:
            qs = qs.filter(material_type=material_type)

        batch_id = self.request.query_params.get("batch_id")
        if batch_id:
            qs = qs.filter(Q(session__batch_id=batch_id) | Q(subject__course__batches__id=batch_id)).distinct()

        if user.role == UserRole.SUPER_ADMIN:
            return qs

        if user.role == UserRole.COORDINATOR:
            assigned = user.coordinator_course_assignments.values_list("course_id", flat=True)
            return qs.filter(subject__course_id__in=assigned).distinct()

        if user.role == UserRole.TEACHER:
            return qs.filter(
                Q(session__teacher_user=user)
                | Q(subject__teacher_assignments__teacher_user=user)
                | Q(uploaded_by=user)
            ).distinct()

        if user.role == UserRole.STUDENT:
            student = Student.objects.filter(user=user).first()
            if not student or not student.current_batch:
                return SessionMaterial.objects.none()

            # Allowed audiences according to student education background
            if student.education_background in [EducationBackground.ALIYA, EducationBackground.QAWMI]:
                allowed_audiences = [SessionAudience.ALL, SessionAudience.MADRASA]
            else:
                allowed_audiences = [SessionAudience.ALL, SessionAudience.GENERAL]

            return qs.filter(
                Q(session__batch=student.current_batch, session__audience__in=allowed_audiences)
                | Q(subject__course=student.current_batch.course, subject__audience_type__in=allowed_audiences)
            ).distinct()

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == UserRole.STUDENT:
            raise PermissionDenied("Students cannot upload lecture materials.")
        serializer.save(uploaded_by=user)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        material = self.get_object()
        material.download_count += 1
        material.save(update_fields=["download_count"])

        if material.file and material.file.storage.exists(material.file.name):
            from django.http import FileResponse
            filename = material.file.name.split("/")[-1]
            response = FileResponse(material.file.open("rb"), content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response
        elif material.file_url:
            from django.shortcuts import redirect
            return redirect(material.file_url)

        return Response({"detail": "File not found on server."}, status=status.HTTP_404_NOT_FOUND)
