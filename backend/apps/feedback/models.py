from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.academic.models import ClassTopic
from apps.class_sessions.models import ClassSession
from apps.students.models import Student

from .constants import get_understanding_band, rating_to_percentage


class LearningFeedback(models.Model):
    """
    Daily 10-15s student learning feedback.
    Enforces UNIQUE(session, student) and partial unique client_submission_id.
    """

    session = models.ForeignKey(
        ClassSession,
        on_delete=models.RESTRICT,
        related_name="feedbacks",
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.RESTRICT,
        related_name="feedbacks",
    )
    topic = models.ForeignKey(
        ClassTopic,
        on_delete=models.RESTRICT,
        related_name="feedbacks",
    )
    understanding_rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 (poor) to 5 (full understanding).",
    )
    needs_help = models.BooleanField(
        default=False,
        help_text="If True, automatically triggers a HelpRequest to the teacher in the same transaction.",
    )
    student_comment = models.TextField(
        max_length=500,
        blank=True,
        default="",
        help_text="Optional student comment (max 500 chars).",
    )
    client_submission_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Client-generated UUID for offline retry idempotency.",
    )
    submitted_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )

    class Meta:
        db_table = "learning_feedbacks"
        verbose_name = "Learning Feedback"
        verbose_name_plural = "Learning Feedbacks"
        ordering = ["-submitted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["session", "student"],
                name="unique_feedback_session_student",
            ),
            models.UniqueConstraint(
                fields=["client_submission_id"],
                condition=models.Q(client_submission_id__isnull=False),
                name="unique_feedback_client_submission_id",
            ),
        ]
        indexes = [
            models.Index(fields=["session", "understanding_rating"]),
            models.Index(fields=["student", "submitted_at"]),
            models.Index(fields=["topic", "submitted_at"]),
        ]

    def __str__(self):
        return f"{self.student.student_id_number} - {self.session.subject.name} ({self.understanding_rating}/5)"

    @property
    def percentage(self) -> int:
        return rating_to_percentage(self.understanding_rating)

    @property
    def band(self) -> str:
        return get_understanding_band(self.understanding_rating)


class HelpRequestStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In Progress"
    RESOLVED = "resolved", "Resolved"


VALID_HELP_REQUEST_TRANSITIONS = {
    HelpRequestStatus.PENDING: [HelpRequestStatus.IN_PROGRESS],
    HelpRequestStatus.IN_PROGRESS: [HelpRequestStatus.RESOLVED],
    HelpRequestStatus.RESOLVED: [],
}


class HelpRequest(models.Model):
    """
    Teacher assistance request.
    Created atomically when student feedback has needs_help=True.
    Follows a strict forward-only lifecycle: pending -> in_progress -> resolved.
    """

    feedback = models.OneToOneField(
        LearningFeedback,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="help_request",
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="help_requests",
    )
    teacher_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
        related_name="assigned_help_requests",
    )
    session = models.ForeignKey(
        ClassSession,
        on_delete=models.CASCADE,
        related_name="help_requests",
    )
    topic = models.ForeignKey(
        ClassTopic,
        on_delete=models.RESTRICT,
        related_name="help_requests",
    )
    student_message = models.TextField(
        blank=True,
        default="",
        help_text="Optional message from student explaining what needs clarification.",
    )
    teacher_note = models.TextField(
        blank=True,
        default="",
        help_text="Teacher's follow-up or resolution note.",
    )
    status = models.CharField(
        max_length=20,
        choices=HelpRequestStatus.choices,
        default=HelpRequestStatus.PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    in_progress_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_help_requests",
    )

    class Meta:
        db_table = "help_requests"
        verbose_name = "Help Request"
        verbose_name_plural = "Help Requests"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["teacher_user", "status", "created_at"]),
            models.Index(fields=["student", "status"]),
            models.Index(fields=["session", "status"]),
        ]

    def __str__(self):
        return f"Help: {self.student.student_id_number} -> {self.teacher_user.full_name} ({self.status})"

    def can_transition_to(self, target_status: str) -> bool:
        allowed = VALID_HELP_REQUEST_TRANSITIONS.get(self.status, [])
        return target_status in allowed

    def transition_to(self, target_status: str, by_user=None, note: str = ""):
        """Transitions status forward, sets timestamps, and emits signal."""
        if not self.can_transition_to(target_status):
            raise ValidationError(
                f"Invalid status transition from '{self.status}' to '{target_status}'."
            )

        old_status = self.status
        now = timezone.now()

        if target_status == HelpRequestStatus.IN_PROGRESS:
            self.status = HelpRequestStatus.IN_PROGRESS
            if not self.in_progress_at:
                self.in_progress_at = now
            if note:
                self.teacher_note = note

        elif target_status == HelpRequestStatus.RESOLVED:
            self.status = HelpRequestStatus.RESOLVED
            self.resolved_at = now
            self.resolved_by = by_user
            if note:
                self.teacher_note = note

        self.save()

        # Emit status changed signal
        from .signals import help_request_status_changed
        help_request_status_changed.send(
            sender=self.__class__,
            help_request=self,
            old_status=old_status,
            new_status=target_status,
            by_user=by_user,
        )
