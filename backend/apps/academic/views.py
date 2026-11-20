from rest_framework import filters, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.accounts.models import UserRole
from apps.accounts.permissions import IsCoordinator, IsSuperAdmin, IsTeacher
from .models import (
    Campus,
    CoordinatorCourseAssignment,
    Course,
    Department,
    Subject,
    ClassTopic,
)
from .serializers import (
    CampusSerializer,
    ClassTopicSerializer,
    CoordinatorCourseAssignmentSerializer,
    CourseSerializer,
    DepartmentSerializer,
    ObserverCampusSerializer,
    SubjectSerializer,
)


class CampusViewSet(viewsets.ModelViewSet):
    """
    CRUD for physical campuses.
    Admin has full CRUD. Observers receive masked address version.
    """

    queryset = Campus.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "code", "gender_campus"]
    ordering_fields = ["name", "created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if (
            getattr(self.request, "user", None)
            and self.request.user.is_authenticated
            and self.request.user.role == UserRole.OBSERVER
        ):
            return ObserverCampusSerializer
        return CampusSerializer


class CourseViewSet(viewsets.ModelViewSet):
    """
    CRUD for academic courses.
    Super admin has full control. Coordinators see their assigned courses.
    """

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "code", "description"]
    ordering_fields = ["name", "created_at", "duration_months"]
    serializer_class = CourseSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Course.objects.none()

        if user.role in [UserRole.SUPER_ADMIN, UserRole.OBSERVER]:
            return Course.objects.all()

        if user.role == UserRole.COORDINATOR:
            return Course.objects.filter(coordinator_assignments__user=user).distinct()

        if user.role == UserRole.TEACHER:
            return Course.objects.filter(
                batches__teacher_assignments__teacher_user=user
            ).distinct()

        if user.role == UserRole.STUDENT:
            return Course.objects.filter(
                batches__enrollments__student__user=user,
                batches__enrollments__status="active",
            ).distinct()

        return Course.objects.none()


class CoordinatorCourseAssignmentViewSet(viewsets.ModelViewSet):
    """
    Manages assignment of coordinators to courses.
    Super Admin only.
    """

    queryset = CoordinatorCourseAssignment.objects.all()
    serializer_class = CoordinatorCourseAssignmentSerializer
    permission_classes = [IsSuperAdmin]


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    Departments within a course.
    Admin has full control; Coordinator can manage departments in assigned courses.
    """

    serializer_class = DepartmentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "code"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsCoordinator()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Department.objects.none()

        qs = Department.objects.select_related("course")
        course_id = self.request.query_params.get("course_id")
        if course_id:
            qs = qs.filter(course_id=course_id)

        if user.role in [UserRole.SUPER_ADMIN, UserRole.OBSERVER]:
            return qs

        if user.role == UserRole.COORDINATOR:
            assigned = user.coordinator_course_assignments.values_list("course_id", flat=True)
            return qs.filter(course_id__in=assigned)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == UserRole.COORDINATOR:
            course = serializer.validated_data["course"]
            if not user.coordinator_course_assignments.filter(course=course).exists():
                raise PermissionDenied("You can only create departments for your assigned course(s).")
        serializer.save()


class SubjectViewSet(viewsets.ModelViewSet):
    """
    Subjects curriculum catalog.
    Admin has full control; Coordinator manages subjects in assigned courses.
    """

    serializer_class = SubjectSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "code", "audience_type"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsCoordinator()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Subject.objects.none()

        qs = Subject.objects.select_related("course", "department")
        course_id = self.request.query_params.get("course_id")
        if course_id:
            qs = qs.filter(course_id=course_id)

        dept_id = self.request.query_params.get("department_id")
        if dept_id:
            qs = qs.filter(department_id=dept_id)

        if user.role in [UserRole.SUPER_ADMIN, UserRole.OBSERVER]:
            return qs

        if user.role == UserRole.COORDINATOR:
            assigned = user.coordinator_course_assignments.values_list("course_id", flat=True)
            return qs.filter(course_id__in=assigned)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == UserRole.COORDINATOR:
            course = serializer.validated_data["course"]
            if not user.coordinator_course_assignments.filter(course=course).exists():
                raise PermissionDenied("You can only create subjects for your assigned course(s).")
        serializer.save()


class ClassTopicViewSet(viewsets.ModelViewSet):
    """
    Curriculum-level topics tied to subjects.
    Admin, Coordinator (for own course), and Teachers (assigned to subject) can create topics.
    """

    serializer_class = ClassTopicSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "description", "learning_objectives"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsTeacher()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = ClassTopic.objects.select_related("subject", "created_by_teacher")
        subject_id = self.request.query_params.get("subject_id")
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        subject = serializer.validated_data["subject"]

        if user.role == UserRole.TEACHER:
            # Verify teacher is assigned to this subject in at least one batch
            if not user.teacher_assignments.filter(subject=subject).exists():
                raise PermissionDenied("Teachers can only create topics under their assigned subjects.")

        if user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=subject.course).exists():
                raise PermissionDenied("Coordinators can only create topics for subjects in their assigned course.")

        serializer.save(created_by_teacher=user if user.role == UserRole.TEACHER else None)
