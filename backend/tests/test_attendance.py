import datetime
import time
from unittest.mock import patch
import zoneinfo

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.academic.models import (
    Campus,
    CampusGender,
    ClassTopic,
    CoordinatorCourseAssignment,
    Course,
    Subject,
    SubjectAudience,
)
from apps.accounts.models import UserRole
from apps.attendance.constants import (
    calculate_attendance_percentage,
    get_attendance_correction_window_hours,
    get_late_threshold_minutes,
    get_qr_token_validity_seconds,
    get_qr_window_minutes,
    get_repeated_absence_consecutive,
    get_repeated_absence_total,
)
from apps.attendance.models import AttendanceMethod, AttendanceRecord, AttendanceStatus
from apps.attendance.services import QRCodeService
from apps.audit.models import AuditLog
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


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def attendance_setup_data(db):
    """Sets up academic structure, users, students, and sessions for attendance testing."""
    campus = Campus.objects.create(
        name="Kazi Bari Campus",
        code="KBC-ATT",
        gender_campus=CampusGender.MALE,
    )
    course = Course.objects.create(
        name="Small Business Management Course",
        code="SBMC-ATT",
    )
    course2 = Course.objects.create(
        name="Other Course",
        code="OTHER-ATT",
    )

    batch42 = Batch.objects.create(
        course=course,
        campus=campus,
        name="SBMC Batch 42",
        batch_number=42,
        start_date=datetime.date(2026, 1, 1),
        end_date=datetime.date(2026, 6, 30),
        status=BatchStatus.ACTIVE,
    )
    batch43 = Batch.objects.create(
        course=course,
        campus=campus,
        name="SBMC Batch 43",
        batch_number=43,
        start_date=datetime.date(2026, 1, 1),
        end_date=datetime.date(2026, 6, 30),
        status=BatchStatus.ACTIVE,
    )

    subj_general = Subject.objects.create(
        course=course,
        name="Microsoft Office",
        code="OFFICE-ATT",
        audience_type=SubjectAudience.ALL,
    )
    subj_madrasa = Subject.objects.create(
        course=course,
        name="Islamic Basics (Madrasa)",
        code="ISLAM-MAD-ATT",
        audience_type=SubjectAudience.MADRASA,
    )

    topic1 = ClassTopic.objects.create(
        subject=subj_general,
        title="Word Basics",
    )
    topic2 = ClassTopic.objects.create(
        subject=subj_madrasa,
        title="Fiqh Fundamentals",
    )

    # Users
    admin_user = User.objects.create_user(
        login_id="att_admin",
        password="PassWord123!",
        role=UserRole.SUPER_ADMIN,
        full_name="Admin User",
    )
    coord_user = User.objects.create_user(
        login_id="att_coord",
        password="PassWord123!",
        role=UserRole.COORDINATOR,
        full_name="Coordinator User",
    )
    CoordinatorCourseAssignment.objects.create(
        user=coord_user,
        course=course,
    )

    coord_other = User.objects.create_user(
        login_id="att_coord_other",
        password="PassWord123!",
        role=UserRole.COORDINATOR,
        full_name="Other Coordinator",
    )
    CoordinatorCourseAssignment.objects.create(
        user=coord_other,
        course=course2,
    )

    teacher_user = User.objects.create_user(
        login_id="att_teacher",
        password="PassWord123!",
        role=UserRole.TEACHER,
        full_name="Assigned Teacher",
    )
    TeacherAssignment.objects.create(
        batch=batch42,
        subject=subj_general,
        teacher_user=teacher_user,
    )
    TeacherAssignment.objects.create(
        batch=batch42,
        subject=subj_madrasa,
        teacher_user=teacher_user,
    )

    teacher_unassigned = User.objects.create_user(
        login_id="att_teacher_unassigned",
        password="PassWord123!",
        role=UserRole.TEACHER,
        full_name="Unassigned Teacher",
    )

    observer_user = User.objects.create_user(
        login_id="att_observer",
        password="PassWord123!",
        role=UserRole.OBSERVER,
        full_name="Observer User",
    )

    # Students
    # Student 1: Batch 42, General
    st1_user = User.objects.create_user(
        login_id="STD-ATT-001",
        password="PassWord123!",
        role=UserRole.STUDENT,
        full_name="Student General",
    )
    student_gen = Student.objects.create(
        user=st1_user,
        student_id_number="STD-ATT-001",
        registration_no="REG-ATT-001",
        education_background=EducationBackground.GENERAL,
        campus=campus,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(student=student_gen, batch=batch42, status=EnrollmentStatus.ACTIVE)

    # Student 2: Batch 42, Madrasa (Aliya)
    st2_user = User.objects.create_user(
        login_id="STD-ATT-002",
        password="PassWord123!",
        role=UserRole.STUDENT,
        full_name="Student Madrasa",
    )
    student_mad = Student.objects.create(
        user=st2_user,
        student_id_number="STD-ATT-002",
        registration_no="REG-ATT-002",
        education_background=EducationBackground.ALIYA,
        campus=campus,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(student=student_mad, batch=batch42, status=EnrollmentStatus.ACTIVE)

    # Student 3: Batch 43 (other batch), General
    st3_user = User.objects.create_user(
        login_id="STD-ATT-003",
        password="PassWord123!",
        role=UserRole.STUDENT,
        full_name="Student Other Batch",
    )
    student_b43 = Student.objects.create(
        user=st3_user,
        student_id_number="STD-ATT-003",
        registration_no="REG-ATT-003",
        education_background=EducationBackground.GENERAL,
        campus=campus,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(student=student_b43, batch=batch43, status=EnrollmentStatus.ACTIVE)

    # Student 4: Unenrolled student
    st4_user = User.objects.create_user(
        login_id="STD-ATT-004",
        password="PassWord123!",
        role=UserRole.STUDENT,
        full_name="Student Unenrolled",
    )
    student_unenrolled = Student.objects.create(
        user=st4_user,
        student_id_number="STD-ATT-004",
        registration_no="REG-ATT-004",
        education_background=EducationBackground.GENERAL,
        campus=campus,
        status=StudentStatus.ACTIVE,
    )

    # Sessions
    dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
    today_dhaka = timezone.now().astimezone(dhaka_tz).date()

    # Session 1: Today, Published, 09:00 - 10:30, Audience ALL
    session_today = ClassSession.objects.create(
        batch=batch42,
        subject=subj_general,
        teacher_user=teacher_user,
        topic=topic1,
        session_date=today_dhaka,
        start_time=datetime.time(9, 0),
        end_time=datetime.time(10, 30),
        audience=SessionAudience.ALL,
        status=SessionStatus.PUBLISHED,
        published_at=timezone.now(),
        created_by=coord_user,
    )

    # Session 2: Madrasa Audience, Published
    session_madrasa = ClassSession.objects.create(
        batch=batch42,
        subject=subj_madrasa,
        teacher_user=teacher_user,
        topic=topic2,
        session_date=today_dhaka,
        start_time=datetime.time(11, 0),
        end_time=datetime.time(12, 30),
        audience=SessionAudience.MADRASA,
        status=SessionStatus.PUBLISHED,
        published_at=timezone.now(),
        created_by=coord_user,
    )

    # Session 3: Draft Session
    session_draft = ClassSession.objects.create(
        batch=batch42,
        subject=subj_general,
        teacher_user=teacher_user,
        topic=topic1,
        session_date=today_dhaka,
        start_time=datetime.time(14, 0),
        end_time=datetime.time(15, 30),
        audience=SessionAudience.ALL,
        status=SessionStatus.DRAFT,
        created_by=coord_user,
    )

    # Session 4: Cancelled Session
    session_cancelled = ClassSession.objects.create(
        batch=batch42,
        subject=subj_general,
        teacher_user=teacher_user,
        topic=topic1,
        session_date=today_dhaka,
        start_time=datetime.time(16, 0),
        end_time=datetime.time(17, 30),
        audience=SessionAudience.ALL,
        status=SessionStatus.CANCELLED,
        cancel_reason="Instructor emergency",
        created_by=coord_user,
    )

    return {
        "admin_user": admin_user,
        "coord_user": coord_user,
        "coord_other": coord_other,
        "teacher_user": teacher_user,
        "teacher_unassigned": teacher_unassigned,
        "observer_user": observer_user,
        "st1_user": st1_user,
        "student_gen": student_gen,
        "st2_user": st2_user,
        "student_mad": student_mad,
        "st3_user": st3_user,
        "student_b43": student_b43,
        "st4_user": st4_user,
        "student_unenrolled": student_unenrolled,
        "batch42": batch42,
        "batch43": batch43,
        "session_today": session_today,
        "session_madrasa": session_madrasa,
        "session_draft": session_draft,
        "session_cancelled": session_cancelled,
        "today_dhaka": today_dhaka,
        "dhaka_tz": dhaka_tz,
    }


@pytest.mark.django_db
class TestAttendanceEngine:
    """Complete test suite for Sprint 5 Attendance Engine."""

    def test_dynamic_settings_lookup_supports_override(self):
        """1. Tests that dynamic settings getters reflect runtime settings changes via @override_settings."""
        assert get_qr_token_validity_seconds() == 45
        assert get_qr_window_minutes() == 15
        assert get_late_threshold_minutes() == 10
        assert get_attendance_correction_window_hours() == 48
        assert get_repeated_absence_consecutive() == 3
        assert get_repeated_absence_total() == 5

        with override_settings(
            QR_TOKEN_VALIDITY_SECONDS=20,
            QR_WINDOW_MINUTES=30,
            LATE_THRESHOLD_MINUTES=5,
            ATTENDANCE_CORRECTION_WINDOW_HOURS=24,
            REPEATED_ABSENCE_CONSECUTIVE=2,
            REPEATED_ABSENCE_TOTAL=4,
        ):
            assert get_qr_token_validity_seconds() == 20
            assert get_qr_window_minutes() == 30
            assert get_late_threshold_minutes() == 5
            assert get_attendance_correction_window_hours() == 24
            assert get_repeated_absence_consecutive() == 2
            assert get_repeated_absence_total() == 4

    def test_attendance_percentage_calculation_handles_edge_cases(self):
        """Verifies (Present + Late) / (Total - Approved Leave) * 100 formula and zero-division safety."""
        # 8 present, 2 late, 10 total, 0 leave -> 100%
        assert calculate_attendance_percentage(8, 2, 10, 0) == 100.0

        # 5 present, 1 late, 10 total, 2 leave -> (5+1)/(10-2)*100 = 6/8*100 = 75.0%
        assert calculate_attendance_percentage(5, 1, 10, 2) == 75.0

        # Total 0 or effective total 0 -> returns None, never crashes
        assert calculate_attendance_percentage(0, 0, 0, 0) is None
        assert calculate_attendance_percentage(0, 0, 3, 3) is None

    def test_qr_token_generation_within_valid_window(self, api_client, attendance_setup_data):
        """2. Teacher generates QR token during valid window (start_time to start_time + 15m)."""
        data = attendance_setup_data
        session = data["session_today"]
        teacher = data["teacher_user"]

        api_client.force_authenticate(user=teacher)
        now_mock = datetime.datetime.combine(session.session_date, datetime.time(9, 5), tzinfo=data["dhaka_tz"])

        with patch("apps.class_sessions.views.timezone.now", return_value=now_mock):
            response = api_client.post(f"/api/v1/class-sessions/{session.id}/qr-token/")

        assert response.status_code == status.HTTP_200_OK
        res_data = response.data
        assert "qr_token" in res_data
        assert res_data["session_id"] == session.id
        assert res_data["expires_in_seconds"] == 45
        assert "valid_until" in res_data

        # Token verifies cleanly
        verified_id = QRCodeService.verify_token(res_data["qr_token"])
        assert verified_id == session.id

    def test_qr_token_generation_forbidden_for_student_and_observer(self, api_client, attendance_setup_data):
        """3. Student and Observer roles are strictly forbidden from generating QR tokens (HTTP 403)."""
        data = attendance_setup_data
        session = data["session_today"]

        for user in [data["st1_user"], data["observer_user"], data["teacher_unassigned"]]:
            api_client.force_authenticate(user=user)
            response = api_client.post(f"/api/v1/class-sessions/{session.id}/qr-token/")
            assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_qr_token_generation_outside_window_rejected(self, api_client, attendance_setup_data):
        """4. QR token generation before session start or after window close is rejected (HTTP 400)."""
        data = attendance_setup_data
        session = data["session_today"]
        teacher = data["teacher_user"]
        api_client.force_authenticate(user=teacher)

        # Before start_time (08:55)
        before_start = datetime.datetime.combine(session.session_date, datetime.time(8, 55), tzinfo=data["dhaka_tz"])
        with patch("apps.class_sessions.views.timezone.now", return_value=before_start):
            res_before = api_client.post(f"/api/v1/class-sessions/{session.id}/qr-token/")
            assert res_before.status_code == status.HTTP_400_BAD_REQUEST

        # After window end (09:16)
        after_window = datetime.datetime.combine(session.session_date, datetime.time(9, 16), tzinfo=data["dhaka_tz"])
        with patch("apps.class_sessions.views.timezone.now", return_value=after_window):
            res_after = api_client.post(f"/api/v1/class-sessions/{session.id}/qr-token/")
            assert res_after.status_code == status.HTTP_400_BAD_REQUEST

    def test_teacher_cannot_bypass_qr_window_with_force_or_demo_params(self, api_client, attendance_setup_data):
        """Teacher can never bypass class time window using force=true or demo=true query params."""
        data = attendance_setup_data
        session = data["session_today"]
        teacher = data["teacher_user"]
        api_client.force_authenticate(user=teacher)

        after_window = datetime.datetime.combine(session.session_date, datetime.time(9, 30), tzinfo=data["dhaka_tz"])
        with patch("apps.class_sessions.views.timezone.now", return_value=after_window):
            # Teacher tries force=true -> rejected
            res_force = api_client.post(f"/api/v1/class-sessions/{session.id}/qr-token/?force=true")
            assert res_force.status_code == status.HTTP_400_BAD_REQUEST

            # Teacher tries demo=true -> rejected
            res_demo = api_client.post(f"/api/v1/class-sessions/{session.id}/qr-token/?demo=true")
            assert res_demo.status_code == status.HTTP_400_BAD_REQUEST

    def test_qr_token_generation_on_draft_or_cancelled_session_rejected(self, api_client, attendance_setup_data):
        """5. QR token generation on draft or cancelled session is rejected (HTTP 400)."""
        data = attendance_setup_data
        teacher = data["teacher_user"]
        api_client.force_authenticate(user=teacher)

        for s in [data["session_draft"], data["session_cancelled"]]:
            response = api_client.post(f"/api/v1/class-sessions/{s.id}/qr-token/")
            assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_qr_scan_present_status(self, api_client, attendance_setup_data):
        """6. Student scans valid QR token within 10 minutes of start time -> marked 'present'."""
        data = attendance_setup_data
        session = data["session_today"]
        student_user = data["st1_user"]

        token_data = QRCodeService.generate_token(session.id)
        token = token_data["qr_token"]

        api_client.force_authenticate(user=student_user)
        scan_time = datetime.datetime.combine(session.session_date, datetime.time(9, 7), tzinfo=data["dhaka_tz"])

        with patch("apps.attendance.views.timezone.now", return_value=scan_time):
            response = api_client.post("/api/v1/attendance/qr-scan/", {"qr_token": token})

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == AttendanceStatus.PRESENT
        assert response.data["method"] == AttendanceMethod.QR
        assert response.data["student_id_number"] == data["student_gen"].student_id_number

        # DB record verified
        record = AttendanceRecord.objects.get(session=session, student=data["student_gen"])
        assert record.status == AttendanceStatus.PRESENT
        assert record.method == AttendanceMethod.QR

    def test_qr_scan_late_status(self, api_client, attendance_setup_data):
        """7. Student scans valid QR token between 10m and 15m after start time -> marked 'late'."""
        data = attendance_setup_data
        session = data["session_today"]
        student_user = data["st2_user"]

        token_data = QRCodeService.generate_token(session.id)
        token = token_data["qr_token"]

        api_client.force_authenticate(user=student_user)
        # 12 minutes in: between 10m and 15m
        scan_time = datetime.datetime.combine(session.session_date, datetime.time(9, 12), tzinfo=data["dhaka_tz"])

        with patch("apps.attendance.views.timezone.now", return_value=scan_time):
            response = api_client.post("/api/v1/attendance/qr-scan/", {"qr_token": token})

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == AttendanceStatus.LATE
        assert response.data["method"] == AttendanceMethod.QR

    def test_qr_scan_expired_token_rejected_deterministically(self, api_client, attendance_setup_data):
        """8. Deterministic test for expired QR token rejection without time.sleep() (HTTP 400)."""
        data = attendance_setup_data
        session = data["session_today"]
        student_user = data["st1_user"]

        token_data = QRCodeService.generate_token(session.id)
        token = token_data["qr_token"]

        api_client.force_authenticate(user=student_user)
        # Advance time.time by 60 seconds so TimestampSigner recognizes token as expired
        with patch("django.core.signing.time.time", return_value=time.time() + 60):
            response = api_client.post("/api/v1/attendance/qr-scan/", {"qr_token": token})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "expired" in str(response.data).lower()

    def test_qr_scan_tampered_token_rejected(self, api_client, attendance_setup_data):
        """9. Student scans tampered token string -> rejected with HTTP 400."""
        data = attendance_setup_data
        student_user = data["st1_user"]

        api_client.force_authenticate(user=student_user)
        response = api_client.post("/api/v1/attendance/qr-scan/", {"qr_token": "tampered:token:signature"})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_qr_scan_outside_qr_window_rejected(self, api_client, attendance_setup_data):
        """10. Student scans token after 15m QR window has closed -> rejected with HTTP 400."""
        data = attendance_setup_data
        session = data["session_today"]
        student_user = data["st1_user"]

        token_data = QRCodeService.generate_token(session.id)
        token = token_data["qr_token"]

        api_client.force_authenticate(user=student_user)
        after_window = datetime.datetime.combine(session.session_date, datetime.time(9, 20), tzinfo=data["dhaka_tz"])

        with patch("apps.attendance.views.timezone.now", return_value=after_window):
            response = api_client.post("/api/v1/attendance/qr-scan/", {"qr_token": token})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "closed" in str(response.data).lower()

    def test_qr_scan_duplicate_returns_409(self, api_client, attendance_setup_data):
        """11. Scanning attendance a second time returns HTTP 409 Conflict with ALREADY_MARKED code."""
        data = attendance_setup_data
        session = data["session_today"]
        student_user = data["st1_user"]

        token_data = QRCodeService.generate_token(session.id)
        token = token_data["qr_token"]

        api_client.force_authenticate(user=student_user)
        scan_time = datetime.datetime.combine(session.session_date, datetime.time(9, 5), tzinfo=data["dhaka_tz"])

        with patch("apps.attendance.views.timezone.now", return_value=scan_time):
            # First scan
            res1 = api_client.post("/api/v1/attendance/qr-scan/", {"qr_token": token})
            assert res1.status_code == status.HTTP_201_CREATED

            # Second scan
            res2 = api_client.post("/api/v1/attendance/qr-scan/", {"qr_token": token})
            assert res2.status_code == status.HTTP_409_CONFLICT
            assert res2.data["code"] == "ALREADY_MARKED"

    def test_qr_scan_unenrolled_or_wrong_audience_forbidden(self, api_client, attendance_setup_data):
        """12. Unenrolled student, student in another batch, or wrong audience gets HTTP 403."""
        data = attendance_setup_data
        session_all = data["session_today"]
        session_mad = data["session_madrasa"]

        scan_time = datetime.datetime.combine(session_all.session_date, datetime.time(9, 5), tzinfo=data["dhaka_tz"])

        with patch("apps.attendance.views.timezone.now", return_value=scan_time):
            # Unenrolled student on session_all
            api_client.force_authenticate(user=data["st4_user"])
            t_all = QRCodeService.generate_token(session_all.id)["qr_token"]
            res_unenrolled = api_client.post("/api/v1/attendance/qr-scan/", {"qr_token": t_all})
            assert res_unenrolled.status_code == status.HTTP_403_FORBIDDEN

            # Batch 43 student on Batch 42 session
            api_client.force_authenticate(user=data["st3_user"])
            res_b43 = api_client.post("/api/v1/attendance/qr-scan/", {"qr_token": t_all})
            assert res_b43.status_code == status.HTTP_403_FORBIDDEN

            # General student on Madrasa-only session
            api_client.force_authenticate(user=data["st1_user"])
            t_mad = QRCodeService.generate_token(session_mad.id)["qr_token"]
            res_wrong_aud = api_client.post("/api/v1/attendance/qr-scan/", {"qr_token": t_mad})
            assert res_wrong_aud.status_code == status.HTTP_403_FORBIDDEN

    def test_finalize_attendance_guardrails(self, api_client, attendance_setup_data):
        """13. Finalize attendance rejected before window end, and rejected on draft/cancelled sessions."""
        data = attendance_setup_data
        session = data["session_today"]
        teacher = data["teacher_user"]
        api_client.force_authenticate(user=teacher)

        # Before QR window ends (09:10, window is 15m) -> 400
        before_end = datetime.datetime.combine(session.session_date, datetime.time(9, 10), tzinfo=data["dhaka_tz"])
        with patch("apps.class_sessions.views.timezone.now", return_value=before_end):
            res_early = api_client.post(f"/api/v1/class-sessions/{session.id}/attendance/finalize/")
            assert res_early.status_code == status.HTTP_400_BAD_REQUEST

        # Draft session -> 400
        res_draft = api_client.post(f"/api/v1/class-sessions/{data['session_draft'].id}/attendance/finalize/")
        assert res_draft.status_code == status.HTTP_400_BAD_REQUEST

        # Cancelled session -> 400
        res_cancelled = api_client.post(f"/api/v1/class-sessions/{data['session_cancelled'].id}/attendance/finalize/")
        assert res_cancelled.status_code == status.HTTP_400_BAD_REQUEST

    def test_finalize_attendance_marks_unscanned_students_auto_absent_idempotently(
        self, api_client, attendance_setup_data
    ):
        """14. Finalize attendance marks remaining unscanned students absent (auto_absent) idempotently."""
        data = attendance_setup_data
        session = data["session_today"]
        teacher = data["teacher_user"]

        # Mark student_gen as PRESENT first
        AttendanceRecord.objects.create(
            session=session,
            student=data["student_gen"],
            status=AttendanceStatus.PRESENT,
            method=AttendanceMethod.QR,
        )

        api_client.force_authenticate(user=teacher)
        # Calling finalize after 15m (e.g. 09:20)
        after_window = datetime.datetime.combine(session.session_date, datetime.time(9, 20), tzinfo=data["dhaka_tz"])

        with patch("apps.class_sessions.views.timezone.now", return_value=after_window):
            res1 = api_client.post(f"/api/v1/class-sessions/{session.id}/attendance/finalize/")
            assert res1.status_code == status.HTTP_200_OK

            # student_mad was unmarked, so must now be marked ABSENT with method AUTO_ABSENT
            rec_mad = AttendanceRecord.objects.get(session=session, student=data["student_mad"])
            assert rec_mad.status == AttendanceStatus.ABSENT
            assert rec_mad.method == AttendanceMethod.AUTO_ABSENT

            # student_gen remains PRESENT
            rec_gen = AttendanceRecord.objects.get(session=session, student=data["student_gen"])
            assert rec_gen.status == AttendanceStatus.PRESENT

            # Verify idempotency on second call
            res2 = api_client.post(f"/api/v1/class-sessions/{session.id}/attendance/finalize/")
            assert res2.status_code == status.HTTP_200_OK
            assert AttendanceRecord.objects.filter(session=session).count() == 2

    def test_manual_attendance_bulk_update_atomic_with_audit_log(self, api_client, attendance_setup_data):
        """15. Manual attendance creates/updates records atomically, validates students, and writes AuditLog."""
        data = attendance_setup_data
        session = data["session_today"]
        teacher = data["teacher_user"]
        api_client.force_authenticate(user=teacher)

        # 1. Invalid student validation (wrong batch or non-existent)
        payload_invalid = {
            "items": [
                {
                    "student_id": data["student_b43"].id,  # Batch 43 student
                    "status": AttendanceStatus.APPROVED_LEAVE,
                    "reason": "Medical leave requested.",
                }
            ]
        }
        res_invalid = api_client.post(
            f"/api/v1/class-sessions/{session.id}/attendance/manual/",
            payload_invalid,
            format="json",
        )
        assert res_invalid.status_code == status.HTTP_400_BAD_REQUEST

        # 2. Valid bulk update: student_gen=present, student_mad=approved_leave
        payload_valid = {
            "items": [
                {
                    "student_id": data["student_gen"].id,
                    "status": AttendanceStatus.PRESENT,
                    "reason": "Present in classroom verified manually by instructor.",
                },
                {
                    "student_id": data["student_mad"].id,
                    "status": AttendanceStatus.APPROVED_LEAVE,
                    "reason": "Submitted valid medical slip approved by coordinator.",
                },
            ]
        }
        res_valid = api_client.post(
            f"/api/v1/class-sessions/{session.id}/attendance/manual/",
            payload_valid,
            format="json",
        )
        assert res_valid.status_code == status.HTTP_200_OK
        assert len(res_valid.data) == 2

        # Check DB records
        rec1 = AttendanceRecord.objects.get(session=session, student=data["student_gen"])
        assert rec1.status == AttendanceStatus.PRESENT
        assert rec1.method == AttendanceMethod.MANUAL
        assert rec1.marked_by == teacher

        rec2 = AttendanceRecord.objects.get(session=session, student=data["student_mad"])
        assert rec2.status == AttendanceStatus.APPROVED_LEAVE
        assert rec2.method == AttendanceMethod.MANUAL
        assert rec2.marked_by == teacher

        # Check AuditLog
        audit_entries = AuditLog.objects.filter(entity_name="AttendanceRecord")
        assert audit_entries.count() >= 2

    def test_manual_attendance_teacher_48h_correction_window_enforced(self, api_client, attendance_setup_data):
        """16. Teacher cannot edit attendance past 48h after session end (HTTP 400); coordinator/admin can."""
        data = attendance_setup_data
        session = data["session_today"]
        teacher = data["teacher_user"]
        coord = data["coord_user"]

        payload = {
            "items": [
                {
                    "student_id": data["student_gen"].id,
                    "status": AttendanceStatus.PRESENT,
                    "reason": "Late correction request.",
                }
            ]
        }

        # 49 hours after session end (session end is 10:30)
        session_end = datetime.datetime.combine(session.session_date, session.end_time, tzinfo=data["dhaka_tz"])
        past_48h = session_end + datetime.timedelta(hours=49)

        # Teacher attempt after 48h -> rejected with 400
        api_client.force_authenticate(user=teacher)
        with patch("apps.class_sessions.views.timezone.now", return_value=past_48h):
            res_teacher = api_client.post(
                f"/api/v1/class-sessions/{session.id}/attendance/manual/",
                payload,
                format="json",
            )
            assert res_teacher.status_code == status.HTTP_400_BAD_REQUEST
            assert "48" in str(res_teacher.data)

        # Coordinator attempt after 48h -> allowed with 200
        api_client.force_authenticate(user=coord)
        with patch("apps.class_sessions.views.timezone.now", return_value=past_48h):
            res_coord = api_client.post(
                f"/api/v1/class-sessions/{session.id}/attendance/manual/",
                payload,
                format="json",
            )
            assert res_coord.status_code == status.HTTP_200_OK

    def test_attendance_summary_endpoints_and_scoping(self, api_client, attendance_setup_data):
        """17. Verifies session, student, and batch summary endpoints with strict RBAC."""
        data = attendance_setup_data
        session = data["session_today"]
        batch = data["batch42"]
        student_gen = data["student_gen"]

        # Seed 1 present and 1 absent
        AttendanceRecord.objects.create(
            session=session,
            student=student_gen,
            status=AttendanceStatus.PRESENT,
            method=AttendanceMethod.QR,
        )
        AttendanceRecord.objects.create(
            session=session,
            student=data["student_mad"],
            status=AttendanceStatus.ABSENT,
            method=AttendanceMethod.AUTO_ABSENT,
        )

        # 1. Session attendance summary
        # Observer gets 200 OK
        api_client.force_authenticate(user=data["observer_user"])
        res_obs = api_client.get(f"/api/v1/class-sessions/{session.id}/attendance-summary/")
        assert res_obs.status_code == status.HTTP_200_OK
        assert res_obs.data["present"] == 1
        assert res_obs.data["absent"] == 1
        assert res_obs.data["attendance_percentage"] == 50.0

        # Observer gets 403 on roster
        res_obs_roster = api_client.get(f"/api/v1/class-sessions/{session.id}/attendance/")
        assert res_obs_roster.status_code == status.HTTP_403_FORBIDDEN

        # Student gets 403 on session summary
        api_client.force_authenticate(user=data["st1_user"])
        res_st = api_client.get(f"/api/v1/class-sessions/{session.id}/attendance-summary/")
        assert res_st.status_code == status.HTTP_403_FORBIDDEN

        # 2. Student attendance summary
        # Student views own summary -> 200 OK
        api_client.force_authenticate(user=data["st1_user"])
        res_me = api_client.get("/api/v1/students/me/attendance-summary/")
        assert res_me.status_code == status.HTTP_200_OK
        assert res_me.data["present"] == 1

        # Student views peer summary -> 403 Forbidden
        res_peer = api_client.get(f"/api/v1/students/{data['student_mad'].id}/attendance-summary/")
        assert res_peer.status_code == status.HTTP_403_FORBIDDEN

        # Observer on student summary -> 403 Forbidden
        api_client.force_authenticate(user=data["observer_user"])
        res_obs_st = api_client.get(f"/api/v1/students/{student_gen.id}/attendance-summary/")
        assert res_obs_st.status_code == status.HTTP_403_FORBIDDEN

        # Student personal history via /api/v1/attendance/mine/ -> 200 OK
        api_client.force_authenticate(user=data["st1_user"])
        res_mine = api_client.get("/api/v1/attendance/mine/")
        assert res_mine.status_code == status.HTTP_200_OK
        assert res_mine.data["summary"]["present"] == 1
        assert len(res_mine.data["records"]) == 1

        # 3. Batch attendance summary
        # Observer gets 200 OK (aggregate view)
        api_client.force_authenticate(user=data["observer_user"])
        res_batch_obs = api_client.get(f"/api/v1/batches/{batch.id}/attendance-summary/")
        assert res_batch_obs.status_code == status.HTTP_200_OK
        assert res_batch_obs.data["present"] == 1
        assert res_batch_obs.data["absent"] == 1

        # Student gets 403 Forbidden on batch summary
        api_client.force_authenticate(user=data["st1_user"])
        res_batch_st = api_client.get(f"/api/v1/batches/{batch.id}/attendance-summary/")
        assert res_batch_st.status_code == status.HTTP_403_FORBIDDEN

    def test_repeated_absences_detection(self, api_client, attendance_setup_data):
        """18. Detects repeated absences (trailing consecutive >= 3 OR total absences >= 5)."""
        data = attendance_setup_data
        batch = data["batch42"]
        teacher = data["teacher_user"]
        student_gen = data["student_gen"]
        student_mad = data["student_mad"]

        # Create 5 sequential published sessions on consecutive days
        sessions = []
        base_date = datetime.date(2026, 2, 1)
        subject = data["session_today"].subject
        for i in range(6):
            s = ClassSession.objects.create(
                batch=batch,
                subject=subject,
                teacher_user=teacher,
                session_date=base_date + datetime.timedelta(days=i),
                start_time=datetime.time(9, 0),
                end_time=datetime.time(10, 30),
                audience=SessionAudience.ALL,
                status=SessionStatus.PUBLISHED,
                published_at=timezone.now(),
                created_by=teacher,
            )
            sessions.append(s)

        # Student Gen: Sessions 0, 1, 2 Present; Sessions 3, 4, 5 Absent -> Trailing consecutive absences = 3
        AttendanceRecord.objects.create(session=sessions[0], student=student_gen, status=AttendanceStatus.PRESENT)
        AttendanceRecord.objects.create(session=sessions[1], student=student_gen, status=AttendanceStatus.PRESENT)
        AttendanceRecord.objects.create(session=sessions[2], student=student_gen, status=AttendanceStatus.PRESENT)
        AttendanceRecord.objects.create(session=sessions[3], student=student_gen, status=AttendanceStatus.ABSENT)
        AttendanceRecord.objects.create(session=sessions[4], student=student_gen, status=AttendanceStatus.ABSENT)
        AttendanceRecord.objects.create(session=sessions[5], student=student_gen, status=AttendanceStatus.ABSENT)

        # Student Mad: Sessions 0, 1, 2, 3, 4 Absent; Session 5 Present -> Total absences = 5, but consecutive = 0 (reset by session 5)
        AttendanceRecord.objects.create(session=sessions[0], student=student_mad, status=AttendanceStatus.ABSENT)
        AttendanceRecord.objects.create(session=sessions[1], student=student_mad, status=AttendanceStatus.ABSENT)
        AttendanceRecord.objects.create(session=sessions[2], student=student_mad, status=AttendanceStatus.ABSENT)
        AttendanceRecord.objects.create(session=sessions[3], student=student_mad, status=AttendanceStatus.ABSENT)
        AttendanceRecord.objects.create(session=sessions[4], student=student_mad, status=AttendanceStatus.ABSENT)
        AttendanceRecord.objects.create(session=sessions[5], student=student_mad, status=AttendanceStatus.PRESENT)

        # Teacher checks repeated absences -> 200 OK
        api_client.force_authenticate(user=teacher)
        response = api_client.get(f"/api/v1/batches/{batch.id}/repeated-absences/")
        assert response.status_code == status.HTTP_200_OK
        results = response.data
        assert len(results) == 2

        # Verify Student Gen
        gen_item = next(item for item in results if item["student_id"] == student_gen.id)
        assert gen_item["consecutive_absences"] == 3
        assert gen_item["total_absences"] == 3
        assert any("consecutive" in r.lower() for r in gen_item["flagged_reasons"])

        # Verify Student Mad
        mad_item = next(item for item in results if item["student_id"] == student_mad.id)
        assert mad_item["consecutive_absences"] == 0  # Streak reset by session 5 being present!
        assert mad_item["total_absences"] == 5
        assert any("total" in r.lower() for r in mad_item["flagged_reasons"])

        # Observer gets 403 Forbidden
        api_client.force_authenticate(user=data["observer_user"])
        res_obs = api_client.get(f"/api/v1/batches/{batch.id}/repeated-absences/")
        assert res_obs.status_code == status.HTTP_403_FORBIDDEN

        # Student gets 403 Forbidden
        api_client.force_authenticate(user=data["st1_user"])
        res_st = api_client.get(f"/api/v1/batches/{batch.id}/repeated-absences/")
        assert res_st.status_code == status.HTTP_403_FORBIDDEN

    def test_unassigned_teacher_forbidden_on_qr_token_and_manual_attendance(
        self, api_client, attendance_setup_data
    ):
        """Unassigned teacher gets 403 Forbidden on qr-token and manual attendance."""
        data = attendance_setup_data
        session = data["session_today"]
        unassigned_teacher = data["teacher_unassigned"]
        api_client.force_authenticate(user=unassigned_teacher)

        # 1. qr-token -> 403 Forbidden
        res_qr = api_client.post(f"/api/v1/class-sessions/{session.id}/qr-token/")
        assert res_qr.status_code == status.HTTP_403_FORBIDDEN

        # 2. manual attendance -> 403 Forbidden
        payload = {
            "items": [
                {
                    "student_id": data["student_gen"].id,
                    "status": AttendanceStatus.PRESENT,
                    "reason": "Unassigned teacher attempt.",
                }
            ]
        }
        res_manual = api_client.post(
            f"/api/v1/class-sessions/{session.id}/attendance/manual/",
            payload,
            format="json",
        )
        assert res_manual.status_code == status.HTTP_403_FORBIDDEN

    def test_coordinator_of_another_course_forbidden_on_attendance_endpoints(
        self, api_client, attendance_setup_data
    ):
        """Coordinator of another course gets 403 Forbidden on attendance endpoints."""
        data = attendance_setup_data
        session = data["session_today"]
        batch = data["batch42"]
        student = data["student_gen"]
        other_coord = data["coord_other"]
        api_client.force_authenticate(user=other_coord)

        # 1. qr-token -> 403 Forbidden
        res_qr = api_client.post(f"/api/v1/class-sessions/{session.id}/qr-token/")
        assert res_qr.status_code == status.HTTP_403_FORBIDDEN

        # 2. finalize attendance -> 403 Forbidden
        res_finalize = api_client.post(f"/api/v1/class-sessions/{session.id}/attendance/finalize/")
        assert res_finalize.status_code == status.HTTP_403_FORBIDDEN

        # 3. manual attendance -> 403 Forbidden
        payload = {
            "items": [
                {
                    "student_id": student.id,
                    "status": AttendanceStatus.PRESENT,
                    "reason": "Other course coordinator attempt.",
                }
            ]
        }
        res_manual = api_client.post(
            f"/api/v1/class-sessions/{session.id}/attendance/manual/",
            payload,
            format="json",
        )
        assert res_manual.status_code == status.HTTP_403_FORBIDDEN

        # 4. session attendance roster -> 403 Forbidden
        res_roster = api_client.get(f"/api/v1/class-sessions/{session.id}/attendance/")
        assert res_roster.status_code == status.HTTP_403_FORBIDDEN

        # 5. session attendance summary -> 403 Forbidden
        res_sess_summary = api_client.get(f"/api/v1/class-sessions/{session.id}/attendance-summary/")
        assert res_sess_summary.status_code == status.HTTP_403_FORBIDDEN

        # 6. batch attendance summary -> 403 Forbidden
        res_batch_summary = api_client.get(f"/api/v1/batches/{batch.id}/attendance-summary/")
        assert res_batch_summary.status_code == status.HTTP_403_FORBIDDEN

        # 7. batch repeated absences -> 403 Forbidden
        res_repeated = api_client.get(f"/api/v1/batches/{batch.id}/repeated-absences/")
        assert res_repeated.status_code == status.HTTP_403_FORBIDDEN

        # 8. student attendance summary -> 403 Forbidden
        res_student_summary = api_client.get(f"/api/v1/students/{student.id}/attendance-summary/")
        assert res_student_summary.status_code == status.HTTP_403_FORBIDDEN
