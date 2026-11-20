from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from apps.academic.serializers import CampusSerializer, CourseSerializer
from .models import Batch, TeacherAssignment


class TeacherAssignmentSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    teacher_name = serializers.CharField(
        source="teacher_user.full_name", read_only=True
    )
    teacher_login_id = serializers.CharField(
        source="teacher_user.login_id", read_only=True
    )

    class Meta:
        model = TeacherAssignment
        fields = [
            "id",
            "batch",
            "batch_name",
            "subject",
            "subject_name",
            "teacher_user",
            "teacher_name",
            "teacher_login_id",
            "is_primary",
            "assigned_at",
        ]


class BatchSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)
    campus_name = serializers.CharField(source="campus.name", read_only=True)
    student_count = serializers.SerializerMethodField()
    teacher_assignments = TeacherAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = Batch
        fields = [
            "id",
            "course",
            "course_name",
            "campus",
            "campus_name",
            "batch_number",
            "name",
            "start_date",
            "end_date",
            "status",
            "student_count",
            "teacher_assignments",
            "created_at",
        ]

    @extend_schema_field(serializers.IntegerField)
    def get_student_count(self, obj):
        return obj.enrollments.filter(status="active").count()
