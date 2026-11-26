import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from .managers import CustomUserManager


class UserRole(models.TextChoices):
    COORDINATOR = "coordinator", "Course Coordinator"
    TEACHER = "teacher", "Teacher"
    STUDENT = "student", "Student"
    SUPER_ADMIN = "super_admin", "Super Admin"


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User Model matching docs/ERD.md specifications.
    Uses UUID primary key and unique login_id as USERNAME_FIELD.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    login_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Student ID (STD-...), staff ID, or login username.",
    )
    full_name = models.CharField(max_length=150)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.STUDENT,
        db_index=True,
    )
    email = models.EmailField(
        blank=True,
        null=True,
        unique=True,
        help_text="Optional email for staff / student notifications & reset.",
    )
    phone = models.CharField(
        max_length=32,
        blank=True,
        null=True,
        help_text="Optional phone number (dummy in development).",
    )
    must_change_password = models.BooleanField(
        default=False,
        help_text="Set to True when temporary password is set by admin.",
    )

    # Brute-force account-level lock fields
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(blank=True, null=True)

    # Status & Audit
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(
        default=False,
        help_text="Designates whether the user can log into the Django admin site.",
    )
    soft_deleted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = "login_id"
    REQUIRED_FIELDS = ["full_name", "role"]

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.login_id} ({self.get_role_display()}) - {self.full_name}"

    def is_locked(self):
        """Check if account is temporarily locked due to failed login attempts."""
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False

    def soft_delete(self):
        """Soft delete user record instead of hard purge."""
        self.is_active = False
        self.soft_deleted_at = timezone.now()
        self.save(update_fields=["is_active", "soft_deleted_at"])
