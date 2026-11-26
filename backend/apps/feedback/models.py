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
    DRAFT = "draft", "Draft"
    SUBMITTED = "submitted", "Submitted"
    AWAITING_TEACHER = "awaiting_teacher", "Awaiting Teacher Response"
    ANSWERED = "answered", "Answered"
    FOLLOW_UP_REQUIRED = "follow_up_required", "Follow-up Required"
    REOPENED = "reopened", "Reopened"


VALID_HELP_REQUEST_TRANSITIONS = {
    HelpRequestStatus.PENDING: [HelpRequestStatus.IN_PROGRESS, HelpRequestStatus.RESOLVED],
    HelpRequestStatus.IN_PROGRESS: [HelpRequestStatus.RESOLVED, HelpRequestStatus.FOLLOW_UP_REQUIRED],
    HelpRequestStatus.RESOLVED: [HelpRequestStatus.REOPENED],
    HelpRequestStatus.DRAFT: [HelpRequestStatus.SUBMITTED],
    HelpRequestStatus.SUBMITTED: [HelpRequestStatus.AWAITING_TEACHER, HelpRequestStatus.ANSWERED, HelpRequestStatus.IN_PROGRESS],
    HelpRequestStatus.AWAITING_TEACHER: [HelpRequestStatus.ANSWERED, HelpRequestStatus.RESOLVED],
    HelpRequestStatus.ANSWERED: [HelpRequestStatus.FOLLOW_UP_REQUIRED, HelpRequestStatus.RESOLVED, HelpRequestStatus.REOPENED],
    HelpRequestStatus.FOLLOW_UP_REQUIRED: [HelpRequestStatus.ANSWERED, HelpRequestStatus.RESOLVED],
    HelpRequestStatus.REOPENED: [HelpRequestStatus.AWAITING_TEACHER, HelpRequestStatus.ANSWERED, HelpRequestStatus.RESOLVED],
}


class HelpRequest(models.Model):
    """
    Teacher assistance & 10-step student learning problem request (Section 9.2, 9.3).
    Follows a multi-stage lifecycle with threaded discussions and overdue tracking.
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
        null=True,
        blank=True,
        related_name="help_requests",
    )
    subject = models.ForeignKey(
        "academic.Subject",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="help_requests",
    )
    topic = models.ForeignKey(
        ClassTopic,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="help_requests",
    )
    unclear_part = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="The specific formula, step, or concept not understood.",
    )
    student_message = models.TextField(
        blank=True,
        default="",
        help_text="Detailed question or problem description.",
    )
    reported_understanding_pct = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Student self-reported understanding percentage (0-100%).",
    )
    teacher_note = models.TextField(
        blank=True,
        default="",
        help_text="Teacher's follow-up or resolution note.",
    )
    status = models.CharField(
        max_length=30,
        choices=HelpRequestStatus.choices,
        default=HelpRequestStatus.PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    in_progress_at = models.DateTimeField(null=True, blank=True)
    last_teacher_response_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_help_requests",
    )
    student_resolution_confirmed = models.BooleanField(
        default=False,
        help_text="True if student confirmed the problem is understood and resolved.",
    )

    class Meta:
        db_table = "help_requests"
        verbose_name = "Help Request"
        verbose_name_plural = "Help Requests"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["teacher_user", "status", "created_at"]),
            models.Index(fields=["student", "status"]),
            models.Index(fields=["session", "status"]),
        ]

    def __str__(self):
        return f"Help: {self.student.student_id_number} -> {self.teacher_user.full_name} ({self.status})"

    @property
    def is_overdue(self) -> bool:
        """Flags questions awaiting response > 24 hours (Section 9.5)."""
        if self.status in [
            HelpRequestStatus.PENDING,
            HelpRequestStatus.SUBMITTED,
            HelpRequestStatus.AWAITING_TEACHER,
            HelpRequestStatus.REOPENED,
        ]:
            return (timezone.now() - self.created_at).total_seconds() > 24 * 3600
        return False

    def can_transition_to(self, target_status: str) -> bool:
        allowed = VALID_HELP_REQUEST_TRANSITIONS.get(self.status, [])
        return target_status in allowed or target_status == HelpRequestStatus.RESOLVED

    def transition_to(self, target_status: str, by_user=None, note: str = ""):
        """Transitions status forward, sets timestamps, and emits signal."""
        old_status = self.status
        now = timezone.now()

        self.status = target_status
        if target_status == HelpRequestStatus.IN_PROGRESS:
            if not self.in_progress_at:
                self.in_progress_at = now
            if note:
                self.teacher_note = note
        elif target_status == HelpRequestStatus.ANSWERED:
            self.last_teacher_response_at = now
            if note:
                self.teacher_note = note
        elif target_status == HelpRequestStatus.RESOLVED:
            self.resolved_at = now
            self.resolved_by = by_user
            if note:
                self.teacher_note = note
        elif target_status == HelpRequestStatus.REOPENED:
            self.student_resolution_confirmed = False

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


class HelpRequestMessage(models.Model):
    """
    Threaded Q&A conversation message between student and teacher (Section 9.4).
    """

    help_request = models.ForeignKey(
        HelpRequest,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_help_messages",
    )
    message_text = models.TextField(help_text="Response or follow-up text.")
    attached_resource_url = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text="URL or path to attached study resource or reference.",
    )
    attached_resource_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Title or label for attached resource.",
    )
    is_teacher_response = models.BooleanField(
        default=False,
        help_text="True if this message was sent by teacher answering the question.",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "help_request_messages"
        verbose_name = "Help Request Message"
        verbose_name_plural = "Help Request Messages"
        ordering = ["created_at"]


class SubjectUnderstandingProgress(models.Model):
    """
    Student-Reported Understanding Percentage per Subject (Section 9.1).
    Allows students to report 0-100% understanding with slider and notes.
    """

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="subject_understanding_records",
    )
    subject = models.ForeignKey(
        "academic.Subject",
        on_delete=models.CASCADE,
        related_name="student_understanding_records",
    )
    understanding_percentage = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Student-reported understanding percentage (0-100%).",
    )
    previous_percentage = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    student_notes = models.TextField(
        blank=True,
        default="",
        help_text="Optional student explanation or focus areas.",
    )
    last_updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subject_understanding_progress"
        verbose_name = "Subject Understanding Progress"
        verbose_name_plural = "Subject Understanding Progress"
        ordering = ["subject__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "subject"],
                name="unique_student_subject_understanding",
            ),
        ]

    def __str__(self):
        return f"{self.student.student_id_number} - {self.subject.name}: {self.understanding_percentage}%"


class SubjectUnderstandingHistory(models.Model):
    """
    Historical log of student-reported understanding updates over time.
    """

    progress = models.ForeignKey(
        SubjectUnderstandingProgress,
        on_delete=models.CASCADE,
        related_name="history",
    )
    percentage = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    notes = models.TextField(blank=True, default="")
    recorded_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "subject_understanding_history"
        verbose_name = "Subject Understanding History"
        verbose_name_plural = "Subject Understanding History"
        ordering = ["-recorded_at"]


