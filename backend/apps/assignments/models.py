from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.academic.models import ClassTopic
from apps.class_sessions.models import ClassSession
from apps.students.models import Student


class MicroQuiz(models.Model):
    """
    Micro-Quiz tied to a ClassSession.
    Contains 1-2 rapid MCQ questions for 10-15s learning depth verification.
    """

    session = models.ForeignKey(
        ClassSession,
        on_delete=models.CASCADE,
        related_name="quizzes",
    )
    topic = models.ForeignKey(
        ClassTopic,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quizzes",
    )
    title = models.CharField(max_length=200)
    instructions = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
        related_name="created_quizzes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "micro_quizzes"
        verbose_name = "Micro-Quiz"
        verbose_name_plural = "Micro-Quizzes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.session.subject.name} - {self.session.batch.name})"


class QuizQuestion(models.Model):
    """
    An individual MCQ question within a MicroQuiz.
    Options stored as JSON list: [{'id': 'A', 'text': '...'}, {'id': 'B', 'text': '...'}]
    """

    quiz = models.ForeignKey(
        MicroQuiz,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    question_text = models.TextField()
    options = models.JSONField(default=list)
    correct_option = models.CharField(max_length=10)
    explanation = models.TextField(blank=True, default="")
    points = models.PositiveSmallIntegerField(default=1)

    class Meta:
        db_table = "quiz_questions"
        verbose_name = "Quiz Question"
        verbose_name_plural = "Quiz Questions"

    def __str__(self):
        return f"Q: {self.question_text[:50]}"


class QuizAttempt(models.Model):
    """
    A student's attempt on a MicroQuiz with instant automated scoring.
    """

    quiz = models.ForeignKey(
        MicroQuiz,
        on_delete=models.CASCADE,
        related_name="attempts",
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="quiz_attempts",
    )
    answers = models.JSONField(
        default=dict,
        help_text="Dict mapping question_id (as str) to student chosen option id (e.g. 'A').",
    )
    score = models.PositiveSmallIntegerField(default=0)
    total_questions = models.PositiveSmallIntegerField(default=0)
    passed = models.BooleanField(default=True)
    submitted_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "quiz_attempts"
        verbose_name = "Quiz Attempt"
        verbose_name_plural = "Quiz Attempts"
        ordering = ["-submitted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["quiz", "student"],
                name="unique_quiz_attempt_per_student",
            ),
        ]

    def __str__(self):
        return f"{self.student.student_id_number} - {self.quiz.title} ({self.score}/{self.total_questions})"

    @property
    def percentage(self) -> float:
        if self.total_questions == 0:
            return 100.0
        return round((self.score / self.total_questions) * 100.0, 1)


class Homework(models.Model):
    """
    Homework assignment tied to a ClassSession.
    """

    session = models.ForeignKey(
        ClassSession,
        on_delete=models.CASCADE,
        related_name="homeworks",
    )
    title = models.CharField(max_length=200)
    instructions = models.TextField(blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    max_score = models.PositiveSmallIntegerField(default=10)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
        related_name="created_homeworks",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "homeworks"
        verbose_name = "Homework Assignment"
        verbose_name_plural = "Homework Assignments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.session.batch.name})"


class HomeworkSubmissionStatus(models.TextChoices):
    SUBMITTED = "submitted", "Submitted"
    REVIEWED = "reviewed", "Reviewed"
    RESUBMIT = "resubmit", "Needs Resubmission"


class HomeworkSubmission(models.Model):
    """
    Student homework submission with optional link/text and teacher grading.
    """

    homework = models.ForeignKey(
        Homework,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="homework_submissions",
    )
    submission_text = models.TextField(blank=True, default="")
    attachment_url = models.CharField(max_length=500, blank=True, default="")
    submitted_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(
        max_length=20,
        choices=HomeworkSubmissionStatus.choices,
        default=HomeworkSubmissionStatus.SUBMITTED,
    )
    score = models.PositiveSmallIntegerField(null=True, blank=True)
    teacher_feedback = models.TextField(blank=True, default="")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_homeworks",
    )

    class Meta:
        db_table = "homework_submissions"
        verbose_name = "Homework Submission"
        verbose_name_plural = "Homework Submissions"
        ordering = ["-submitted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["homework", "student"],
                name="unique_homework_submission_per_student",
            ),
        ]

    def __str__(self):
        return f"{self.student.student_id_number} - {self.homework.title} ({self.status})"


