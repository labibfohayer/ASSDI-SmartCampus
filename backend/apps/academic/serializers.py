from rest_framework import serializers
from .models import Campus, CoordinatorCourseAssignment, Course, Department, Subject, ClassTopic


class CampusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campus
        fields = [
            "id",
            "name",
            "code",
            "gender_campus",
            "address",
            "is_active",
            "created_at",
        ]


class ObserverCampusSerializer(serializers.ModelSerializer):
    """Observer serializer masking physical address for institutional privacy."""

    class Meta:
        model = Campus
        fields = [
            "id",
            "name",
            "code",
            "gender_campus",
            "is_active",
            "created_at",
        ]


class CourseSerializer(serializers.ModelSerializer):
    departments_count = serializers.IntegerField(
        source="departments.count", read_only=True
    )
    batches_count = serializers.IntegerField(source="batches.count", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "name",
            "code",
            "description",
            "duration_months",
            "is_active",
            "departments_count",
            "batches_count",
            "created_at",
        ]


class CoordinatorCourseAssignmentSerializer(serializers.ModelSerializer):
    user_login_id = serializers.CharField(source="user.login_id", read_only=True)
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)

    class Meta:
        model = CoordinatorCourseAssignment
        fields = [
            "id",
            "user",
            "user_login_id",
            "user_full_name",
            "course",
            "course_name",
            "assigned_at",
        ]


class DepartmentSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)

    class Meta:
        model = Department
        fields = [
            "id",
            "course",
            "course_name",
            "name",
            "code",
            "is_active",
        ]


class SubjectSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)
    department_name = serializers.CharField(
        source="department.name", read_only=True, default=None
    )

    class Meta:
        model = Subject
        fields = [
            "id",
            "course",
            "course_name",
            "department",
            "department_name",
            "name",
            "code",
            "audience_type",
            "is_active",
        ]


class ClassTopicSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    created_by_teacher_name = serializers.CharField(
        source="created_by_teacher.full_name", read_only=True, default=None
    )

    class Meta:
        model = ClassTopic
        fields = [
            "id",
            "subject",
            "subject_name",
            "created_by_teacher",
            "created_by_teacher_name",
            "title",
            "description",
            "learning_objectives",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["created_by_teacher", "created_at"]
