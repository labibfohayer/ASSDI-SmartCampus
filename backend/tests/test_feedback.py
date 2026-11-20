import datetime
import uuid
from unittest.mock import patch
import zoneinfo

import pytest
from django.contrib.auth import get_user_model
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
from apps.class_sessions.models import ClassSession, SessionAudience, SessionStatus
from apps.feedback.constants import (
    ALL_BANDS,
    BAND_0_20,
    BAND_21_40,
    BAND_41_60,
    BAND_61_80,
    BAND_81_100,
    get_understanding_band,
    rating_to_percentage,
)
from apps.feedback.models import HelpRequest, HelpRequestStatus, LearningFeedback
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
def feedback_setup_data(db):
    """Sets up campuses, courses, subjects, batches, teachers, students, and sessions."""
    campus = Campus.objects.create(
        name="Kazi Bari Campus",
        code="KBC-NB",
        gender_campus=CampusGender.MALE,
    )
    course1 = Course.objects.create(
        name="Small Business Management Course",
        code="SBMC",
        duration_months=3,
    )
    course2 = Course.objects.create(
        name="Computer Applications",
        code="CAP",
        duration_months=6,
    )

    batch42 = Batch.objects.create(
        course=course1,
        campus=campus,
        batch_number=42,
        name="SBMC Batch 42",
        start_date=datetime.date(2026, 1, 1),
        end_date=datetime.date(2026, 4, 30),
        status=BatchStatus.ACTIVE,
    )
    batch43 = Batch.objects.create(
        course=course1,
        campus=campus,
        batch_number=43,
        name="SBMC Batch 43",
        start_date=datetime.date(2026, 2, 1),
        end_date=datetime.date(2026, 5, 31),
        status=BatchStatus.ACTIVE,
    )
    batch99 = Batch.objects.create(
        course=course2,
        campus=campus,
        batch_number=99,
        name="CAP Batch 99",
        start_date=datetime.date(2026, 1, 1),
        end_date=datetime.date(2026, 6, 30),
        status=BatchStatus.ACTIVE,
    )

    # Subjects
    sub_acct = Subject.objects.create(
        course=course1,
        name="Accounting",
        code="ACCT",
        audience_type=SubjectAudience.ALL,
    )
    sub_islamic_gen = Subject.objects.create(
        course=course1,
        name="Islamic Basics (General)",
        code="ISL-GEN",
        audience_type=SubjectAudience.GENERAL,
    )
    sub_islamic_mad = Subject.objects.create(
        course=course1,
        name="Islamic Basics (Madrasa)",
        code="ISL-MAD",
        audience_type=SubjectAudience.MADRASA,
    )
    sub_cap = Subject.objects.create(
        course=course2,
        name="Hardware Basics",
        code="HW",
        audience_type=SubjectAudience.ALL,
    )

    # Topics
    topic_acct = ClassTopic.objects.create(
        subject=sub_acct,
        title="Ledger Posting",
        description="Debit credit posting into general ledger.",
    )
    topic_isl_gen = ClassTopic.objects.create(
        subject=sub_islamic_gen,
        title="Tahara and Salah",
        description="Basics of purity and prayer.",
    )
    topic_isl_mad = ClassTopic.objects.create(
        subject=sub_islamic_mad,
        title="Fiqh of Muamalat",
        description="Transactions in Islamic commercial law.",
    )

    # Staff Users
    admin_user = User.objects.create_user(
        login_id="admin_fb",
        password="AdminPass2026!",
        role=UserRole.SUPER_ADMIN,
        full_name="Admin FB",
    )
    coord1_user = User.objects.create_user(
        login_id="coord1_fb",
        password="CoordPass2026!",
        role=UserRole.COORDINATOR,
        full_name="Coord One FB",
    )
    CoordinatorCourseAssignment.objects.create(user=coord1_user, course=course1)

    coord2_user = User.objects.create_user(
        login_id="coord2_fb",
        password="CoordPass2026!",
        role=UserRole.COORDINATOR,
        full_name="Coord Two FB",
    )
    CoordinatorCourseAssignment.objects.create(user=coord2_user, course=course2)

    teacher1_user = User.objects.create_user(
        login_id="teacher1_fb",
        password="TeacherPass2026!",
        role=UserRole.TEACHER,
        full_name="Teacher One FB",
    )
    TeacherAssignment.objects.create(batch=batch42, subject=sub_acct, teacher_user=teacher1_user)
    TeacherAssignment.objects.create(batch=batch42, subject=sub_islamic_gen, teacher_user=teacher1_user)

    teacher2_user = User.objects.create_user(
        login_id="teacher2_fb",
        password="TeacherPass2026!",
        role=UserRole.TEACHER,
        full_name="Teacher Two FB",
    )
    TeacherAssignment.objects.create(batch=batch42, subject=sub_islamic_mad, teacher_user=teacher2_user)
    TeacherAssignment.objects.create(batch=batch43, subject=sub_acct, teacher_user=teacher2_user)

    observer_user = User.objects.create_user(
        login_id="observer_fb",
        password="ObserverPass2026!",
        role=UserRole.OBSERVER,
        full_name="Observer FB",
    )

    # Students
    # Student 1: Batch 42, General
    u_s1 = User.objects.create_user(
        login_id="STD-B42-001",
        password="StudentPass2026!",
        role=UserRole.STUDENT,
        full_name="Student 1 General",
    )
    s1 = Student.objects.create(
        user=u_s1,
        student_id_number=u_s1.login_id,
        registration_no="REG-B42-001",
        education_background=EducationBackground.GENERAL,
        campus=campus,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(student=s1, batch=batch42, status=EnrollmentStatus.ACTIVE)

    # Student 2: Batch 42, Aliya
    u_s2 = User.objects.create_user(
        login_id="STD-B42-002",
        password="StudentPass2026!",
        role=UserRole.STUDENT,
        full_name="Student 2 Aliya",
    )
    s2 = Student.objects.create(
        user=u_s2,
        student_id_number=u_s2.login_id,
        registration_no="REG-B42-002",
        education_background=EducationBackground.ALIYA,
        campus=campus,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(student=s2, batch=batch42, status=EnrollmentStatus.ACTIVE)

    # Student 3: Batch 42, Qawmi
    u_s3 = User.objects.create_user(
        login_id="STD-B42-003",
        password="StudentPass2026!",
        role=UserRole.STUDENT,
        full_name="Student 3 Qawmi",
    )
    s3 = Student.objects.create(
        user=u_s3,
        student_id_number=u_s3.login_id,
        registration_no="REG-B42-003",
        education_background=EducationBackground.QAWMI,
        campus=campus,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(student=s3, batch=batch42, status=EnrollmentStatus.ACTIVE)

    # Student 4: Batch 43, General
    u_s4 = User.objects.create_user(
        login_id="STD-B43-001",
        password="StudentPass2026!",
        role=UserRole.STUDENT,
        full_name="Student 4 Batch43",
    )
    s4 = Student.objects.create(
        user=u_s4,
        student_id_number=u_s4.login_id,
        registration_no="REG-B43-001",
        education_background=EducationBackground.GENERAL,
        campus=campus,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(student=s4, batch=batch43, status=EnrollmentStatus.ACTIVE)

    # Sessions
    dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
    today_dhaka = timezone.now().astimezone(dhaka_tz).date()
    yesterday_dhaka = (today_dhaka - datetime.timedelta(days=1))
    tomorrow_dhaka = (today_dhaka + datetime.timedelta(days=1))

    # Session 1: Today morning, 08:00 - 09:30 (accounting, audience ALL, published)
    session_past_acct = ClassSession.objects.create(
        batch=batch42,
        subject=sub_acct,
        teacher_user=teacher1_user,
        topic=topic_acct,
        session_date=today_dhaka,
        start_time=datetime.time(8, 0),
        end_time=datetime.time(9, 30),
        audience=SessionAudience.ALL,
        status=SessionStatus.PUBLISHED,
        published_at=timezone.now(),
        created_by=admin_user,
    )

    # Session 2: Today morning, 10:00 - 11:30 (Islamic General, audience GENERAL, published)
    session_past_isl_gen = ClassSession.objects.create(
        batch=batch42,
        subject=sub_islamic_gen,
        teacher_user=teacher1_user,
        topic=topic_isl_gen,
        session_date=today_dhaka,
        start_time=datetime.time(10, 0),
        end_time=datetime.time(11, 30),
        audience=SessionAudience.GENERAL,
        status=SessionStatus.PUBLISHED,
        published_at=timezone.now(),
        created_by=admin_user,
    )

    # Session 3: Today morning, 10:00 - 11:30 (Islamic Madrasa, audience MADRASA, published)
    session_past_isl_mad = ClassSession.objects.create(
        batch=batch42,
        subject=sub_islamic_mad,
        teacher_user=teacher2_user,
        topic=topic_isl_mad,
        session_date=today_dhaka,
        start_time=datetime.time(10, 0),
        end_time=datetime.time(11, 30),
        audience=SessionAudience.MADRASA,
        status=SessionStatus.PUBLISHED,
        published_at=timezone.now(),
        created_by=admin_user,
    )

    # Draft session
    session_draft = ClassSession.objects.create(
        batch=batch42,
        subject=sub_acct,
        teacher_user=teacher1_user,
        topic=topic_acct,
        session_date=yesterday_dhaka,
        start_time=datetime.time(14, 0),
        end_time=datetime.time(15, 0),
        audience=SessionAudience.ALL,
        status=SessionStatus.DRAFT,
        created_by=admin_user,
    )

    # Cancelled session
    session_cancelled = ClassSession.objects.create(
        batch=batch42,
        subject=sub_acct,
        teacher_user=teacher1_user,
        topic=topic_acct,
        session_date=yesterday_dhaka,
        start_time=datetime.time(15, 30),
        end_time=datetime.time(16, 30),
        audience=SessionAudience.ALL,
        status=SessionStatus.CANCELLED,
        cancel_reason="Teacher unwell",
        created_by=admin_user,
    )

    # Future session
    session_future = ClassSession.objects.create(
        batch=batch42,
        subject=sub_acct,
        teacher_user=teacher1_user,
        topic=topic_acct,
        session_date=tomorrow_dhaka,
        start_time=datetime.time(10, 0),
        end_time=datetime.time(11, 30),
        audience=SessionAudience.ALL,
        status=SessionStatus.PUBLISHED,
        published_at=timezone.now(),
        created_by=admin_user,
    )

    return {
        "campus": campus,
        "course1": course1,
        "course2": course2,
        "batch42": batch42,
        "batch43": batch43,
        "batch99": batch99,
        "sub_acct": sub_acct,
        "sub_islamic_gen": sub_islamic_gen,
        "sub_islamic_mad": sub_islamic_mad,
        "sub_cap": sub_cap,
        "topic_acct": topic_acct,
        "topic_isl_gen": topic_isl_gen,
        "topic_isl_mad": topic_isl_mad,
        "admin_user": admin_user,
        "coord1_user": coord1_user,
        "coord2_user": coord2_user,
        "teacher1_user": teacher1_user,
        "teacher2_user": teacher2_user,
        "observer_user": observer_user,
        "s1": s1,
        "u_s1": u_s1,
        "s2": s2,
        "u_s2": u_s2,
        "s3": s3,
        "u_s3": u_s3,
        "s4": s4,
        "u_s4": u_s4,
        "session_past_acct": session_past_acct,
        "session_past_isl_gen": session_past_isl_gen,
        "session_past_isl_mad": session_past_isl_mad,
        "session_draft": session_draft,
        "session_cancelled": session_cancelled,
        "session_future": session_future,
        "dhaka_tz": dhaka_tz,
    }


@pytest.mark.django_db
class TestFeedbackAndHelpRequests:

    def test_feedback_rating_boundaries_validation(self, api_client, feedback_setup_data):
        """Rating 1-5 required. 0, 6, and strings must be rejected with HTTP 400."""
        d = feedback_setup_data
        api_client.force_authenticate(user=d["u_s1"])
        session = d["session_past_acct"]

        # Below min (0)
        res_zero = api_client.post("/api/v1/feedback/", {
            "session": session.id,
            "understanding_rating": 0,
        })
        assert res_zero.status_code == status.HTTP_400_BAD_REQUEST

        # Above max (6)
        res_six = api_client.post("/api/v1/feedback/", {
            "session": session.id,
            "understanding_rating": 6,
        })
        assert res_six.status_code == status.HTTP_400_BAD_REQUEST

        # Non-integer
        res_str = api_client.post("/api/v1/feedback/", {
            "session": session.id,
            "understanding_rating": "five",
        })
        assert res_str.status_code == status.HTTP_400_BAD_REQUEST

    def test_feedback_percentage_and_band_computed_correctly(self, api_client, feedback_setup_data):
        """Verifies 1=20%, 2=40%, 3=60%, 4=80%, 5=100% and matching bands."""
        assert rating_to_percentage(1) == 20
        assert rating_to_percentage(2) == 40
        assert rating_to_percentage(3) == 60
        assert rating_to_percentage(4) == 80
        assert rating_to_percentage(5) == 100

        assert get_understanding_band(1) == BAND_0_20
        assert get_understanding_band(2) == BAND_21_40
        assert get_understanding_band(3) == BAND_41_60
        assert get_understanding_band(4) == BAND_61_80
        assert get_understanding_band(5) == BAND_81_100

        d = feedback_setup_data
        api_client.force_authenticate(user=d["u_s1"])

        # Create session in window for testing computed fields in API response
        res = api_client.post("/api/v1/feedback/", {
            "session": d["session_past_acct"].id,
            "understanding_rating": 4,
            "needs_help": False,
        })
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["understanding_rating"] == 4
        assert res.data["percentage"] == 80
        assert res.data["band"] == BAND_61_80
        assert res.data["topic_title"] == "Ledger Posting"

    def test_unenrolled_student_cannot_submit_feedback(self, api_client, feedback_setup_data):
        """Student of batch 43 cannot submit feedback for batch 42 session (HTTP 403)."""
        d = feedback_setup_data
        api_client.force_authenticate(user=d["u_s4"])  # enrolled in batch 43
        res = api_client.post("/api/v1/feedback/", {
            "session": d["session_past_acct"].id,  # batch 42 session
            "understanding_rating": 5,
        })
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_wrong_audience_student_cannot_submit_feedback(self, api_client, feedback_setup_data):
        """General student rejected from madrasa session; Madrasa student rejected from general session."""
        d = feedback_setup_data

        # S1 (General) submitting for Madrasa-only session
        api_client.force_authenticate(user=d["u_s1"])
        res_gen_on_mad = api_client.post("/api/v1/feedback/", {
            "session": d["session_past_isl_mad"].id,
            "understanding_rating": 4,
        })
        assert res_gen_on_mad.status_code == status.HTTP_403_FORBIDDEN

        # S2 (Aliya) submitting for General-only session
        api_client.force_authenticate(user=d["u_s2"])
        res_mad_on_gen = api_client.post("/api/v1/feedback/", {
            "session": d["session_past_isl_gen"].id,
            "understanding_rating": 4,
        })
        assert res_mad_on_gen.status_code == status.HTTP_403_FORBIDDEN

        # S2 (Aliya) submitting for Madrasa session -> Allowed!
        res_mad_on_mad = api_client.post("/api/v1/feedback/", {
            "session": d["session_past_isl_mad"].id,
            "understanding_rating": 5,
        })
        assert res_mad_on_mad.status_code == status.HTTP_201_CREATED

    def test_feedback_on_draft_or_cancelled_session_rejected(self, api_client, feedback_setup_data):
        """Draft or cancelled sessions reject feedback submissions with HTTP 400."""
        d = feedback_setup_data
        api_client.force_authenticate(user=d["u_s1"])

        # Draft
        res_draft = api_client.post("/api/v1/feedback/", {
            "session": d["session_draft"].id,
            "understanding_rating": 4,
        })
        assert res_draft.status_code == status.HTTP_400_BAD_REQUEST

        # Cancelled
        res_cancelled = api_client.post("/api/v1/feedback/", {
            "session": d["session_cancelled"].id,
            "understanding_rating": 4,
        })
        assert res_cancelled.status_code == status.HTTP_400_BAD_REQUEST

    def test_feedback_timing_window_enforcement_in_asia_dhaka(self, api_client, feedback_setup_data):
        """
        Tests feedback timing window in Asia/Dhaka:
        - Before end_time: rejected (HTTP 400)
        - Right after end_time: accepted (HTTP 201)
        - After 24h window closes: rejected (HTTP 400)
        """
        d = feedback_setup_data
        tz = d["dhaka_tz"]
        session = d["session_past_acct"]  # end_time = 11:30

        end_dt = datetime.datetime.combine(session.session_date, session.end_time, tzinfo=tz)

        api_client.force_authenticate(user=d["u_s1"])

        # 1. Before session end (e.g. 5 minutes before end_time)
        before_end = end_dt - datetime.timedelta(minutes=5)
        with patch("apps.feedback.views.timezone.now", return_value=before_end):
            res_before = api_client.post("/api/v1/feedback/", {
                "session": session.id,
                "understanding_rating": 4,
            })
            assert res_before.status_code == status.HTTP_400_BAD_REQUEST
            assert "opens only after the session ends" in str(res_before.data)

        # 2. Within window (e.g. 10 minutes after end_time)
        within_window = end_dt + datetime.timedelta(minutes=10)
        with patch("apps.feedback.views.timezone.now", return_value=within_window):
            res_within = api_client.post("/api/v1/feedback/", {
                "session": session.id,
                "understanding_rating": 4,
            })
            assert res_within.status_code == status.HTTP_201_CREATED

        # 3. After window closes (e.g. 24 hours + 5 minutes after end_time)
        # S2 attempts on Islamic Madrasa session after 25h
        mad_session = d["session_past_isl_mad"]
        mad_end_dt = datetime.datetime.combine(mad_session.session_date, mad_session.end_time, tzinfo=tz)
        after_window = mad_end_dt + datetime.timedelta(hours=25)
        api_client.force_authenticate(user=d["u_s2"])
        with patch("apps.feedback.views.timezone.now", return_value=after_window):
            res_after = api_client.post("/api/v1/feedback/", {
                "session": mad_session.id,
                "understanding_rating": 4,
            })
            assert res_after.status_code == status.HTTP_400_BAD_REQUEST
            assert "window has closed" in str(res_after.data)

    def test_duplicate_feedback_rejected_with_409(self, api_client, feedback_setup_data):
        """Second feedback submission by same student for same session returns HTTP 409 Conflict."""
        d = feedback_setup_data
        api_client.force_authenticate(user=d["u_s1"])
        session = d["session_past_acct"]

        # First submission
        res1 = api_client.post("/api/v1/feedback/", {
            "session": session.id,
            "understanding_rating": 4,
        })
        assert res1.status_code == status.HTTP_201_CREATED

        # Duplicate submission without client_submission_id
        res2 = api_client.post("/api/v1/feedback/", {
            "session": session.id,
            "understanding_rating": 5,
        })
        assert res2.status_code == status.HTTP_409_CONFLICT
        assert res2.data["code"] == "ALREADY_SUBMITTED"

    def test_safe_idempotency_client_submission_id_returns_200_same_student_and_session(
        self, api_client, feedback_setup_data
    ):
        """
        User Change 2: Duplicate client_submission_id returns HTTP 200 with original object
        if from same student and same session.
        """
        d = feedback_setup_data
        api_client.force_authenticate(user=d["u_s1"])
        session = d["session_past_acct"]
        sub_uuid = str(uuid.uuid4())

        # First attempt -> 201 Created
        res1 = api_client.post("/api/v1/feedback/", {
            "session": session.id,
            "understanding_rating": 4,
            "client_submission_id": sub_uuid,
            "student_comment": "First try",
        })
        assert res1.status_code == status.HTTP_201_CREATED
        original_id = res1.data["id"]

        # Retry with identical client_submission_id -> 200 OK with original data
        res2 = api_client.post("/api/v1/feedback/", {
            "session": session.id,
            "understanding_rating": 5,  # even if changed, original is returned
            "client_submission_id": sub_uuid,
            "student_comment": "Retry attempt",
        })
        assert res2.status_code == status.HTTP_200_OK
        assert res2.data["id"] == original_id
        assert res2.data["understanding_rating"] == 4
        assert res2.data["student_comment"] == "First try"

    def test_client_submission_id_collision_different_student_rejected_without_leak(
        self, api_client, feedback_setup_data
    ):
        """
        User Change 2: Duplicate client_submission_id from another student is rejected
        with HTTP 400 without leaking data.
        """
        d = feedback_setup_data
        session = d["session_past_acct"]
        sub_uuid = str(uuid.uuid4())

        # S1 submits with UUID
        api_client.force_authenticate(user=d["u_s1"])
        res1 = api_client.post("/api/v1/feedback/", {
            "session": session.id,
            "understanding_rating": 4,
            "client_submission_id": sub_uuid,
        })
        assert res1.status_code == status.HTTP_201_CREATED

        # S2 attempts submission with same UUID
        api_client.force_authenticate(user=d["u_s2"])
        res2 = api_client.post("/api/v1/feedback/", {
            "session": session.id,
            "understanding_rating": 3,
            "client_submission_id": sub_uuid,
        })
        assert res2.status_code == status.HTTP_400_BAD_REQUEST
        assert "client_submission_id" in res2.data
        # Ensure no feedback data of S1 is leaked
        assert "First try" not in str(res2.data)
        assert res1.data["id"] != res2.data

    def test_needs_help_true_creates_atomic_help_request_and_copies_comment(
        self, api_client, feedback_setup_data
    ):
        """
        User Change 3: When needs_help=True, creates atomic HelpRequest and copies student_comment
        into HelpRequest.student_message.
        """
        d = feedback_setup_data
        api_client.force_authenticate(user=d["u_s1"])
        session = d["session_past_acct"]

        res = api_client.post("/api/v1/feedback/", {
            "session": session.id,
            "understanding_rating": 2,
            "needs_help": True,
            "student_comment": "I am struggling with debit credit rules.",
        })
        assert res.status_code == status.HTTP_201_CREATED
        fb_id = res.data["id"]
        hr_id = res.data["help_request_id"]
        assert hr_id is not None

        hr = HelpRequest.objects.get(pk=hr_id)
        assert hr.feedback_id == fb_id
        assert hr.student == d["s1"]
        assert hr.teacher_user == session.teacher_user
        assert hr.session == session
        assert hr.topic == session.topic
        assert hr.student_message == "I am struggling with debit credit rules."
        assert hr.status == HelpRequestStatus.PENDING

    def test_needs_help_false_creates_no_help_request(self, api_client, feedback_setup_data):
        """When needs_help=False, feedback is created but NO HelpRequest row is created."""
        d = feedback_setup_data
        api_client.force_authenticate(user=d["u_s1"])
        session = d["session_past_acct"]

        res = api_client.post("/api/v1/feedback/", {
            "session": session.id,
            "understanding_rating": 5,
            "needs_help": False,
            "student_comment": "Clear lesson.",
        })
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["help_request_id"] is None
        assert HelpRequest.objects.filter(student=d["s1"]).count() == 0

    def test_needs_help_true_rollback_on_failure(self, api_client, feedback_setup_data):
        """If HelpRequest creation encounters an error, the entire atomic transaction rolls back."""
        d = feedback_setup_data
        api_client.force_authenticate(user=d["u_s1"])
        session = d["session_past_acct"]

        with patch("apps.feedback.views.HelpRequest.objects.create", side_effect=RuntimeError("DB Error")):
            with pytest.raises(RuntimeError):
                api_client.post("/api/v1/feedback/", {
                    "session": session.id,
                    "understanding_rating": 1,
                    "needs_help": True,
                    "student_comment": "Help needed",
                })

        # Ensure LearningFeedback was rolled back and not persisted
        assert LearningFeedback.objects.filter(session=session, student=d["s1"]).count() == 0

    def test_help_request_forward_only_lifecycle_rejects_backward_or_skips(
        self, api_client, feedback_setup_data
    ):
        """
        Forward-only lifecycle: pending -> in_progress -> resolved.
        Direct pending -> resolved is rejected.
        Backwards transitions (resolved -> in_progress) are rejected.
        """
        d = feedback_setup_data
        session = d["session_past_acct"]

        # Create help request
        fb = LearningFeedback.objects.create(
            session=session,
            student=d["s1"],
            topic=session.topic,
            understanding_rating=2,
            needs_help=True,
            student_comment="Stuck on assignment.",
        )
        hr = HelpRequest.objects.create(
            feedback=fb,
            student=d["s1"],
            teacher_user=session.teacher_user,
            session=session,
            topic=session.topic,
            student_message=fb.student_comment,
            status=HelpRequestStatus.PENDING,
        )

        teacher_client = APIClient()
        teacher_client.force_authenticate(user=d["teacher1_user"])

        # Attempt illegal skip: pending -> resolved directly
        res_skip = teacher_client.post(f"/api/v1/help-requests/{hr.id}/resolve/", {
            "teacher_note": "Skipping to resolved",
        })
        assert res_skip.status_code == status.HTTP_400_BAD_REQUEST

        # Valid transition: pending -> in_progress
        res_start = teacher_client.post(f"/api/v1/help-requests/{hr.id}/start/")
        assert res_start.status_code == status.HTTP_200_OK
        hr.refresh_from_db()
        assert hr.status == HelpRequestStatus.IN_PROGRESS
        assert hr.in_progress_at is not None

        # Valid transition: in_progress -> resolved
        res_res = teacher_client.post(f"/api/v1/help-requests/{hr.id}/resolve/", {
            "teacher_note": "Explained ledger balance after Maghrib.",
        })
        assert res_res.status_code == status.HTTP_200_OK
        hr.refresh_from_db()
        assert hr.status == HelpRequestStatus.RESOLVED
        assert hr.resolved_at is not None
        assert hr.resolved_by == d["teacher1_user"]
        assert hr.teacher_note == "Explained ledger balance after Maghrib."

        # Attempt illegal backward transition: resolved -> in_progress
        res_back = teacher_client.post(f"/api/v1/help-requests/{hr.id}/start/")
        assert res_back.status_code == status.HTTP_400_BAD_REQUEST

    def test_unassigned_teacher_cannot_access_or_update_help_request(
        self, api_client, feedback_setup_data
    ):
        """Teacher 2 (not assigned to session) receives HTTP 403 trying to start/resolve Teacher 1's request."""
        d = feedback_setup_data
        session = d["session_past_acct"]  # teacher1_user is teacher

        fb = LearningFeedback.objects.create(
            session=session,
            student=d["s1"],
            topic=session.topic,
            understanding_rating=2,
            needs_help=True,
        )
        hr = HelpRequest.objects.create(
            feedback=fb,
            student=d["s1"],
            teacher_user=session.teacher_user,
            session=session,
            topic=session.topic,
            status=HelpRequestStatus.PENDING,
        )

        # Teacher 2 tries to start
        api_client.force_authenticate(user=d["teacher2_user"])
        res_t2 = api_client.post(f"/api/v1/help-requests/{hr.id}/start/")
        assert res_t2.status_code == status.HTTP_403_FORBIDDEN

    def test_student_sees_only_own_help_requests_and_cannot_read_peer_feedback(
        self, api_client, feedback_setup_data
    ):
        """Student A sees only their own help requests and receives HTTP 403 on session feedbacks."""
        d = feedback_setup_data
        session = d["session_past_acct"]

        # HR for Student 1
        fb1 = LearningFeedback.objects.create(
            session=session, student=d["s1"], topic=session.topic, understanding_rating=2, needs_help=True
        )
        hr1 = HelpRequest.objects.create(
            feedback=fb1,
            student=d["s1"],
            teacher_user=session.teacher_user,
            session=session,
            topic=session.topic,
            status=HelpRequestStatus.PENDING,
        )

        # HR for Student 2
        fb2 = LearningFeedback.objects.create(
            session=session, student=d["s2"], topic=session.topic, understanding_rating=1, needs_help=True
        )
        hr2 = HelpRequest.objects.create(
            feedback=fb2,
            student=d["s2"],
            teacher_user=session.teacher_user,
            session=session,
            topic=session.topic,
            status=HelpRequestStatus.PENDING,
        )

        # Student 1 lists help requests
        api_client.force_authenticate(user=d["u_s1"])
        res_list = api_client.get("/api/v1/help-requests/")
        assert res_list.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in res_list.data["results"] if "results" in res_list.data] if isinstance(res_list.data, dict) and "results" in res_list.data else [item["id"] for item in res_list.data]
        assert hr1.id in ids
        assert hr2.id not in ids

        # Student 1 cannot view session feedbacks endpoint
        res_peer_fb = api_client.get(f"/api/v1/class-sessions/{session.id}/feedbacks/")
        assert res_peer_fb.status_code == status.HTTP_403_FORBIDDEN

    def test_feedback_summary_audience_aware_pending_calculation(
        self, api_client, feedback_setup_data
    ):
        """
        User Change 1: In GET feedback-summary, pending count only considers active students
        matching the session's audience.
        """
        d = feedback_setup_data
        session_mad = d["session_past_isl_mad"]  # Audience = MADRASA

        # Eligible students in Batch 42 with MADRASA background: S2 (Aliya), S3 (Qawmi) -> Total 2!
        # S1 (General) is NOT eligible for MADRASA session.

        # S2 submits feedback
        LearningFeedback.objects.create(
            session=session_mad,
            student=d["s2"],
            topic=session_mad.topic,
            understanding_rating=4,
            needs_help=False,
        )

        # Teacher 2 checks summary
        api_client.force_authenticate(user=d["teacher2_user"])
        res = api_client.get(f"/api/v1/class-sessions/{session_mad.id}/feedback-summary/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["total_enrolled"] == 2  # Only S2 and S3!
        assert res.data["submitted_count"] == 1
        assert res.data["pending_count"] == 1  # Exactly S3 pending!
        assert res.data["average_rating"] == 4.0
        assert res.data["average_percentage"] == 80.0
        assert res.data["band_distribution"][BAND_61_80] == 1

    def test_observer_restricted_to_aggregates_and_forbidden_on_individual_endpoints(
        self, api_client, feedback_setup_data
    ):
        """
        User Change 4: Observer may access ONLY aggregate endpoints (feedback-summary & topic understanding).
        Must receive HTTP 403 on individual endpoints (feedbacks, help-requests, students/{id}/progress).
        """
        d = feedback_setup_data
        session = d["session_past_acct"]
        topic = d["topic_acct"]
        student = d["s1"]

        fb = LearningFeedback.objects.create(
            session=session, student=student, topic=topic, understanding_rating=3
        )
        hr = HelpRequest.objects.create(
            feedback=fb,
            student=student,
            teacher_user=session.teacher_user,
            session=session,
            topic=topic,
            status=HelpRequestStatus.PENDING,
        )

        api_client.force_authenticate(user=d["observer_user"])

        # 1. Allowed Aggregates -> HTTP 200
        res_sum = api_client.get(f"/api/v1/class-sessions/{session.id}/feedback-summary/")
        assert res_sum.status_code == status.HTTP_200_OK

        res_und = api_client.get(f"/api/v1/topics/{topic.id}/understanding/?batch={d['batch42'].id}")
        assert res_und.status_code == status.HTTP_200_OK

        # 2. Forbidden Individual Endpoints -> HTTP 403
        res_fb_list = api_client.get(f"/api/v1/class-sessions/{session.id}/feedbacks/")
        assert res_fb_list.status_code == status.HTTP_403_FORBIDDEN

        res_hr_list = api_client.get("/api/v1/help-requests/")
        assert res_hr_list.status_code == status.HTTP_403_FORBIDDEN

        res_hr_detail = api_client.get(f"/api/v1/help-requests/{hr.id}/")
        assert res_hr_detail.status_code == status.HTTP_403_FORBIDDEN

        res_prog = api_client.get(f"/api/v1/students/{student.id}/progress/")
        assert res_prog.status_code == status.HTTP_403_FORBIDDEN

    def test_coordinator_cannot_see_feedback_of_other_courses(
        self, api_client, feedback_setup_data
    ):
        """Coordinator 2 (assigned only to Course 2) cannot access Course 1's feedback or help requests."""
        d = feedback_setup_data
        session = d["session_past_acct"]  # Course 1

        api_client.force_authenticate(user=d["coord2_user"])
        res_sum = api_client.get(f"/api/v1/class-sessions/{session.id}/feedback-summary/")
        assert res_sum.status_code == status.HTTP_403_FORBIDDEN

        res_fb = api_client.get(f"/api/v1/class-sessions/{session.id}/feedbacks/")
        assert res_fb.status_code == status.HTTP_403_FORBIDDEN

    def test_resolving_help_request_writes_audit_log(self, api_client, feedback_setup_data):
        """Resolving a help request must write an AuditLog entry with actor, old and new values."""
        d = feedback_setup_data
        session = d["session_past_acct"]

        fb = LearningFeedback.objects.create(
            session=session, student=d["s1"], topic=session.topic, understanding_rating=2, needs_help=True
        )
        hr = HelpRequest.objects.create(
            feedback=fb,
            student=d["s1"],
            teacher_user=session.teacher_user,
            session=session,
            topic=session.topic,
            status=HelpRequestStatus.IN_PROGRESS,
        )

        teacher_client = APIClient()
        teacher_client.force_authenticate(user=d["teacher1_user"])

        res = teacher_client.post(f"/api/v1/help-requests/{hr.id}/resolve/", {
            "teacher_note": "Resolved during tutorial hour.",
        })
        assert res.status_code == status.HTTP_200_OK

        audit = AuditLog.objects.filter(
            action="RESOLVE_HELP_REQUEST",
            entity_name="HelpRequest",
            entity_id=str(hr.id),
        ).first()
        assert audit is not None
        assert audit.actor_user == d["teacher1_user"]
        assert audit.old_values["status"] == HelpRequestStatus.IN_PROGRESS
        assert audit.new_values["status"] == HelpRequestStatus.RESOLVED
        assert audit.new_values["teacher_note"] == "Resolved during tutorial hour."

    def test_topic_understanding_band_distribution_and_scoping(
        self, api_client, feedback_setup_data
    ):
        """
        User Change 5: GET /topics/{id}/understanding/?batch={batch_id}
        Computes band distribution, average, and enforces role scoping.
        """
        d = feedback_setup_data
        topic = d["topic_acct"]
        batch = d["batch42"]
        session = d["session_past_acct"]

        # Create feedbacks with different ratings
        LearningFeedback.objects.create(session=session, student=d["s1"], topic=topic, understanding_rating=5)
        LearningFeedback.objects.create(session=session, student=d["s2"], topic=topic, understanding_rating=4)
        LearningFeedback.objects.create(session=session, student=d["s3"], topic=topic, understanding_rating=2)

        # Teacher 1 assigned to this subject/batch -> 200 OK
        api_client.force_authenticate(user=d["teacher1_user"])
        res = api_client.get(f"/api/v1/topics/{topic.id}/understanding/?batch={batch.id}")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["topic_id"] == topic.id
        assert res.data["total_feedbacks"] == 3
        # avg = (5 + 4 + 2) / 3 = 3.67, pct = 73.4
        assert res.data["average_rating"] == 3.67
        assert res.data["average_percentage"] == 73.4
        assert res.data["band_distribution"][BAND_81_100] == 1
        assert res.data["band_distribution"][BAND_61_80] == 1
        assert res.data["band_distribution"][BAND_21_40] == 1

        # Teacher 2 (not assigned to this subject in batch 42) -> 403 Forbidden
        api_client.force_authenticate(user=d["teacher2_user"])
        res_t2 = api_client.get(f"/api/v1/topics/{topic.id}/understanding/?batch={batch.id}")
        assert res_t2.status_code == status.HTTP_403_FORBIDDEN

        # Student -> 403 Forbidden
        api_client.force_authenticate(user=d["u_s1"])
        res_stud = api_client.get(f"/api/v1/topics/{topic.id}/understanding/?batch={batch.id}")
        assert res_stud.status_code == status.HTTP_403_FORBIDDEN

    def test_student_progress_metrics_calculation_and_scoping(
        self, api_client, feedback_setup_data
    ):
        """
        User Change 5: GET /students/{id}/progress/ and /students/me/progress/
        Computes 7-day, 30-day windows in Asia/Dhaka and identifies low rating topics.
        """
        d = feedback_setup_data
        student = d["s1"]
        session = d["session_past_acct"]
        topic = d["topic_acct"]

        # Feedbacks: one with rating 2 (low), one with rating 5
        fb1 = LearningFeedback.objects.create(
            session=session, student=student, topic=topic, understanding_rating=2, needs_help=True
        )
        HelpRequest.objects.create(
            feedback=fb1,
            student=student,
            teacher_user=session.teacher_user,
            session=session,
            topic=topic,
            status=HelpRequestStatus.PENDING,
        )

        # Authenticate as student himself -> /me/progress/
        api_client.force_authenticate(user=d["u_s1"])
        res_me = api_client.get("/api/v1/students/me/progress/")
        assert res_me.status_code == status.HTTP_200_OK
        assert res_me.data["student_id"] == student.id
        assert res_me.data["total_feedbacks"] == 1
        assert res_me.data["last_7_days_avg_rating"] == 2.0
        assert res_me.data["total_help_requests"] == 1
        assert res_me.data["resolved_help_requests"] == 0
        assert len(res_me.data["topics_with_low_ratings"]) == 1
        assert res_me.data["topics_with_low_ratings"][0]["topic_id"] == topic.id

        # Student cannot view peer's progress -> 403 Forbidden
        res_peer = api_client.get(f"/api/v1/students/{d['s2'].id}/progress/")
        assert res_peer.status_code == status.HTTP_403_FORBIDDEN

        # Teacher assigned to batch 42 can view S1's progress -> 200 OK
        api_client.force_authenticate(user=d["teacher1_user"])
        res_teacher = api_client.get(f"/api/v1/students/{student.id}/progress/")
        assert res_teacher.status_code == status.HTTP_200_OK
        assert res_teacher.data["student_id"] == student.id

        # Teacher 2 not teaching S4 (batch 43 teacher, but let's check Batch 99 student if any, or coord2)
        api_client.force_authenticate(user=d["coord2_user"])
        res_c2 = api_client.get(f"/api/v1/students/{student.id}/progress/")
        assert res_c2.status_code == status.HTTP_403_FORBIDDEN
