import datetime
import zoneinfo
from django.db import transaction
from django.db.models import Avg
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.accounts.models import UserRole
from apps.accounts.permissions import IsCoordinator
from apps.attendance.constants import calculate_attendance_percentage
from apps.attendance.models import AttendanceRecord, AttendanceStatus
from apps.attendance.serializers import StudentAttendanceSummarySerializer
from apps.audit.models import AuditLog
from apps.batches.models import Batch
from apps.class_sessions.models import SessionStatus
from apps.feedback.models import HelpRequest, HelpRequestStatus, LearningFeedback
from apps.feedback.serializers import StudentProgressSerializer
from .models import Enrollment, EnrollmentStatus, Student, StudentStatus
from .serializers import (
    EnrollmentSerializer,
    ObserverStudentSerializer,
    StudentCreateSerializer,
    StudentSerializer,
    StudentTransferSerializer,
)


class StudentViewSet(viewsets.ModelViewSet):
    """
    Student lifecycle management:
    Create, update, deactivate (soft), batch transfer, and profile inspection.
    Enforces strict role scoping and observer contact masking.
    """

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["student_id_number", "registration_no", "user__full_name", "user__phone"]
    ordering_fields = ["student_id_number", "created_at"]

    def get_permissions(self):
        if self.action in ["create", "destroy", "transfer"]:
            return [IsCoordinator()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return StudentCreateSerializer
        if self.action == "transfer":
            return StudentTransferSerializer
        if (
            getattr(self.request, "user", None)
            and self.request.user.is_authenticated
            and self.request.user.role == UserRole.OBSERVER
        ):
            return ObserverStudentSerializer
        return StudentSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Student.objects.none()

        qs = Student.objects.select_related("user", "campus").prefetch_related(
            "enrollments__batch"
        )

        # Filters
        campus_id = self.request.query_params.get("campus_id")
        if campus_id:
            qs = qs.filter(campus_id=campus_id)

        batch_id = self.request.query_params.get("batch_id")
        if batch_id:
            qs = qs.filter(enrollments__batch_id=batch_id, enrollments__status=EnrollmentStatus.ACTIVE)

        student_status = self.request.query_params.get("status")
        if student_status:
            qs = qs.filter(status=student_status)

        education_bg = self.request.query_params.get("education_background")
        if education_bg:
            qs = qs.filter(education_background=education_bg)

        # Role-based QuerySet scoping
        if user.role in [UserRole.SUPER_ADMIN, UserRole.OBSERVER]:
            return qs

        if user.role == UserRole.COORDINATOR:
            assigned_courses = user.coordinator_course_assignments.values_list(
                "course_id", flat=True
            )
            return qs.filter(
                enrollments__batch__course_id__in=assigned_courses,
                enrollments__status=EnrollmentStatus.ACTIVE,
            ).distinct()

        if user.role == UserRole.TEACHER:
            assigned_batches = user.teacher_assignments.values_list(
                "batch_id", flat=True
            )
            return qs.filter(
                enrollments__batch_id__in=assigned_batches,
                enrollments__status=EnrollmentStatus.ACTIVE,
            ).distinct()

        if user.role == UserRole.STUDENT:
            return qs.filter(user=user)

        return Student.objects.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()

        # Re-fetch with standard output serializer
        out_serializer = StudentSerializer(student)
        return Response(
            {"success": True, "data": out_serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def perform_destroy(self, instance):
        """
        Soft-deactivate student:
        Sets student status to 'dropped' and user is_active = False so login is blocked.
        """
        with transaction.atomic():
            instance.status = StudentStatus.DROPPED
            instance.save(update_fields=["status"])

            instance.user.is_active = False
            instance.user.save(update_fields=["is_active"])

            AuditLog.objects.create(
                actor_user=self.request.user,
                action="STUDENT_DEACTIVATED",
                entity_name="Student",
                entity_id=str(instance.id),
                old_values={"is_active": True, "status": StudentStatus.ACTIVE},
                new_values={"is_active": False, "status": StudentStatus.DROPPED},
                ip_address=self.request.META.get("REMOTE_ADDR"),
            )

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        """Returns the authenticated student's own profile."""
        if request.user.role != UserRole.STUDENT:
            return Response(
                {"success": False, "error": {"code": "NOT_A_STUDENT", "message": "User is not a student."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            student = request.user.student_profile
        except Student.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Student profile not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = StudentSerializer(student)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="transfer")
    def transfer(self, request, pk=None):
        """
        Transfers student to another batch.
        Enforces campus consistency: student.campus == new_batch.campus.
        Maintains enrollment history and writes an audit log.
        """
        student = self.get_object()
        serializer = StudentTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_batch_id = serializer.validated_data["new_batch_id"]
        reason = serializer.validated_data.get("reason", "Batch transfer")

        try:
            new_batch = Batch.objects.get(pk=new_batch_id)
        except Batch.DoesNotExist:
            raise ValidationError({"new_batch_id": "Target batch does not exist."})

        # Campus consistency validation
        if student.campus_id != new_batch.campus_id:
            raise ValidationError(
                {
                    "new_batch_id": f"Student campus '{student.campus.name}' does not match target batch campus '{new_batch.campus.name}'."
                }
            )

        current_active = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).first()
        if current_active and current_active.batch_id == new_batch.id:
            raise ValidationError({"new_batch_id": "Student is already active in this batch."})

        with transaction.atomic():
            old_batch_info = None
            if current_active:
                old_batch_info = {
                    "batch_id": current_active.batch.id,
                    "batch_name": current_active.batch.name,
                }
                current_active.status = EnrollmentStatus.TRANSFERRED
                current_active.save(update_fields=["status"])

            # Create new active enrollment
            new_enrollment = Enrollment.objects.create(
                student=student,
                batch=new_batch,
                status=EnrollmentStatus.ACTIVE,
            )

            # Record audit log
            AuditLog.objects.create(
                actor_user=request.user,
                action="STUDENT_BATCH_TRANSFER",
                entity_name="Student",
                entity_id=str(student.id),
                old_values=old_batch_info,
                new_values={
                    "batch_id": new_batch.id,
                    "batch_name": new_batch.name,
                    "reason": reason,
                },
                ip_address=request.META.get("REMOTE_ADDR"),
            )

        updated_student = Student.objects.get(pk=student.id)
        return Response(
            {
                "success": True,
                "message": f"Student {student.student_id_number} successfully transferred to {new_batch.name}.",
                "data": StudentSerializer(updated_student).data,
            },
            status=status.HTTP_200_OK,
        )

    def _compute_student_progress(self, student):
        dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
        now_dhaka = timezone.now().astimezone(dhaka_tz)
        date_7_days_ago = (now_dhaka - datetime.timedelta(days=7)).date()
        date_30_days_ago = (now_dhaka - datetime.timedelta(days=30)).date()

        student_feedbacks = LearningFeedback.objects.filter(student=student)
        total_feedbacks = student_feedbacks.count()

        last_7_days_feedbacks = student_feedbacks.filter(session__session_date__gte=date_7_days_ago)
        avg_7 = last_7_days_feedbacks.aggregate(avg=Avg("understanding_rating"))["avg"]
        last_7_days_avg_rating = round(avg_7, 2) if avg_7 is not None else None

        last_30_days_feedbacks = student_feedbacks.filter(session__session_date__gte=date_30_days_ago)
        avg_30 = last_30_days_feedbacks.aggregate(avg=Avg("understanding_rating"))["avg"]
        last_30_days_avg_rating = round(avg_30, 2) if avg_30 is not None else None

        student_help_requests = HelpRequest.objects.filter(student=student)
        total_help_requests = student_help_requests.count()
        resolved_help_requests = student_help_requests.filter(status=HelpRequestStatus.RESOLVED).count()

        low_rating_feedbacks = student_feedbacks.filter(understanding_rating__lte=2).select_related(
            "topic", "session", "session__subject"
        ).order_by("-session__session_date")

        topics_with_low_ratings = []
        seen_topics = set()
        for fb in low_rating_feedbacks:
            if fb.topic and fb.topic.id not in seen_topics:
                seen_topics.add(fb.topic.id)
                topics_with_low_ratings.append({
                    "topic_id": fb.topic.id,
                    "topic_title": fb.topic.title,
                    "subject_name": fb.session.subject.name,
                    "rating": fb.understanding_rating,
                    "session_date": str(fb.session.session_date),
                })

        data = {
            "student_id": student.id,
            "student_id_number": student.student_id_number,
            "student_name": student.user.full_name,
            "total_feedbacks": total_feedbacks,
            "last_7_days_avg_rating": last_7_days_avg_rating,
            "last_30_days_avg_rating": last_30_days_avg_rating,
            "total_help_requests": total_help_requests,
            "resolved_help_requests": resolved_help_requests,
            "topics_with_low_ratings": topics_with_low_ratings,
        }
        return data

    @action(detail=True, methods=["get"], url_path="progress")
    def progress(self, request, pk=None):
        """
        Individual student learning progress analytics over 7-day and 30-day windows.
        Strict scoping:
        - Super admin allowed
        - Observer is strictly forbidden (HTTP 403)
        - Student may only view own progress
        - Teacher only for students with active enrollment in assigned batch
        - Coordinator only for students with active enrollment in assigned course
        """
        user = request.user
        if user.role == UserRole.OBSERVER:
            raise PermissionDenied("Observers are not permitted to view individual student progress.")

        try:
            student = Student.objects.select_related("user").get(pk=pk)
        except Student.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if user.role == UserRole.STUDENT and student.user != user:
            raise PermissionDenied("Students can only view their own progress.")

        if user.role == UserRole.TEACHER:
            student_batches = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).values_list("batch_id", flat=True)
            if not user.teacher_assignments.filter(batch_id__in=student_batches).exists():
                raise PermissionDenied("You can only view progress for students in your assigned batches.")

        if user.role == UserRole.COORDINATOR:
            student_courses = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).values_list("batch__course_id", flat=True)
            if not user.coordinator_course_assignments.filter(course_id__in=student_courses).exists():
                raise PermissionDenied("You can only view progress for students in your assigned courses.")

        progress_data = self._compute_student_progress(student)
        return Response(StudentProgressSerializer(progress_data).data, status=status.HTTP_200_OK)



    @action(detail=False, methods=["get"], url_path="me/progress")
    def me_progress(self, request):
        """Self progress view for authenticated student."""
        user = request.user
        if user.role != UserRole.STUDENT:
            raise PermissionDenied("Only students can view self progress.")
        student = getattr(user, "student_profile", None)
        if not student:
            raise PermissionDenied("No student profile found for authenticated user.")

        progress_data = self._compute_student_progress(student)
        return Response(StudentProgressSerializer(progress_data).data, status=status.HTTP_200_OK)

    def _compute_student_attendance_summary(self, student):
        """Computes aggregate attendance counts and percentage across published sessions for a student."""
        records = AttendanceRecord.objects.filter(
            student=student,
            session__status=SessionStatus.PUBLISHED,
        )
        total_sessions = records.count()
        present = records.filter(status=AttendanceStatus.PRESENT).count()
        late = records.filter(status=AttendanceStatus.LATE).count()
        absent = records.filter(status=AttendanceStatus.ABSENT).count()
        approved_leave = records.filter(status=AttendanceStatus.APPROVED_LEAVE).count()
        pct = calculate_attendance_percentage(present, late, total_sessions, approved_leave)

        return {
            "student_id": student.id,
            "student_id_number": student.student_id_number,
            "student_name": student.user.full_name,
            "total_sessions": total_sessions,
            "present": present,
            "late": late,
            "absent": absent,
            "approved_leave": approved_leave,
            "attendance_percentage": pct,
        }

    @action(detail=True, methods=["get"], url_path="attendance-summary")
    def attendance_summary(self, request, pk=None):
        """
        Individual student attendance summary across published sessions.
        Strict scoping:
        - Super admin allowed
        - Observer is strictly forbidden (HTTP 403)
        - Student may only view own attendance summary
        - Teacher only for students with active enrollment in assigned batch
        - Coordinator only for students with active enrollment in assigned course
        """
        user = request.user
        if user.role == UserRole.OBSERVER:
            raise PermissionDenied("Observers are not permitted to view individual student attendance summaries.")

        try:
            student = Student.objects.select_related("user").get(pk=pk)
        except Student.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if user.role == UserRole.STUDENT and student.user != user:
            raise PermissionDenied("Students can only view their own attendance summary.")

        if user.role == UserRole.TEACHER:
            student_batches = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).values_list("batch_id", flat=True)
            if not user.teacher_assignments.filter(batch_id__in=student_batches).exists():
                raise PermissionDenied("You can only view attendance for students in your assigned batches.")

        if user.role == UserRole.COORDINATOR:
            student_courses = student.enrollments.filter(status=EnrollmentStatus.ACTIVE).values_list("batch__course_id", flat=True)
            if not user.coordinator_course_assignments.filter(course_id__in=student_courses).exists():
                raise PermissionDenied("You can only view attendance for students in your assigned courses.")

        summary_data = self._compute_student_attendance_summary(student)
        return Response(StudentAttendanceSummarySerializer(summary_data).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="me/attendance-summary")
    def me_attendance_summary(self, request):
        """Self attendance summary view for authenticated student."""
        user = request.user
        if user.role != UserRole.STUDENT:
            raise PermissionDenied("Only students can view self attendance summary.")
        student = getattr(user, "student_profile", None)
        if not student:
            raise PermissionDenied("No student profile found for authenticated user.")

        summary_data = self._compute_student_attendance_summary(student)
        return Response(StudentAttendanceSummarySerializer(summary_data).data, status=status.HTTP_200_OK)


