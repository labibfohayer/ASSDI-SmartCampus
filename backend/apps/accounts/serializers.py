from django.contrib.auth.password_validation import validate_password
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
