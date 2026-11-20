import datetime
from unittest.mock import patch
import zoneinfo

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
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
from apps.audit.models import AuditLog
from apps.batches.models import Batch, BatchStatus, TeacherAssignment
from apps.class_sessions.constants import (
    FRIDAY,
    MONDAY,
    SATURDAY,
    SUNDAY,
    THURSDAY,
    TUESDAY,
    WEDNESDAY,
    date_to_day_of_week,
)
from apps.class_sessions.models import ClassSchedule, ClassSession, SessionAudience, SessionStatus
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
def session_setup_data(db):
    """Sets up academic hierarchy, batches, teachers and students."""
    campus = Campus.objects.create(
        name="Main Campus",
        code="CAMPUS-MAIN",
        gender_campus=CampusGender.MALE,
    )
    course = Course.objects.create(
        name="Small Business Management Course",
        code="SBMC-TEST",
        duration_months=3,
    )

    # Users
    admin = User.objects.create_user(
        login_id="admin_test",
        password="Password123!",
        role=UserRole.SUPER_ADMIN,
        full_name="Admin User",
    )
    coord = User.objects.create_user(
        login_id="coord_test",
        password="Password123!",
        role=UserRole.COORDINATOR,
        full_name="Coord User",
    )
    CoordinatorCourseAssignment.objects.create(user=coord, course=course)

    observer = User.objects.create_user(
        login_id="observer_test",
        password="Password123!",
        role=UserRole.OBSERVER,
        full_name="Observer User",
    )

    t1 = User.objects.create_user(
        login_id="teacher1_test",
        password="Password123!",
        role=UserRole.TEACHER,
        full_name="Teacher One",
    )
    t2 = User.objects.create_user(
        login_id="teacher2_test",
        password="Password123!",
        role=UserRole.TEACHER,
        full_name="Teacher Two",
    )

    # Subjects
    sub_common = Subject.objects.create(
        course=course,
        name="Microsoft Office",
        code="OFFICE-101",
        audience_type=SubjectAudience.ALL,
    )
    sub_gen = Subject.objects.create(
        course=course,
        name="Islamic Basics (General)",
        code="ISLM-GEN",
        audience_type=SubjectAudience.GENERAL,
    )
    sub_mad = Subject.objects.create(
        course=course,
        name="Islamic Basics (Madrasa)",
        code="ISLM-MAD",
        audience_type=SubjectAudience.MADRASA,
    )

    # Topics
    top_common = ClassTopic.objects.create(
        subject=sub_common,
        title="Excel Fundamentals",
        description="Spreadsheets introduction",
    )
    top_gen = ClassTopic.objects.create(
        subject=sub_gen,
        title="Islamic Ethics for General",
        description="Ethics introduction",
    )
    top_mad = ClassTopic.objects.create(
        subject=sub_mad,
        title="Islamic Commerce in Fiqh",
        description="Advanced fiqh rules",
    )

    # Batches
    b42 = Batch.objects.create(
        course=course,
        campus=campus,
        batch_number=42,
        name="SBMC Batch 42",
        start_date=datetime.date(2026, 11, 1),
        end_date=datetime.date(2027, 1, 31),
        status=BatchStatus.ACTIVE,
    )
    b43 = Batch.objects.create(
        course=course,
        campus=campus,
        batch_number=43,
        name="SBMC Batch 43",
        start_date=datetime.date(2026, 12, 1),
        end_date=datetime.date(2027, 2, 28),
        status=BatchStatus.ACTIVE,
    )

    # Teacher Assignments
    TeacherAssignment.objects.create(batch=b42, subject=sub_common, teacher_user=t1)
    TeacherAssignment.objects.create(batch=b42, subject=sub_common, teacher_user=t2, is_primary=False)
    TeacherAssignment.objects.create(batch=b42, subject=sub_gen, teacher_user=t1)
    TeacherAssignment.objects.create(batch=b42, subject=sub_mad, teacher_user=t2)

    TeacherAssignment.objects.create(batch=b43, subject=sub_common, teacher_user=t1)
    TeacherAssignment.objects.create(batch=b43, subject=sub_gen, teacher_user=t1)
    TeacherAssignment.objects.create(batch=b43, subject=sub_mad, teacher_user=t2)

    # Students
    # General Student
    u_std_gen = User.objects.create_user(
        login_id="STD-TEST-001",
        password="Password123!",
        role=UserRole.STUDENT,
        full_name="General Student",
    )
    std_gen = Student.objects.create(
        user=u_std_gen,
        student_id_number="STD-TEST-001",
        registration_no="REG-TEST-001",
        education_background=EducationBackground.GENERAL,
        campus=campus,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(student=std_gen, batch=b42, status=EnrollmentStatus.ACTIVE)

    # Madrasa Student
    u_std_mad = User.objects.create_user(
        login_id="STD-TEST-002",
        password="Password123!",
        role=UserRole.STUDENT,
        full_name="Madrasa Student",
    )
    std_mad = Student.objects.create(
        user=u_std_mad,
        student_id_number="STD-TEST-002",
        registration_no="REG-TEST-002",
        education_background=EducationBackground.ALIYA,
        campus=campus,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(student=std_mad, batch=b42, status=EnrollmentStatus.ACTIVE)

    return {
        "admin": admin,
        "coord": coord,
        "observer": observer,
        "t1": t1,
        "t2": t2,
        "sub_common": sub_common,
        "sub_gen": sub_gen,
        "sub_mad": sub_mad,
        "top_common": top_common,
        "top_gen": top_gen,
        "top_mad": top_mad,
        "b42": b42,
        "b43": b43,
        "u_std_gen": u_std_gen,
        "u_std_mad": u_std_mad,
        "std_gen": std_gen,
        "std_mad": std_mad,
    }


@pytest.mark.django_db
class TestClassSessionsAndSchedules:
    """Tests for Sprint 3 Class Schedules & Sessions."""

    def test_weekday_convention_helper(self):
        """User Change 2: Verify weekday convention mapping (0=Sunday ... 6=Saturday)."""
        # 2026-11-22 is Sunday
        assert date_to_day_of_week(datetime.date(2026, 11, 22)) == SUNDAY
        # 2026-11-23 is Monday
        assert date_to_day_of_week(datetime.date(2026, 11, 23)) == MONDAY
        # 2026-11-24 is Tuesday
        assert date_to_day_of_week(datetime.date(2026, 11, 24)) == TUESDAY
        # 2026-11-25 is Wednesday
        assert date_to_day_of_week(datetime.date(2026, 11, 25)) == WEDNESDAY
        # 2026-11-26 is Thursday
        assert date_to_day_of_week(datetime.date(2026, 11, 26)) == THURSDAY
        # 2026-11-27 is Friday
        assert date_to_day_of_week(datetime.date(2026, 11, 27)) == FRIDAY
        # 2026-11-28 is Saturday
        assert date_to_day_of_week(datetime.date(2026, 11, 28)) == SATURDAY

    def test_audience_aware_batch_overlap_allowed_for_general_and_madrasa(self, session_setup_data):
        """
        User Change 1: In the same batch, 'general' and 'madrasa' sessions at the same time
        are allowed to overlap (parallel classes).
        """
        data = session_setup_data
        session_date = datetime.date(2026, 11, 22)
        s_time = datetime.time(9, 0)
        e_time = datetime.time(11, 0)

        # 1. Create General Islamic class with teacher 1
        sess_gen = ClassSession.objects.create(
            batch=data["b42"],
            subject=data["sub_gen"],
            teacher_user=data["t1"],
            topic=data["top_gen"],
            session_date=session_date,
            start_time=s_time,
            end_time=e_time,
            audience=SessionAudience.GENERAL,
            status=SessionStatus.PUBLISHED,
        )
        assert sess_gen.pk is not None

        # 2. Create Madrasa Islamic class with teacher 2 at the exact same time
        sess_mad = ClassSession.objects.create(
            batch=data["b42"],
            subject=data["sub_mad"],
            teacher_user=data["t2"],
            topic=data["top_mad"],
            session_date=session_date,
            start_time=s_time,
            end_time=e_time,
            audience=SessionAudience.MADRASA,
            status=SessionStatus.PUBLISHED,
        )
        assert sess_mad.pk is not None
        assert ClassSession.objects.filter(session_date=session_date).count() == 2

    def test_batch_overlap_rejected_for_all_and_general(self, session_setup_data):
        """
        User Change 1: In the same batch, 'all' audience intersects with 'general'
        and must be rejected.
        """
        data = session_setup_data
        session_date = datetime.date(2026, 11, 22)
        s_time = datetime.time(9, 0)
        e_time = datetime.time(11, 0)

        # 1. Create General session
        ClassSession.objects.create(
            batch=data["b42"],
            subject=data["sub_gen"],
            teacher_user=data["t1"],
            topic=data["top_gen"],
            session_date=session_date,
            start_time=s_time,
            end_time=e_time,
            audience=SessionAudience.GENERAL,
            status=SessionStatus.PUBLISHED,
        )

        # 2. Try creating 'all' session at overlapping time with teacher 2
        sess_all = ClassSession(
            batch=data["b42"],
            subject=data["sub_common"],
            teacher_user=data["t2"],
            topic=data["top_common"],
            session_date=session_date,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(12, 0),
            audience=SessionAudience.ALL,
            status=SessionStatus.PUBLISHED,
        )
        with pytest.raises(ValidationError) as exc_info:
            sess_all.save()
        assert "audience" in exc_info.value.message_dict

    def test_strict_teacher_overlap_rejected_across_batches(self, session_setup_data):
        """
        User Change 1: One teacher cannot be in two overlapping sessions at the same time,
        even in different batches or audiences.
        """
        data = session_setup_data
        session_date = datetime.date(2026, 12, 10)

        # Teacher 1 has class in Batch 42 from 09:00 to 11:00
        ClassSession.objects.create(
            batch=data["b42"],
            subject=data["sub_common"],
            teacher_user=data["t1"],
            topic=data["top_common"],
            session_date=session_date,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(11, 0),
            audience=SessionAudience.ALL,
            status=SessionStatus.PUBLISHED,
        )

        # Try to schedule Teacher 1 in Batch 43 from 10:30 to 12:30
        conflict_sess = ClassSession(
            batch=data["b43"],
            subject=data["sub_common"],
            teacher_user=data["t1"],
            topic=data["top_common"],
            session_date=session_date,
            start_time=datetime.time(10, 30),
            end_time=datetime.time(12, 30),
            audience=SessionAudience.ALL,
            status=SessionStatus.PUBLISHED,
        )
        with pytest.raises(ValidationError) as exc_info:
            conflict_sess.save()
        assert "teacher_user" in exc_info.value.message_dict

    def test_generate_sessions_creates_sessions_on_exact_school_days_idempotently(
        self, api_client, session_setup_data
    ):
        """
        User Change 2: Test generate-sessions batch action creates sessions on exact school days
        and asserts idempotency on re-run.
        """
        data = session_setup_data
        # Create schedules for Sunday (0) and Tuesday (2)
        sched_sun = ClassSchedule.objects.create(
            batch=data["b42"],
            subject=data["sub_common"],
            teacher_user=data["t1"],
            day_of_week=SUNDAY,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(12, 0),
            room="Room 101",
        )
        sched_tue = ClassSchedule.objects.create(
            batch=data["b42"],
            subject=data["sub_common"],
            teacher_user=data["t1"],
            day_of_week=TUESDAY,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(12, 0),
            room="Room 101",
        )

        api_client.force_authenticate(user=data["coord"])
        payload = {
            "start_date": "2026-11-22",
            "end_date": "2026-11-28",
        }

        # 1. Call per-schedule generate-sessions for Sunday schedule
        res_sun = api_client.post(
            f"/api/v1/class-schedules/{sched_sun.id}/generate-sessions/", payload, format="json"
        )
        assert res_sun.status_code == status.HTTP_201_CREATED
        assert res_sun.data["created_count"] == 1

        # 2. Call per-schedule generate-sessions for Tuesday schedule
        res_tue = api_client.post(
            f"/api/v1/class-schedules/{sched_tue.id}/generate-sessions/", payload, format="json"
        )
        assert res_tue.status_code == status.HTTP_201_CREATED
        assert res_tue.data["created_count"] == 1

        # Verify created dates: 2026-11-22 (Sunday) and 2026-11-24 (Tuesday)
        created_dates = list(
            ClassSession.objects.filter(batch=data["b42"]).values_list("session_date", flat=True)
        )
        assert datetime.date(2026, 11, 22) in created_dates
        assert datetime.date(2026, 11, 24) in created_dates
        # Friday (2026-11-27) and Saturday (2026-11-28) must NOT have any sessions
        assert datetime.date(2026, 11, 27) not in created_dates
        assert datetime.date(2026, 11, 28) not in created_dates

        # Idempotency check 1: run per-schedule generate-sessions again
        res_sun_repeat = api_client.post(
            f"/api/v1/class-schedules/{sched_sun.id}/generate-sessions/", payload, format="json"
        )
        assert res_sun_repeat.status_code == status.HTTP_200_OK
        assert res_sun_repeat.data["created_count"] == 0

        # Idempotency check 2: run bulk generate-all-sessions
        bulk_payload = {**payload, "batch_id": data["b42"].id}
        res_bulk_repeat = api_client.post(
            "/api/v1/class-schedules/generate-all-sessions/", bulk_payload, format="json"
        )
        assert res_bulk_repeat.status_code == status.HTTP_200_OK
        assert res_bulk_repeat.data["created_count"] == 0
        assert ClassSession.objects.filter(batch=data["b42"]).count() == 2

    def test_timezone_accuracy_for_today_endpoint(self, api_client, session_setup_data):
        """
        User Change 3: /class-sessions/today/ must compute 'today' in Asia/Dhaka (+06:00),
        never in UTC.
        """
        data = session_setup_data
        # Create a session on 2026-11-21
        sess_21 = ClassSession.objects.create(
            batch=data["b42"],
            subject=data["sub_common"],
            teacher_user=data["t1"],
            topic=data["top_common"],
            session_date=datetime.date(2026, 11, 21),
            start_time=datetime.time(10, 0),
            end_time=datetime.time(12, 0),
            audience=SessionAudience.ALL,
            status=SessionStatus.PUBLISHED,
            published_at=timezone.now(),
        )

        api_client.force_authenticate(user=data["admin"])

        # Boundary Case 1: 2026-11-20 23:30:00 UTC
        # In UTC it is Nov 20, but in Dhaka (+6h) it is Nov 21 05:30:00
        mock_now_1 = datetime.datetime(2026, 11, 20, 23, 30, 0, tzinfo=datetime.timezone.utc)
        with patch("django.utils.timezone.now", return_value=mock_now_1):
            res = api_client.get("/api/v1/class-sessions/today/")
            assert res.status_code == status.HTTP_200_OK
            session_ids = [s["id"] for s in res.data]
            assert sess_21.id in session_ids

        # Boundary Case 2: 2026-11-20 18:30:00 UTC
        # In UTC it is Nov 20, but in Dhaka (+6h) it is Nov 21 00:30:00 (just past midnight)
        mock_now_2 = datetime.datetime(2026, 11, 20, 18, 30, 0, tzinfo=datetime.timezone.utc)
        with patch("django.utils.timezone.now", return_value=mock_now_2):
            res2 = api_client.get("/api/v1/class-sessions/today/")
            assert res2.status_code == status.HTTP_200_OK
            session_ids2 = [s["id"] for s in res2.data]
            assert sess_21.id in session_ids2

        # Boundary Case 3: 2026-11-20 17:59:00 UTC
        # In Dhaka (+6h) it is Nov 20 23:59:00 -> sess_21 should NOT appear
        mock_now_3 = datetime.datetime(2026, 11, 20, 17, 59, 0, tzinfo=datetime.timezone.utc)
        with patch("django.utils.timezone.now", return_value=mock_now_3):
            res3 = api_client.get("/api/v1/class-sessions/today/")
            assert res3.status_code == status.HTTP_200_OK
            session_ids3 = [s["id"] for s in res3.data]
            assert sess_21.id not in session_ids3

    def test_teacher_session_creation_constraint_rejects_impersonation(
        self, api_client, session_setup_data
    ):
        """
        User Change 4: A teacher can create/edit sessions only where teacher = request.user.
        A teacher trying to assign another teacher must be rejected.
        """
        data = session_setup_data
        api_client.force_authenticate(user=data["t1"])

        # 1. Teacher 1 tries to create session assigning Teacher 2 -> REJECTED (403 Forbidden)
        payload_impersonate = {
            "batch": data["b42"].id,
            "subject": data["sub_common"].id,
            "teacher_user": str(data["t2"].id),
            "session_date": "2026-11-25",
            "start_time": "14:00:00",
            "end_time": "16:00:00",
            "audience": "all",
        }
        res_fail = api_client.post("/api/v1/class-sessions/", payload_impersonate, format="json")
        assert res_fail.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST]

        # 2. Teacher 1 creates session for themselves -> SUCCESS
        payload_self = {
            "batch": data["b42"].id,
            "subject": data["sub_common"].id,
            "teacher_user": str(data["t1"].id),
            "session_date": "2026-11-25",
            "start_time": "14:00:00",
            "end_time": "16:00:00",
            "audience": "all",
        }
        res_ok = api_client.post("/api/v1/class-sessions/", payload_self, format="json")
        assert res_ok.status_code == status.HTTP_201_CREATED
        assert str(res_ok.data["teacher_user"]) == str(data["t1"].id)

    def test_session_lifecycle_and_visibility_rules(self, api_client, session_setup_data):
        """
        User Change 5:
        - Students and Observers CANNOT see draft sessions.
        - Students and Observers CAN see published sessions.
        - Students and Observers CAN see sessions that were published and then cancelled.
        - Students and Observers CANNOT see sessions that were cancelled without ever being published.
        """
        data = session_setup_data

        # 1. Create a Draft Session
        sess_draft = ClassSession.objects.create(
            batch=data["b42"],
            subject=data["sub_common"],
            teacher_user=data["t1"],
            topic=data["top_common"],
            session_date=datetime.date(2026, 11, 23),
            start_time=datetime.time(10, 0),
            end_time=datetime.time(12, 0),
            audience=SessionAudience.ALL,
            status=SessionStatus.DRAFT,
            published_at=None,
        )

        # Student checks sessions -> Draft NOT visible
        api_client.force_authenticate(user=data["u_std_gen"])
        res_std = api_client.get("/api/v1/class-sessions/")
        assert res_std.status_code == status.HTTP_200_OK
        assert sess_draft.id not in [s["id"] for s in res_std.data["results"]]

        # Observer checks sessions -> Draft NOT visible
        api_client.force_authenticate(user=data["observer"])
        res_obs = api_client.get("/api/v1/class-sessions/")
        assert res_obs.status_code == status.HTTP_200_OK
        assert sess_draft.id not in [s["id"] for s in res_obs.data["results"]]

        # 2. Publish Session
        api_client.force_authenticate(user=data["t1"])
        res_pub = api_client.post(f"/api/v1/class-sessions/{sess_draft.id}/publish/")
        assert res_pub.status_code == status.HTTP_200_OK
        sess_draft.refresh_from_db()
        assert sess_draft.status == SessionStatus.PUBLISHED
        assert sess_draft.published_at is not None

        # Student checks sessions -> Published session IS visible
        api_client.force_authenticate(user=data["u_std_gen"])
        res_std_pub = api_client.get("/api/v1/class-sessions/")
        assert sess_draft.id in [s["id"] for s in res_std_pub.data["results"]]

        # 3. Cancel the Published Session with a reason
        api_client.force_authenticate(user=data["t1"])
        res_cancel = api_client.post(
            f"/api/v1/class-sessions/{sess_draft.id}/cancel/",
            {"cancel_reason": "Emergency electrical maintenance"},
            format="json",
        )
        assert res_cancel.status_code == status.HTTP_200_OK
        sess_draft.refresh_from_db()
        assert sess_draft.status == SessionStatus.CANCELLED
        assert sess_draft.cancel_reason == "Emergency electrical maintenance"

        # Student checks sessions -> Published-then-cancelled session IS visible with status and reason
        api_client.force_authenticate(user=data["u_std_gen"])
        res_std_cancelled = api_client.get("/api/v1/class-sessions/")
        matching_s = [s for s in res_std_cancelled.data["results"] if s["id"] == sess_draft.id]
        assert len(matching_s) == 1
        assert matching_s[0]["status"] == "cancelled"
        assert matching_s[0]["cancel_reason"] == "Emergency electrical maintenance"

        # 4. Create another session as Draft and Cancel it directly WITHOUT publishing
        sess_draft2 = ClassSession.objects.create(
            batch=data["b42"],
            subject=data["sub_common"],
            teacher_user=data["t1"],
            topic=data["top_common"],
            session_date=datetime.date(2026, 11, 24),
            start_time=datetime.time(10, 0),
            end_time=datetime.time(12, 0),
            audience=SessionAudience.ALL,
            status=SessionStatus.CANCELLED,
            published_at=None,
            cancel_reason="Created by mistake in draft",
        )

        # Student checks sessions -> Never-published cancelled session is NOT visible
        api_client.force_authenticate(user=data["u_std_gen"])
        res_std_never_pub = api_client.get("/api/v1/class-sessions/")
        assert sess_draft2.id not in [s["id"] for s in res_std_never_pub.data["results"]]

        # Observer checks sessions -> Never-published cancelled session is NOT visible
        api_client.force_authenticate(user=data["observer"])
        res_obs_never_pub = api_client.get("/api/v1/class-sessions/")
        assert sess_draft2.id not in [s["id"] for s in res_obs_never_pub.data["results"]]

    def test_student_audience_filtering(self, api_client, session_setup_data):
        """
        Verifies student sees only sessions matching their background:
        General student sees 'all' and 'general'.
        Madrasa student sees 'all' and 'madrasa'.
        """
        data = session_setup_data
        session_date = datetime.date(2026, 11, 23)

        # Session 1: General Islamic
        s_gen = ClassSession.objects.create(
            batch=data["b42"],
            subject=data["sub_gen"],
            teacher_user=data["t1"],
            topic=data["top_gen"],
            session_date=session_date,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(11, 0),
            audience=SessionAudience.GENERAL,
            status=SessionStatus.PUBLISHED,
            published_at=timezone.now(),
        )

        # Session 2: Madrasa Islamic
        s_mad = ClassSession.objects.create(
            batch=data["b42"],
            subject=data["sub_mad"],
            teacher_user=data["t2"],
            topic=data["top_mad"],
            session_date=session_date,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(11, 0),
            audience=SessionAudience.MADRASA,
            status=SessionStatus.PUBLISHED,
            published_at=timezone.now(),
        )

        # General student query
        api_client.force_authenticate(user=data["u_std_gen"])
        res_gen = api_client.get("/api/v1/class-sessions/")
        ids_gen = [s["id"] for s in res_gen.data["results"]]
        assert s_gen.id in ids_gen
        assert s_mad.id not in ids_gen

        # Madrasa student query
        api_client.force_authenticate(user=data["u_std_mad"])
        res_mad = api_client.get("/api/v1/class-sessions/")
        ids_mad = [s["id"] for s in res_mad.data["results"]]
        assert s_mad.id in ids_mad
        assert s_gen.id not in ids_mad

    def test_teacher_cannot_create_session_for_unassigned_subject(
        self, api_client, session_setup_data
    ):
        """Teacher cannot create a session for a subject they are not assigned to."""
        data = session_setup_data
        # Teacher 1 is NOT assigned to sub_mad in b42
        api_client.force_authenticate(user=data["t1"])
        payload = {
            "batch": data["b42"].id,
            "subject": data["sub_mad"].id,
            "session_date": "2026-11-25",
            "start_time": "14:00:00",
            "end_time": "16:00:00",
            "audience": "madrasa",
        }
        res = api_client.post("/api/v1/class-sessions/", payload, format="json")
        assert res.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST]

    def test_topic_from_different_subject_is_rejected(self, session_setup_data):
        """Topic from a different subject is rejected with ValidationError."""
        data = session_setup_data
        sess = ClassSession(
            batch=data["b42"],
            subject=data["sub_common"],
            teacher_user=data["t1"],
            topic=data["top_mad"],  # Belongs to sub_mad, not sub_common!
            session_date=datetime.date(2026, 11, 25),
            start_time=datetime.time(10, 0),
            end_time=datetime.time(12, 0),
            audience=SessionAudience.ALL,
        )
        with pytest.raises(ValidationError) as exc:
            sess.save()
        assert "topic" in exc.value.message_dict

    def test_end_time_before_start_time_is_rejected(self, session_setup_data):
        """end_time before or equal to start_time is rejected."""
        data = session_setup_data
        sess = ClassSession(
            batch=data["b42"],
            subject=data["sub_common"],
            teacher_user=data["t1"],
            topic=data["top_common"],
            session_date=datetime.date(2026, 11, 25),
            start_time=datetime.time(14, 0),
            end_time=datetime.time(12, 0),  # earlier than start_time
            audience=SessionAudience.ALL,
        )
        with pytest.raises(ValidationError) as exc:
            sess.save()
        assert "end_time" in exc.value.message_dict

    def test_overlapping_sessions_same_batch_same_audience_rejected(self, session_setup_data):
        """Overlapping sessions for the same batch with same audience are rejected."""
        data = session_setup_data
        session_date = datetime.date(2026, 11, 25)

        # 1. First session
        ClassSession.objects.create(
            batch=data["b42"],
            subject=data["sub_common"],
            teacher_user=data["t1"],
            topic=data["top_common"],
            session_date=session_date,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(12, 0),
            audience=SessionAudience.ALL,
            status=SessionStatus.PUBLISHED,
        )

        # 2. Overlapping session for same batch and same audience (with teacher 2)
        sess_conflict = ClassSession(
            batch=data["b42"],
            subject=data["sub_common"],
            teacher_user=data["t2"],
            topic=data["top_common"],
            session_date=session_date,
            start_time=datetime.time(11, 0),
            end_time=datetime.time(13, 0),
            audience=SessionAudience.ALL,
            status=SessionStatus.PUBLISHED,
        )
        with pytest.raises(ValidationError) as exc:
            sess_conflict.save()
        assert "audience" in exc.value.message_dict

    def test_student_of_batch_42_cannot_see_batch_43_sessions(
        self, api_client, session_setup_data
    ):
        """Student enrolled in Batch 42 cannot see Batch 43 sessions."""
        data = session_setup_data
        # Session in Batch 43
        sess_b43 = ClassSession.objects.create(
            batch=data["b43"],
            subject=data["sub_common"],
            teacher_user=data["t1"],
            topic=data["top_common"],
            session_date=datetime.date(2026, 12, 5),
            start_time=datetime.time(10, 0),
            end_time=datetime.time(12, 0),
            audience=SessionAudience.ALL,
            status=SessionStatus.PUBLISHED,
            published_at=timezone.now(),
        )

        # Student of Batch 42 queries
        api_client.force_authenticate(user=data["u_std_gen"])
        res = api_client.get("/api/v1/class-sessions/")
        assert res.status_code == status.HTTP_200_OK
        ids = [s["id"] for s in res.data["results"]]
        assert sess_b43.id not in ids

    def test_editing_published_session_writes_audit_log(
        self, api_client, session_setup_data
    ):
        """Editing a published session writes an AuditLog entry with old and new values."""
        data = session_setup_data
        sess = ClassSession.objects.create(
            batch=data["b42"],
            subject=data["sub_common"],
            teacher_user=data["t1"],
            topic=data["top_common"],
            session_date=datetime.date(2026, 11, 26),
            start_time=datetime.time(10, 0),
            end_time=datetime.time(12, 0),
            audience=SessionAudience.ALL,
            status=SessionStatus.PUBLISHED,
            published_at=timezone.now(),
        )

        api_client.force_authenticate(user=data["coord"])
        patch_payload = {
            "start_time": "10:30:00",
            "end_time": "12:30:00",
        }
        res = api_client.patch(f"/api/v1/class-sessions/{sess.id}/", patch_payload, format="json")
        assert res.status_code == status.HTTP_200_OK

        # Verify AuditLog created
        log = AuditLog.objects.filter(
            entity_name="ClassSession",
            entity_id=str(sess.id),
            action="UPDATE_PUBLISHED_SESSION",
        ).first()
        assert log is not None
        assert log.actor_user == data["coord"]
        assert log.old_values["start_time"] == "10:00:00"
        assert log.new_values["start_time"] == "10:30:00"

    def test_cancelling_without_cancel_reason_is_rejected(
        self, api_client, session_setup_data
    ):
        """Cancelling a session without cancel_reason is rejected with HTTP 400."""
        data = session_setup_data
        sess = ClassSession.objects.create(
            batch=data["b42"],
            subject=data["sub_common"],
            teacher_user=data["t1"],
            topic=data["top_common"],
            session_date=datetime.date(2026, 11, 26),
            start_time=datetime.time(14, 0),
            end_time=datetime.time(16, 0),
            audience=SessionAudience.ALL,
            status=SessionStatus.PUBLISHED,
            published_at=timezone.now(),
        )

        api_client.force_authenticate(user=data["t1"])
        res_empty = api_client.post(f"/api/v1/class-sessions/{sess.id}/cancel/", {}, format="json")
        assert res_empty.status_code == status.HTTP_400_BAD_REQUEST

        res_blank = api_client.post(
            f"/api/v1/class-sessions/{sess.id}/cancel/", {"cancel_reason": ""}, format="json"
        )
        assert res_blank.status_code == status.HTTP_400_BAD_REQUEST

    def test_coordinator_cannot_create_or_see_sessions_of_another_course(
        self, api_client, session_setup_data
    ):
        """Coordinator cannot create or see sessions belonging to another course."""
        data = session_setup_data
        campus = data["b42"].campus

        # Other course not assigned to data["coord"]
        other_course = Course.objects.create(
            name="Graphic Design Bootcamp",
            code="GDB-OTHER",
            duration_months=2,
        )
        other_sub = Subject.objects.create(
            course=other_course,
            name="Photoshop Mastery",
            code="PS-101",
        )
        other_batch = Batch.objects.create(
            course=other_course,
            campus=campus,
            batch_number=1,
            name="GDB Batch 1",
            start_date=datetime.date(2026, 11, 1),
            end_date=datetime.date(2027, 1, 31),
            status=BatchStatus.ACTIVE,
        )
        TeacherAssignment.objects.create(
            batch=other_batch,
            subject=other_sub,
            teacher_user=data["t1"],
        )

        # Other course session
        other_sess = ClassSession.objects.create(
            batch=other_batch,
            subject=other_sub,
            teacher_user=data["t1"],
            session_date=datetime.date(2026, 11, 26),
            start_time=datetime.time(10, 0),
            end_time=datetime.time(12, 0),
            status=SessionStatus.PUBLISHED,
            published_at=timezone.now(),
        )

        api_client.force_authenticate(user=data["coord"])

        # 1. Coordinator cannot see other course session
        res_list = api_client.get("/api/v1/class-sessions/")
        assert res_list.status_code == status.HTTP_200_OK
        ids = [s["id"] for s in res_list.data["results"]]
        assert other_sess.id not in ids

        # 2. Coordinator cannot create session for other course
        create_payload = {
            "batch": other_batch.id,
            "subject": other_sub.id,
            "teacher_user": str(data["t1"].id),
            "session_date": "2026-11-27",
            "start_time": "14:00:00",
            "end_time": "16:00:00",
            "audience": "all",
        }
        res_create = api_client.post("/api/v1/class-sessions/", create_payload, format="json")
        assert res_create.status_code == status.HTTP_403_FORBIDDEN
