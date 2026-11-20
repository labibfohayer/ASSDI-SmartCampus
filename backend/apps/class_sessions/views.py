import datetime
import zoneinfo
from django.conf import settings
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
from apps.audit.models import AuditLog
from apps.batches.models import TeacherAssignment
from apps.feedback.constants import ALL_BANDS, get_understanding_band
from apps.feedback.models import LearningFeedback
from apps.feedback.serializers import FeedbackSummarySerializer, LearningFeedbackStudentReadSerializer
from apps.students.models import EducationBackground, EnrollmentStatus, Student

from .constants import date_to_day_of_week
from .models import ClassSchedule, ClassSession, SessionAudience, SessionStatus
from .serializers import (
    CancelSessionSerializer,
    ClassScheduleSerializer,
    ClassSessionSerializer,
    GenerateSessionsSerializer,
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
        elif user.role == UserRole.TEACHER and session.teacher_user != user:
            raise PermissionDenied("You can only view feedback summaries for your own sessions.")
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
        elif user.role == UserRole.TEACHER and session.teacher_user != user:
            raise PermissionDenied("You can only view feedback rows for your own sessions.")
        elif user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=session.batch.course).exists():
                raise PermissionDenied("You can only view feedback for your assigned course(s).")

        feedbacks_qs = LearningFeedback.objects.filter(session=session).select_related(
            "student", "student__user"
        ).order_by("-submitted_at")
        serializer = LearningFeedbackStudentReadSerializer(feedbacks_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
