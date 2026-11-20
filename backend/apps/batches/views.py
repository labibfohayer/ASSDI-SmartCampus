from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import UserRole
from apps.accounts.permissions import IsCoordinator, IsSuperAdmin
from apps.attendance.constants import (
    calculate_attendance_percentage,
    get_repeated_absence_consecutive,
    get_repeated_absence_total,
)
from apps.attendance.models import AttendanceRecord, AttendanceStatus
from apps.attendance.serializers import (
    BatchAttendanceSummarySerializer,
    RepeatedAbsenceStudentSerializer,
)
from apps.class_sessions.models import ClassSession, SessionStatus
from apps.students.models import EnrollmentStatus, Student, StudentStatus
from .models import Batch, TeacherAssignment
from .serializers import BatchSerializer, TeacherAssignmentSerializer


class BatchViewSet(viewsets.ModelViewSet):
    """
    CRUD for academic batches.
    Coordinators only manage batches in their assigned course.
    Teachers only see their assigned batches.
    Students only see their own enrolled batch.
    """

    serializer_class = BatchSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "batch_number"]
    ordering_fields = ["batch_number", "start_date", "created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsCoordinator()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Batch.objects.none()

        qs = Batch.objects.select_related("course", "campus").prefetch_related(
            "teacher_assignments__teacher_user", "teacher_assignments__subject"
        )

        course_id = self.request.query_params.get("course_id")
        if course_id:
            qs = qs.filter(course_id=course_id)

        campus_id = self.request.query_params.get("campus_id")
        if campus_id:
            qs = qs.filter(campus_id=campus_id)

        batch_status = self.request.query_params.get("status")
        if batch_status:
            qs = qs.filter(status=batch_status)

        if user.role in [UserRole.SUPER_ADMIN, UserRole.OBSERVER]:
            return qs

        if user.role == UserRole.COORDINATOR:
            assigned = user.coordinator_course_assignments.values_list("course_id", flat=True)
            return qs.filter(course_id__in=assigned)

        if user.role == UserRole.TEACHER:
            return qs.filter(teacher_assignments__teacher_user=user).distinct()

        if user.role == UserRole.STUDENT:
            return qs.filter(
                enrollments__student__user=user,
                enrollments__status="active",
            ).distinct()

        return Batch.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == UserRole.COORDINATOR:
            course = serializer.validated_data["course"]
            if not user.coordinator_course_assignments.filter(course=course).exists():
                raise PermissionDenied("You can only create batches for your assigned course(s).")
        serializer.save()

    @action(detail=True, methods=["get"], url_path="attendance-summary")
    def attendance_summary(self, request, pk=None):
        """
        Aggregate attendance metrics for this batch across published sessions.
        Allowed for: super_admin, coordinator (assigned course), teacher (assigned batch), observer.
        Forbidden for students (HTTP 403).
        """
        try:
            batch = Batch.objects.select_related("course").get(pk=pk)
        except Batch.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == UserRole.STUDENT:
            raise PermissionDenied("Students are not permitted to view batch attendance summaries.")
        if user.role == UserRole.TEACHER:
            if not batch.teacher_assignments.filter(teacher_user=user).exists():
                raise PermissionDenied("You can only view attendance summaries for your assigned batches.")
        if user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=batch.course).exists():
                raise PermissionDenied("You can only view attendance summaries for your assigned courses.")

        published_sessions = ClassSession.objects.filter(batch=batch, status=SessionStatus.PUBLISHED)
        total_published_sessions = published_sessions.count()

        records = AttendanceRecord.objects.filter(session__in=published_sessions)
        present = records.filter(status=AttendanceStatus.PRESENT).count()
        late = records.filter(status=AttendanceStatus.LATE).count()
        absent = records.filter(status=AttendanceStatus.ABSENT).count()
        approved_leave = records.filter(status=AttendanceStatus.APPROVED_LEAVE).count()
        total_expected_records = records.count()
        pct = calculate_attendance_percentage(present, late, total_expected_records, approved_leave)

        data = {
            "batch_id": batch.id,
            "batch_name": batch.name,
            "total_published_sessions": total_published_sessions,
            "total_expected_records": total_expected_records,
            "present": present,
            "late": late,
            "absent": absent,
            "approved_leave": approved_leave,
            "attendance_percentage": pct,
        }
        return Response(BatchAttendanceSummarySerializer(data).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="repeated-absences")
    def repeated_absences(self, request, pk=None):
        """
        Detects repeated absences for actively enrolled students in this batch.
        Flagged if:
        - Trailing consecutive absences >= REPEATED_ABSENCE_CONSECUTIVE (default 3) across published sessions,
          where present, late, approved_leave resets the streak.
        OR
        - Total absences >= REPEATED_ABSENCE_TOTAL (default 5) across published sessions.
        Allowed for: super_admin, coordinator (assigned course), teacher (assigned batch).
        Observer and student are strictly forbidden (HTTP 403).
        """
        try:
            batch = Batch.objects.select_related("course").get(pk=pk)
        except Batch.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == UserRole.OBSERVER:
            raise PermissionDenied("Observers are not permitted to view individual student repeated absences.")
        if user.role == UserRole.STUDENT:
            raise PermissionDenied("Students are not permitted to view batch repeated absences.")
        if user.role == UserRole.TEACHER:
            if not batch.teacher_assignments.filter(teacher_user=user).exists():
                raise PermissionDenied("You can only view repeated absences for your assigned batches.")
        if user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=batch.course).exists():
                raise PermissionDenied("You can only view repeated absences for your assigned courses.")

        consecutive_threshold = get_repeated_absence_consecutive()
        total_threshold = get_repeated_absence_total()

        enrolled_students = Student.objects.filter(
            enrollments__batch=batch,
            enrollments__status=EnrollmentStatus.ACTIVE,
            status=StudentStatus.ACTIVE,
        ).select_related("user").order_by("student_id_number")

        flagged_list = []
        for student in enrolled_students:
            records = AttendanceRecord.objects.filter(
                student=student,
                session__batch=batch,
                session__status=SessionStatus.PUBLISHED,
            ).order_by("session__session_date", "session__start_time")

            total_absences = records.filter(status=AttendanceStatus.ABSENT).count()

            consecutive_absences = 0
            for rec in reversed(list(records)):
                if rec.status == AttendanceStatus.ABSENT:
                    consecutive_absences += 1
                else:
                    break

            flagged_reasons = []
            if consecutive_absences >= consecutive_threshold:
                flagged_reasons.append(
                    f"Consecutive absences ({consecutive_absences}) reached or exceeded threshold of {consecutive_threshold}."
                )
            if total_absences >= total_threshold:
                flagged_reasons.append(
                    f"Total absences ({total_absences}) reached or exceeded threshold of {total_threshold}."
                )

            if flagged_reasons:
                flagged_list.append({
                    "student_id": student.id,
                    "student_id_number": student.student_id_number,
                    "student_name": student.user.full_name,
                    "consecutive_absences": consecutive_absences,
                    "total_absences": total_absences,
                    "flagged_reasons": flagged_reasons,
                })

        return Response(RepeatedAbsenceStudentSerializer(flagged_list, many=True).data, status=status.HTTP_200_OK)


class TeacherAssignmentViewSet(viewsets.ModelViewSet):
    """
    Assigns teachers to subjects within a specific batch.
    Managed by Super Admin & Course Coordinator.
    """

    serializer_class = TeacherAssignmentSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsCoordinator()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return TeacherAssignment.objects.none()

        qs = TeacherAssignment.objects.select_related("batch", "subject", "teacher_user")

        batch_id = self.request.query_params.get("batch_id")
        if batch_id:
            qs = qs.filter(batch_id=batch_id)

        if user.role in [UserRole.SUPER_ADMIN, UserRole.OBSERVER]:
            return qs

        if user.role == UserRole.COORDINATOR:
            assigned = user.coordinator_course_assignments.values_list("course_id", flat=True)
            return qs.filter(batch__course_id__in=assigned)

        if user.role == UserRole.TEACHER:
            return qs.filter(teacher_user=user)

        return qs
