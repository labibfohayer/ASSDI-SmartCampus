from rest_framework import filters, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.accounts.models import UserRole
from apps.accounts.permissions import IsCoordinator, IsSuperAdmin
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
