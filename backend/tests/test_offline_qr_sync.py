import datetime
import zoneinfo
import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.academic.models import (
    Campus,
    CampusGender,
    ClassTopic,
    Course,
    Subject,
    SubjectAudience,
)
from apps.accounts.models import UserRole
from apps.attendance.models import AttendanceMethod, AttendanceRecord, AttendanceStatus
from apps.attendance.services import QRCodeService
from apps.batches.models import Batch, BatchStatus, TeacherAssignment
from apps.class_sessions.models import ClassSession, SessionAudience, SessionStatus
from apps.students.models import (
    EducationBackground,
    Enrollment,
    EnrollmentStatus,
    Student,
    StudentStatus,
)

User = get_user_model()
DHAKA_TZ = zoneinfo.ZoneInfo("Asia/Dhaka")


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def offline_sync_data():
    campus = Campus.objects.create(name="Kazi Bari Campus", code="KB-01", gender_campus=CampusGender.MALE)
    course = Course.objects.create(name="Small Business Management Course", code="SBMC", duration_months=3)
    today = timezone.now().astimezone(DHAKA_TZ).date()

    batch = Batch.objects.create(
        course=course,
        name="SBMC Batch 42",
        campus=campus,
        batch_number=42,
        start_date=today - datetime.timedelta(days=30),
        end_date=today + datetime.timedelta(days=60),
        status=BatchStatus.ACTIVE,
    )

    subject = Subject.objects.create(course=course, name="Accounting Fundamentals", code="ACC42", audience_type=SubjectAudience.ALL)
    topic = ClassTopic.objects.create(subject=subject, title="Ledger & Trial Balance")

    teacher = User.objects.create_user(
        login_id="teacher_acc",
        full_name="Farhan Ahmed (Dummy)",
        role=UserRole.TEACHER,
        password="password123",
    )
    TeacherAssignment.objects.create(batch=batch, subject=subject, teacher_user=teacher)

    student_user = User.objects.create_user(
        login_id="STD-2026-042-010",
        full_name="Hasan Student (Dummy)",
        role=UserRole.STUDENT,
        password="password123",
    )
    student = Student.objects.create(
        user=student_user,
        student_id_number="STD-2026-042-010",
        registration_no="REG-2026-042-010",
        campus=campus,
        education_background=EducationBackground.GENERAL,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(student=student, batch=batch, status=EnrollmentStatus.ACTIVE)

    session = ClassSession.objects.create(
        batch=batch,
        subject=subject,
        topic=topic,
        teacher_user=teacher,
        session_date=today,
        start_time=datetime.time(9, 0),
        end_time=datetime.time(10, 30),
        audience=SessionAudience.ALL,
        status=SessionStatus.PUBLISHED,
    )

    return {
        "teacher": teacher,
        "student_user": student_user,
        "student": student,
        "batch": batch,
        "session": session,
        "today": today,
        "dhaka_tz": DHAKA_TZ,
    }


@pytest.mark.django_db
class TestOfflineQRAttendanceSync:
    def test_offline_qr_sync_accepted_within_grace_period(self, api_client, offline_sync_data):
        """
        Classroom WiFi dropped. Student scanned valid rotating QR at 9:05 AM offline.
        Phone reconnects to internet at 9:30 AM (after 45s token expiry, but during same day).
        Server verifies signature and records attendance as PRESENT.
        """
        data = offline_sync_data
        session = data["session"]
        student_user = data["student_user"]

        # Token was generated at 9:05 AM by teacher's projector
        token_time = datetime.datetime.combine(session.session_date, datetime.time(9, 5), tzinfo=data["dhaka_tz"])
        with patch("django.utils.timezone.now", return_value=token_time):
            token_data = QRCodeService.generate_token(session.id)
            token = token_data["qr_token"]

        # Student syncs at 9:30 AM with is_offline_sync=True
        sync_time = datetime.datetime.combine(session.session_date, datetime.time(9, 30), tzinfo=data["dhaka_tz"])
        api_client.force_authenticate(user=student_user)

        with patch("django.utils.timezone.now", return_value=sync_time):
            response = api_client.post(
                "/api/v1/attendance/qr-scan/",
                {
                    "qr_token": token,
                    "is_offline_sync": True,
                    "offline_scanned_at": token_time.isoformat(),
                },
                format="json",
            )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == AttendanceStatus.PRESENT
        assert response.data["method"] == AttendanceMethod.QR

        # Verify DB record
        record = AttendanceRecord.objects.get(session=session, student=data["student"])
        assert record.status == AttendanceStatus.PRESENT

    def test_offline_qr_sync_late_status(self, api_client, offline_sync_data):
        """
        Student scanned offline at 9:12 AM (between 10m and 15m).
        Syncing later records status as LATE based on scan timestamp.
        """
        data = offline_sync_data
        session = data["session"]
        student_user = data["student_user"]

        # Token generated at 9:12 AM (late window)
        token_time = datetime.datetime.combine(session.session_date, datetime.time(9, 12), tzinfo=data["dhaka_tz"])
        with patch("django.utils.timezone.now", return_value=token_time):
            token_data = QRCodeService.generate_token(session.id)
            token = token_data["qr_token"]

        sync_time = datetime.datetime.combine(session.session_date, datetime.time(9, 45), tzinfo=data["dhaka_tz"])
        api_client.force_authenticate(user=student_user)

        with patch("django.utils.timezone.now", return_value=sync_time):
            response = api_client.post(
                "/api/v1/attendance/qr-scan/",
                {
                    "qr_token": token,
                    "is_offline_sync": True,
                    "offline_scanned_at": token_time.isoformat(),
                },
                format="json",
            )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == AttendanceStatus.LATE

    def test_offline_qr_sync_tampered_token_rejected(self, api_client, offline_sync_data):
        """
        Tampered or forged QR token is rejected even if is_offline_sync=True.
        """
        student_user = offline_sync_data["student_user"]
        api_client.force_authenticate(user=student_user)

        response = api_client.post(
            "/api/v1/attendance/qr-scan/",
            {
                "qr_token": "tampered:12345:signature",
                "is_offline_sync": True,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_offline_qr_sync_duplicate_scan_returns_409(self, api_client, offline_sync_data):
        """
        Syncing an already recorded attendance returns 409 Conflict without error.
        """
        data = offline_sync_data
        session = data["session"]
        student_user = data["student_user"]

        token_time = datetime.datetime.combine(session.session_date, datetime.time(9, 5), tzinfo=data["dhaka_tz"])
        with patch("django.utils.timezone.now", return_value=token_time):
            token_data = QRCodeService.generate_token(session.id)
            token = token_data["qr_token"]

        api_client.force_authenticate(user=student_user)

        # First sync
        res1 = api_client.post(
            "/api/v1/attendance/qr-scan/",
            {
                "qr_token": token,
                "is_offline_sync": True,
                "offline_scanned_at": token_time.isoformat(),
            },
            format="json",
        )
        assert res1.status_code == status.HTTP_201_CREATED

        # Duplicate sync returns 409
        res2 = api_client.post(
            "/api/v1/attendance/qr-scan/",
            {
                "qr_token": token,
                "is_offline_sync": True,
                "offline_scanned_at": token_time.isoformat(),
            },
            format="json",
        )
        assert res2.status_code == status.HTTP_409_CONFLICT
        assert res2.data["code"] == "ALREADY_MARKED"
