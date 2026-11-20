from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from apps.academic.models import ClassTopic, Subject, SubjectAudience
from apps.batches.models import Batch, TeacherAssignment
from .constants import DAY_OF_WEEK_CHOICES

SessionAudience = SubjectAudience


class SessionStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    CANCELLED = "cancelled", "Cancelled"


class ClassSchedule(models.Model):
    """
    Weekly timetable template slot for a batch and subject.
    Used by generate-sessions to create concrete ClassSession instances.
    """

    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
        related_name="schedules",
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="schedules",
    )
    teacher_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
        related_name="class_schedules",
    )
    day_of_week = models.PositiveSmallIntegerField(
        choices=DAY_OF_WEEK_CHOICES,
        db_index=True,
        help_text="0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday",
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=50, blank=True, default="")
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "class_schedules"
        verbose_name = "Class Schedule"
        verbose_name_plural = "Class Schedules"
        ordering = ["day_of_week", "start_time"]
        indexes = [
            models.Index(fields=["batch", "day_of_week"]),
            models.Index(fields=["teacher_user", "day_of_week"]),
        ]

    def __str__(self):
        day_str = dict(DAY_OF_WEEK_CHOICES).get(self.day_of_week, str(self.day_of_week))
        return f"{self.batch.name} - {self.subject.name} ({day_str} {self.start_time}-{self.end_time})"

    def clean(self):
        super().clean()
        errors = {}
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            errors["end_time"] = "End time must be after start time."

        if self.valid_from and self.valid_to and self.valid_to < self.valid_from:
            errors["valid_to"] = "valid_to cannot be earlier than valid_from."

        if self.batch_id and self.subject_id and self.teacher_user_id:
            has_assignment = TeacherAssignment.objects.filter(
                batch_id=self.batch_id,
                subject_id=self.subject_id,
                teacher_user_id=self.teacher_user_id,
            ).exists()
            if not has_assignment:
                errors["teacher_user"] = (
                    f"Teacher {self.teacher_user} does not have an active assignment for "
                    f"batch '{self.batch.name}' and subject '{self.subject.name}'."
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ClassSession(models.Model):
    """
    A concrete class instance on a specific calendar date.
    Strictly enforces audience-aware batch overlap and rigid teacher overlap.
    """

    batch = models.ForeignKey(
        Batch,
        on_delete=models.RESTRICT,
        related_name="sessions",
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.RESTRICT,
        related_name="sessions",
    )
    teacher_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
        related_name="class_sessions",
    )
    topic = models.ForeignKey(
        ClassTopic,
        on_delete=models.RESTRICT,
        null=True,
        blank=True,
        related_name="sessions",
    )
    schedule = models.ForeignKey(
        ClassSchedule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_sessions",
    )
    session_date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    description = models.TextField(blank=True, default="")
    learning_objectives = models.TextField(blank=True, default="")
    audience = models.CharField(
        max_length=20,
        choices=SessionAudience.choices,
        default=SessionAudience.ALL,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=SessionStatus.choices,
        default=SessionStatus.DRAFT,
        db_index=True,
    )
    published_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when session was first published. Null if never published.",
    )
    cancel_reason = models.TextField(
        blank=True,
        default="",
        help_text="Required explanation when session is cancelled.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_sessions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "class_sessions"
        verbose_name = "Class Session"
        verbose_name_plural = "Class Sessions"
        ordering = ["session_date", "start_time"]
        indexes = [
            models.Index(fields=["batch", "session_date"]),
            models.Index(fields=["teacher_user", "session_date"]),
            models.Index(fields=["status", "session_date"]),
        ]

    def __str__(self):
        return f"{self.batch.name} - {self.subject.name} ({self.session_date} {self.start_time}-{self.end_time})"

    def clean(self):
        super().clean()
        errors = {}

        if self.start_time and self.end_time and self.end_time <= self.start_time:
            errors["end_time"] = "End time must be after start time."

        if self.batch_id and self.subject_id and self.teacher_user_id:
            has_assignment = TeacherAssignment.objects.filter(
                batch_id=self.batch_id,
                subject_id=self.subject_id,
                teacher_user_id=self.teacher_user_id,
            ).exists()
            if not has_assignment:
                errors["teacher_user"] = (
                    f"Teacher {self.teacher_user} does not have an active assignment for "
                    f"batch '{self.batch.name}' and subject '{self.subject.name}'."
                )

        if self.topic_id and self.subject_id:
            if self.topic.subject_id != self.subject_id:
                errors["topic"] = (
                    f"Topic '{self.topic.title}' belongs to subject '{self.topic.subject.name}', "
                    f"not '{self.subject.name}'."
                )

        if errors:
            raise ValidationError(errors)

        # Overlap rules apply only to non-cancelled sessions
        if (
            self.status != SessionStatus.CANCELLED
            and self.session_date
            and self.start_time
            and self.end_time
        ):
            # 1. Strict Teacher Overlap Rule: One teacher cannot be in two overlapping sessions
            teacher_conflict_qs = ClassSession.objects.filter(
                teacher_user=self.teacher_user,
                session_date=self.session_date,
                start_time__lt=self.end_time,
                end_time__gt=self.start_time,
            ).exclude(status=SessionStatus.CANCELLED)

            if self.pk:
                teacher_conflict_qs = teacher_conflict_qs.exclude(pk=self.pk)

            if teacher_conflict_qs.exists():
                conflict = teacher_conflict_qs.first()
                raise ValidationError({
                    "teacher_user": (
                        f"Teacher {self.teacher_user.full_name} is already assigned to another session "
                        f"({conflict.batch.name} - {conflict.subject.name} from {conflict.start_time} to {conflict.end_time}) "
                        f"on {self.session_date}."
                    )
                })

            # 2. Audience-Aware Batch Overlap Rule:
            # Overlap exists only if audiences intersect:
            # 'all' intersects with everything ('all', 'general', 'madrasa').
            # 'general' and 'madrasa' do NOT intersect with each other.
            batch_overlap_qs = ClassSession.objects.filter(
                batch=self.batch,
                session_date=self.session_date,
                start_time__lt=self.end_time,
                end_time__gt=self.start_time,
            ).exclude(status=SessionStatus.CANCELLED)

            if self.pk:
                batch_overlap_qs = batch_overlap_qs.exclude(pk=self.pk)

            for existing in batch_overlap_qs:
                audiences_intersect = (
                    self.audience == SessionAudience.ALL
                    or existing.audience == SessionAudience.ALL
                    or self.audience == existing.audience
                )
                if audiences_intersect:
                    raise ValidationError({
                        "audience": (
                            f"Batch '{self.batch.name}' already has an overlapping session "
                            f"('{existing.subject.name}', audience: {existing.audience}, {existing.start_time}-{existing.end_time}) "
                            f"on {self.session_date}."
                        )
                    })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
