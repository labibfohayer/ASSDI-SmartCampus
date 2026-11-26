from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.academic.models import Subject
from apps.batches.models import Batch
from apps.students.models import Student


class ResultApprovalStatus(models.TextChoices):
    DRAFT = "draft", "Draft (খসড়া)"
    UNDER_REVIEW = "under_review", "Under Review (পর্যালোচনাধীন)"
    APPROVED_FOR_PUBLICATION = "approved_for_publication", "Approved for Publication (ধাপ ১ অনুমোদিত)"
    PUBLISHED = "published", "Published (ধাপ ২ চূড়ান্ত অনুমোদিত ও প্রকাশিত)"


def calculate_grade(marks: Decimal, total_marks: int = 100) -> tuple[str, bool]:
    """Calculates grade and pass status based on percentage."""
    if marks is None or total_marks <= 0:
        return "", False
    percentage = (marks / Decimal(total_marks)) * 100
    if percentage >= 80:
        return "A+", True
    elif percentage >= 70:
        return "A", True
    elif percentage >= 60:
        return "B", True
    elif percentage >= 50:
        return "C", True
    else:
        return "F", False


class Examination(models.Model):
    """
    Examination management module for SBMC (Section 12.1).
    Strictly scoped to SBMC Level 1 and Level 2.
    """

    EXAM_TYPE_CHOICES = [
        ("midterm", "Midterm Assessment (মিডটার্ম মূল্যায়ন)"),
        ("final", "Final Comprehensive Exam (চূড়ান্ত পরীক্ষা)"),
        ("practical", "Practical Lab Exam (ব্যবহারিক ল্যাব পরীক্ষা)"),
        ("viva", "Oral / Viva Voce (মৌখিক মূল্যায়ন)"),
    ]

    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
        related_name="examinations",
    )
    level = models.PositiveSmallIntegerField(
        default=1,
        choices=[(1, "Level 1 (ফাউন্ডেশন)"), (2, "Level 2 (অ্যাডভান্সড)")],
        help_text="SBMC Level (1 or 2)",
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="examinations",
    )
    name = models.CharField(max_length=200, help_text="Exam title, e.g. 'SBMC Level 1 Midterm Exam'")
    exam_type = models.CharField(max_length=30, choices=EXAM_TYPE_CHOICES, default="midterm")
    exam_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=100, default="কম্পিউটার ল্যাব ০১")
    total_marks = models.PositiveSmallIntegerField(default=100)
    pass_marks = models.PositiveSmallIntegerField(default=50)
    syllabus = models.TextField(blank=True, default="", help_text="Applicable modules and topic outline")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
        related_name="created_examinations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "examinations"
        verbose_name = "Examination"
        verbose_name_plural = "Examinations"
        ordering = ["-exam_date", "start_time"]

    def __str__(self):
        return f"{self.name} - {self.batch.name} ({self.subject.name})"


class ExamResult(models.Model):
    """
    Result management with Mandatory Two-Step Approval (Section 12.2 & 12.3).
    Results MUST remain hidden from students until Step 2 Final Publication Confirmation.
    """

    exam = models.ForeignKey(
        Examination,
        on_delete=models.CASCADE,
        related_name="results",
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="exam_results",
    )
    marks_obtained = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Marks scored by the student. Null if not yet entered.",
    )
    grade = models.CharField(max_length=5, blank=True, default="")
    is_passed = models.BooleanField(default=False)
    examiner_feedback = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=30,
        choices=ResultApprovalStatus.choices,
        default=ResultApprovalStatus.DRAFT,
        db_index=True,
    )
    step1_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="exam_result_step1_approvals",
    )
    step1_approved_at = models.DateTimeField(null=True, blank=True)
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="exam_result_publications",
    )
    published_at = models.DateTimeField(null=True, blank=True)
    version = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "exam_results"
        verbose_name = "Exam Result"
        verbose_name_plural = "Exam Results"
        constraints = [
            models.UniqueConstraint(
                fields=["exam", "student"],
                name="unique_exam_result_per_student",
            )
        ]
        indexes = [
            models.Index(fields=["exam", "status"]),
            models.Index(fields=["student", "status"]),
        ]

    def __str__(self):
        return f"{self.student.user.full_name} - {self.exam.name}: {self.marks_obtained} ({self.grade})"

    def save(self, *args, **kwargs):
        if self.marks_obtained is not None:
            self.grade, self.is_passed = calculate_grade(self.marks_obtained, self.exam.total_marks)
        super().save(*args, **kwargs)


class ExamResultVersion(models.Model):
    """
    Audit and version history for published results (Section 12.2 & 12.3).
    Any subsequent modification after publication restarts the two-step approval process.
    """

    result = models.ForeignKey(
        ExamResult,
        on_delete=models.CASCADE,
        related_name="versions",
    )
    version_number = models.PositiveSmallIntegerField()
    previous_marks = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    new_marks = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    previous_grade = models.CharField(max_length=5, blank=True, default="")
    new_grade = models.CharField(max_length=5, blank=True, default="")
    change_reason = models.TextField()
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "exam_result_versions"
        verbose_name = "Exam Result Version"
        verbose_name_plural = "Exam Result Versions"
        ordering = ["-version_number"]