class SpeakingVideoStatus(models.TextChoices):
    SUBMITTED = "submitted", "Submitted"
    UNDER_REVIEW = "under_review", "Under Review"
    EVALUATED = "evaluated", "Evaluated"
    REVISION_REQUESTED = "revision_requested", "Revision Requested"


class SpeakingVideoSubmission(models.Model):
    """
    Speaking Video Assignment Submission & Assessment (Section 11).
    Preserves original video quality and supports multi-criteria rubric evaluation.
    """

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="speaking_videos",
    )
    batch = models.ForeignKey(
        "batches.Batch",
        on_delete=models.CASCADE,
        related_name="speaking_videos",
    )
    subject = models.ForeignKey(
        "academic.Subject",
        on_delete=models.CASCADE,
        related_name="speaking_videos",
    )
    level = models.CharField(
        max_length=20,
        default="level_1",
        choices=[("level_1", "SBMC Level 1"), ("level_2", "SBMC Level 2")],
    )
    title = models.CharField(max_length=255, help_text="Video or presentation topic title.")
    topic = models.CharField(max_length=255, blank=True, default="", help_text="Syllabus module/topic.")
    video_url = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text="Direct link or stream URL to submitted video file.",
    )
    video_file = models.FileField(
        upload_to="speaking_videos/",
        null=True,
        blank=True,
        help_text="Uploaded original speaking video file.",
    )
    file_size_mb = models.FloatField(default=0.0)
    duration_seconds = models.PositiveIntegerField(default=0)
    student_notes = models.TextField(blank=True, default="")
    submitted_at = models.DateTimeField(default=timezone.now, db_index=True)
    status = models.CharField(
        max_length=25,
        choices=SpeakingVideoStatus.choices,
        default=SpeakingVideoStatus.SUBMITTED,
        db_index=True,
    )
    evaluated_at = models.DateTimeField(null=True, blank=True)
    evaluated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evaluated_speaking_videos",
    )

    # Multi-criteria Rubric Scoring (Section 11) - 4 criteria x 25 points = 100 points
    score_body_language = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(25)],
        help_text="Body Language & Posture (out of 25)",
    )
    score_pronunciation_fluency = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(25)],
        help_text="Pronunciation & Fluency (out of 25)",
    )
    score_content_vocabulary = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(25)],
        help_text="Content Relevance & Business Vocabulary (out of 25)",
    )
    score_presentation_delivery = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(25)],
        help_text="Presentation Delivery & Confidence (out of 25)",
    )
    total_score = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    grade = models.CharField(max_length=5, blank=True, default="")
    teacher_feedback = models.TextField(blank=True, default="", help_text="Constructive remarks.")
    revision_reason = models.TextField(blank=True, default="", help_text="Reason if revision requested.")

    class Meta:
        db_table = "speaking_video_submissions"
        verbose_name = "Speaking Video Submission"
        verbose_name_plural = "Speaking Video Submissions"
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.student.student_id_number} - {self.title} ({self.status})"

    def calculate_total_and_grade(self):
        scores = [
            self.score_body_language or 0,
            self.score_pronunciation_fluency or 0,
            self.score_content_vocabulary or 0,
            self.score_presentation_delivery or 0,
        ]
        self.total_score = sum(scores)
        if self.total_score >= 80:
            self.grade = "A+"
        elif self.total_score >= 70:
            self.grade = "A"
        elif self.total_score >= 60:
            self.grade = "B"
        elif self.total_score >= 50:
            self.grade = "C"
        else:
            self.grade = "F"


