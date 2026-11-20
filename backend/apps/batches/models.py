from django.conf import settings
from django.db import models
from apps.academic.models import Campus, Course, Subject


class BatchStatus(models.TextChoices):
    UPCOMING = "upcoming", "Upcoming"
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"


class Batch(models.Model):
    """An intake cohort for a course at a campus."""

    course = models.ForeignKey(
        Course,
        on_delete=models.RESTRICT,
        related_name="batches",
    )
    campus = models.ForeignKey(
        Campus,
        on_delete=models.RESTRICT,
        related_name="batches",
    )
    batch_number = models.PositiveIntegerField(db_index=True)
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=BatchStatus.choices,
        default=BatchStatus.UPCOMING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "batches"
        verbose_name = "Batch"
        verbose_name_plural = "Batches"
        ordering = ["-batch_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["course", "batch_number"],
                name="unique_course_batch_number",
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.course.code}) - {self.campus.code}"


class TeacherAssignment(models.Model):
    """Assigns teachers to subjects within a specific batch."""

    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
        related_name="teacher_assignments",
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="teacher_assignments",
    )
    teacher_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
        related_name="teacher_assignments",
    )
    is_primary = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "teacher_assignments"
        verbose_name = "Teacher Assignment"
        verbose_name_plural = "Teacher Assignments"
        constraints = [
            models.UniqueConstraint(
                fields=["batch", "subject", "teacher_user"],
                name="unique_batch_subject_teacher",
            )
        ]

    def __str__(self):
        return f"{self.teacher_user.full_name} -> {self.subject.name} ({self.batch.name})"
