from django.contrib.auth.password_validation import validate_password
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from .models import User, UserRole


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "login_id",
            "full_name",
            "role",
            "email",
            "phone",
            "must_change_password",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "role",
            "must_change_password",
            "is_active",
            "created_at",
            "updated_at",
        ]


class LoginSerializer(serializers.Serializer):
    login_id = serializers.CharField(
        required=True,
        trim_whitespace=True,
        help_text="Student ID, staff username or login ID.",
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )


class PasswordResetEmailRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(
        required=True,
        help_text="Registered email address of user.",
    )


class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64 = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )

    def validate_new_password(self, value):
        validate_password(value)
        return value


class AdminResetPasswordSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(
        required=True,
        help_text="UUID of student or staff whose password is being reset.",
    )
    temporary_password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )

    def validate_temporary_password(self, value):
        validate_password(value)
        return value


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={"input_type": "password"},
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )

    def validate_new_password(self, value):
        validate_password(value)
        return value


class TeacherListSerializer(serializers.ModelSerializer):
    assignments_count = serializers.SerializerMethodField()
    assignments = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "login_id",
            "full_name",
            "email",
            "phone",
            "is_active",
            "created_at",
            "assignments_count",
            "assignments",
        ]

    @extend_schema_field(serializers.IntegerField())
    def get_assignments_count(self, obj):
        return obj.teacher_assignments.count()

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_assignments(self, obj):
        return [
            {
                "id": ta.id,
                "batch_id": ta.batch_id,
                "batch_name": ta.batch.name if ta.batch else "",
                "subject_id": ta.subject_id,
                "subject_name": ta.subject.name if ta.subject else "",
                "is_primary": ta.is_primary,
            }
            for ta in obj.teacher_assignments.select_related("batch", "subject").all()
        ]


class TeacherCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, required=True)
    login_id = serializers.CharField(max_length=100, required=True)
    email = serializers.EmailField(required=False, default=None, allow_null=True)
    phone = serializers.CharField(max_length=32, required=False, default="")
    password = serializers.CharField(
        max_length=128, required=False, default="TeacherPass2026!"
    )
    initial_batch_id = serializers.IntegerField(required=False, default=None, allow_null=True)
    initial_subject_id = serializers.IntegerField(required=False, default=None, allow_null=True)
    is_primary = serializers.BooleanField(required=False, default=True)

    def validate_login_id(self, value):
        v = value.strip()
        if User.objects.filter(login_id__iexact=v).exists():
            raise serializers.ValidationError("A user with this login ID already exists.")
        return v

    def validate_email(self, value):
        if value:
            v = value.strip().lower()
            if User.objects.filter(email__iexact=v).exists():
                raise serializers.ValidationError("A user with this email already exists.")
            return v
        return None
