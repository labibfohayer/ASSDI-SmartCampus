from django.conf import settings
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
