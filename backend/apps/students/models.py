from django.conf import settings
from django.db import models
from apps.academic.models import Campus
from apps.batches.models import Batch


class EducationBackground(models.TextChoices):
    GENERAL = "General", "General"
    ALIYA = "Aliya", "Aliya Madrasa"
    QAWMI = "Qawmi", "Qawmi Madrasa"


class StudentStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    DROPPED = "dropped", "Dropped / Deactivated"
    EXPELLED = "expelled", "Expelled"
    TRANSFERRED = "transferred", "Transferred"


class EnrollmentStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"
    TRANSFERRED = "transferred", "Transferred"


class Student(models.Model):
    """
    Student profile linked one-to-one to User.
    Student.student_id_number must always match User.login_id.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="student_profile",
    )
    student_id_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Must equal User.login_id (e.g. STD-2026-042-001).",
    )
    registration_no = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
    )
    education_background = models.CharField(
        max_length=20,
        choices=EducationBackground.choices,
        default=EducationBackground.GENERAL,
    )
    campus = models.ForeignKey(
        Campus,
        on_delete=models.RESTRICT,
        related_name="students",
    )
    guardian_phone = models.CharField(
        max_length=32,
        blank=True,
        help_text="Dummy guardian phone in development.",
    )
    status = models.CharField(
        max_length=20,
        choices=StudentStatus.choices,
        default=StudentStatus.ACTIVE,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "students"
        verbose_name = "Student"
        verbose_name_plural = "Students"
        ordering = ["student_id_number"]

    def __str__(self):
        return f"{self.student_id_number} - {self.user.full_name}"

    @property
    def current_enrollment(self):
        """Returns the active enrollment if exists."""
        return self.enrollments.filter(status=EnrollmentStatus.ACTIVE).first()

    @property
    def current_batch(self):
        """Returns the current active batch if enrolled."""
        active_enr = self.current_enrollment
        return active_enr.batch if active_enr else None


class Enrollment(models.Model):
    """
    Tracks enrollment history.
    Partial unique constraint enforces AT MOST ONE ACTIVE enrollment per student,
    while permitting historical records (including returning to a previous batch).
    """

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=EnrollmentStatus.choices,
        default=EnrollmentStatus.ACTIVE,
        db_index=True,
    )

    class Meta:
        db_table = "enrollments"
        verbose_name = "Enrollment"
        verbose_name_plural = "Enrollments"
        ordering = ["-enrolled_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["student"],
                condition=models.Q(status=EnrollmentStatus.ACTIVE),
                name="unique_active_enrollment_per_student",
            )
        ]

    def __str__(self):
        return f"{self.student.student_id_number} -> {self.batch.name} ({self.status})"
