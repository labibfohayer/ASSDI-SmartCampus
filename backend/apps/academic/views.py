from django.db.models import Avg
from django.shortcuts import get_object_or_404
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.accounts.models import UserRole
from apps.accounts.permissions import IsCoordinator, IsSuperAdmin, IsTeacher
from apps.batches.models import Batch
from apps.feedback.constants import ALL_BANDS, get_understanding_band
from apps.feedback.models import LearningFeedback
from apps.feedback.serializers import TopicUnderstandingSerializer
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

    @action(detail=True, methods=["get"], url_path="understanding")
    def understanding(self, request, pk=None):
        """
        Aggregate topic understanding metrics for a given batch.
        Enforces object-level scoping:
        - Super admin & observer allowed (aggregate view)
        - Coordinator allowed for courses assigned to them
        - Teacher allowed only if assigned to this topic's subject in the specified batch
        - Student receives HTTP 403
        """
        topic = self.get_object()
        user = request.user

        if user.role == UserRole.STUDENT:
            raise PermissionDenied("Students are not permitted to view aggregate topic understanding.")

        batch_id = request.query_params.get("batch") or request.query_params.get("batch_id")
        if not batch_id:
            raise ValidationError({"batch": "Query parameter 'batch' or 'batch_id' is required."})

        batch = get_object_or_404(Batch, pk=batch_id)

        if user.role == UserRole.COORDINATOR:
            if not user.coordinator_course_assignments.filter(course=batch.course).exists():
                raise PermissionDenied("You can only view topic understanding for your assigned courses.")

        if user.role == UserRole.TEACHER:
            if not user.teacher_assignments.filter(batch=batch, subject=topic.subject).exists():
                raise PermissionDenied("You can only view topic understanding for subjects/batches you are assigned to.")

        feedbacks = LearningFeedback.objects.filter(session__batch=batch, topic=topic)
        total_feedbacks = feedbacks.count()

        avg_val = feedbacks.aggregate(avg=Avg("understanding_rating"))["avg"]
        avg_rating = round(avg_val, 2) if avg_val is not None else None
        avg_pct = round(avg_rating * 20, 2) if avg_rating is not None else None

        band_counts = {b: 0 for b in ALL_BANDS}
        for r in range(1, 6):
            band_counts[get_understanding_band(r)] = feedbacks.filter(understanding_rating=r).count()

        data = {
            "topic_id": topic.id,
            "topic_title": topic.title,
            "subject_id": topic.subject.id,
            "subject_name": topic.subject.name,
            "batch_id": batch.id,
            "batch_name": batch.name,
            "total_feedbacks": total_feedbacks,
            "average_rating": avg_rating,
            "average_percentage": avg_pct,
            "band_distribution": band_counts,
        }
        return Response(TopicUnderstandingSerializer(data).data, status=status.HTTP_200_OK)
