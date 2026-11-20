from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.class_sessions.models import ClassSession
from apps.students.models import Student


class AttendanceStatus(models.TextChoices):
    PRESENT = "present", "Present"
    LATE = "late", "Late"
    ABSENT = "absent", "Absent"
    APPROVED_LEAVE = "approved_leave", "Approved Leave"


class AttendanceMethod(models.TextChoices):
    QR = "qr", "QR Scan"
    MANUAL = "manual", "Manual Entry"
    AUTO_ABSENT = "auto_absent", "Auto Absent"


class AttendanceRecord(models.Model):
    """
    Session attendance record for an enrolled student.
    Strict DB constraint: UNIQUE(session, student).
    """

    session = models.ForeignKey(
        ClassSession,
        on_delete=models.RESTRICT,
        related_name="attendance_records",
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.RESTRICT,
        related_name="attendance_records",
    )
    status = models.CharField(
        max_length=20,
        choices=AttendanceStatus.choices,
        db_index=True,
    )
    method = models.CharField(
        max_length=20,
        choices=AttendanceMethod.choices,
        default=AttendanceMethod.QR,
    )
    marked_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="marked_attendances",
        help_text="User who manually marked or corrected the attendance. Null if marked via QR scan.",
    )
    reason = models.TextField(
        blank=True,
        default="",
        max_length=500,
        help_text="Mandatory explanation when marked or corrected manually.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "attendance_records"
        verbose_name = "Attendance Record"
        verbose_name_plural = "Attendance Records"
        ordering = ["-marked_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["session", "student"],
                name="uq_attendance_session_student",
            ),
        ]
        indexes = [
            models.Index(fields=["session", "status"]),
            models.Index(fields=["student", "status"]),
            models.Index(fields=["marked_at"]),
        ]

    def __str__(self):
        return f"{self.student.student_id_number} - {self.session.subject.name} ({self.status})"
