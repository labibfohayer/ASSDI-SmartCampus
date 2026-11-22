import datetime
import pytest
from rest_framework import status
from apps.academic.models import Campus, Course, Subject
from apps.batches.models import Batch, BatchStatus, TeacherAssignment
from apps.class_sessions.models import ClassSession, ClassTopic, SessionAudience, SessionStatus
from apps.attendance.models import AttendanceRecord, AttendanceStatus
from apps.feedback.models import LearningFeedback, HelpRequest, HelpRequestStatus
from apps.students.models import EducationBackground, Enrollment, EnrollmentStatus, Student, StudentStatus


@pytest.fixture
def graduation_academic_setup(db, teacher_user):
    course = Course.objects.create(name="Small Business Management Course", code="SBMC")
    campus = Campus.objects.create(name="Kazi Bari Campus", code="KBC")
    batch = Batch.objects.create(
        name="SBMC Batch 42",
        batch_number=42,
        start_date=datetime.date(2026, 8, 16),
        end_date=datetime.date(2026, 11, 15),
        status=BatchStatus.ACTIVE,
        course=course,
        campus=campus,
    )
    subject = Subject.objects.create(
        course=course,
        name="Islamic Business Ethics",
        code="IBE-101",
        audience_type=SessionAudience.ALL,
    )
    topic = ClassTopic.objects.create(
        subject=subject,
        title="Halal Trade Principles",
    )
    TeacherAssignment.objects.create(
        batch=batch,
        subject=subject,
        teacher_user=teacher_user,
    )
    session = ClassSession.objects.create(
        batch=batch,
        subject=subject,
        topic=topic,
        teacher_user=teacher_user,
        session_date=datetime.date(2026, 11, 22),
        start_time=datetime.time(9, 0),
        end_time=datetime.time(11, 0),
        audience=SessionAudience.ALL,
        status=SessionStatus.PUBLISHED,
    )
    return {
        "course": course,
        "campus": campus,
        "batch": batch,
        "subject": subject,
        "topic": topic,
        "session": session,
    }


@pytest.fixture
def graduation_student_profile(db, student_user, graduation_academic_setup):
    std = Student.objects.create(
        user=student_user,
        student_id_number="STD-2026-042-001",
        registration_no="REG-2026-001",
        campus=graduation_academic_setup["campus"],
        education_background=EducationBackground.GENERAL,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(
        student=std,
        batch=graduation_academic_setup["batch"],
        status=EnrollmentStatus.ACTIVE,
    )
    return std


@pytest.mark.django_db
class TestGraduationEligibility:
    def test_student_can_fetch_own_graduation_eligibility(
        self, api_client, student_user, graduation_student_profile, graduation_academic_setup
    ):
        api_client.force_authenticate(user=student_user)
        # Create an attendance record
        AttendanceRecord.objects.create(
            student=graduation_student_profile,
            session=graduation_academic_setup["session"],
            status=AttendanceStatus.PRESENT,
        )

        response = api_client.get("/api/v1/students/me/graduation-eligibility/")
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["student_name"] == student_user.full_name
        assert data["attendance_percentage"] == 100.0
        assert data["attendance_eligible"] is True
        assert "criteria_checklist" in data
        assert len(data["criteria_checklist"]) == 4
        assert "certificate_info" in data
        assert "ASSDI-SBMC" in data["certificate_info"]["certificate_no"]

    def test_help_request_eligibility_enforcement(
        self, api_client, student_user, graduation_student_profile, graduation_academic_setup
    ):
        api_client.force_authenticate(user=student_user)
        # Add feedback with help request
        fb = LearningFeedback.objects.create(
            session=graduation_academic_setup["session"],
            student=graduation_student_profile,
            topic=graduation_academic_setup["topic"],
            understanding_rating=2,
            needs_help=True,
            student_comment="Struggling with ledger entries.",
        )
        hr = HelpRequest.objects.create(
            feedback=fb,
            student=graduation_student_profile,
            teacher_user=graduation_academic_setup["session"].teacher_user,
            session=graduation_academic_setup["session"],
            topic=graduation_academic_setup["topic"],
            student_message="Struggling with ledger entries.",
            status=HelpRequestStatus.PENDING,
        )

        res = api_client.get("/api/v1/students/me/graduation-eligibility/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["help_requests_eligible"] is False
        assert res.data["is_eligible"] is False
        assert res.data["pending_help_requests"] == 1

        # Resolve the help request
        hr.status = HelpRequestStatus.RESOLVED
        hr.teacher_note = "Explained in 1-on-1 session."
        hr.save()

        res2 = api_client.get("/api/v1/students/me/graduation-eligibility/")
        assert res2.status_code == status.HTTP_200_OK
        assert res2.data["help_requests_eligible"] is True
        assert res2.data["pending_help_requests"] == 0

    def test_student_cannot_view_peer_graduation_eligibility(
        self, api_client, student_user, graduation_student_profile, graduation_academic_setup
    ):
        from apps.accounts.models import User, UserRole
        other_user = User.objects.create_user(
            login_id="STD-OTHER-999",
            role=UserRole.STUDENT,
            password="Password123!",
        )
        other_std = Student.objects.create(
            user=other_user,
            student_id_number="STD-OTHER-999",
            registration_no="REG-999",
            campus=graduation_academic_setup["campus"],
            education_background=EducationBackground.GENERAL,
        )

        api_client.force_authenticate(user=student_user)
        response = api_client.get(f"/api/v1/students/{other_std.id}/graduation-eligibility/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_teacher_and_superadmin_can_view_student_graduation_eligibility(
        self, api_client, teacher_user, super_admin_user, graduation_student_profile
    ):
        # 1. Super Admin access
        api_client.force_authenticate(user=super_admin_user)
        res_admin = api_client.get(f"/api/v1/students/{graduation_student_profile.id}/graduation-eligibility/")
        assert res_admin.status_code == status.HTTP_200_OK
        assert res_admin.data["student_id"] == graduation_student_profile.id
        assert "overall_readiness_score" in res_admin.data

        # 2. Assigned Teacher access
        api_client.force_authenticate(user=teacher_user)
        res_teacher = api_client.get(f"/api/v1/students/{graduation_student_profile.id}/graduation-eligibility/")
        assert res_teacher.status_code == status.HTTP_200_OK
        assert res_teacher.data["student_id"] == graduation_student_profile.id

