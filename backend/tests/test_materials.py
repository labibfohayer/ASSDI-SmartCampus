import pytest
from datetime import date, time
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from apps.academic.models import Campus, Course, Subject
from apps.batches.models import Batch, BatchStatus, TeacherAssignment
from apps.accounts.models import UserRole
from apps.class_sessions.models import ClassSession, MaterialType, SessionAudience, SessionMaterial, SessionStatus
from apps.students.models import EducationBackground, Enrollment, EnrollmentStatus, Student, StudentStatus


@pytest.fixture
def academic_setup(db, teacher_user):
    course = Course.objects.create(name="Small Business Management Course", code="SBMC")
    campus = Campus.objects.create(name="Kazi Bari Campus", code="KBC")
    batch = Batch.objects.create(
        name="SBMC Batch 42",
        batch_number=42,
        start_date=date(2026, 8, 16),
        end_date=date(2026, 11, 15),
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
    TeacherAssignment.objects.create(
        batch=batch,
        subject=subject,
        teacher_user=teacher_user,
    )
    session = ClassSession.objects.create(
        batch=batch,
        subject=subject,
        teacher_user=teacher_user,
        session_date=date(2026, 11, 22),
        start_time=time(9, 0),
        end_time=time(11, 0),
        audience=SessionAudience.ALL,
        status=SessionStatus.PUBLISHED,
    )
    return {
        "course": course,
        "campus": campus,
        "batch": batch,
        "subject": subject,
        "session": session,
    }


@pytest.fixture
def student_profile(db, student_user, academic_setup):
    std = Student.objects.create(
        user=student_user,
        student_id_number="STD-2026-042-001",
        registration_no="REG-2026-001",
        campus=academic_setup["campus"],
        education_background=EducationBackground.GENERAL,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(
        student=std,
        batch=academic_setup["batch"],
        status=EnrollmentStatus.ACTIVE,
    )
    return std


@pytest.fixture
def sample_material(db, academic_setup, teacher_user):
    dummy_pdf = SimpleUploadedFile("test_handout.pdf", b"%PDF-1.4 test pdf content", content_type="application/pdf")
    return SessionMaterial.objects.create(
        session=academic_setup["session"],
        subject=academic_setup["subject"],
        title="Halal Trade & Islamic Principles Handout",
        description="Comprehensive summary of Islamic business rules.",
        key_takeaways=["Truthfulness in weights", "Prohibition of Riba", "Transparent contracts"],
        hadith_or_ethics_ref="The honest and trustworthy merchant will be with the prophets.",
        material_type=MaterialType.HANDOUT,
        file=dummy_pdf,
        file_size_bytes=len(b"%PDF-1.4 test pdf content"),
        uploaded_by=teacher_user,
    )


@pytest.mark.django_db
class TestSessionMaterials:
    def test_admin_can_list_all_materials(self, api_client, super_admin_user, sample_material):
        api_client.force_authenticate(user=super_admin_user)
        response = api_client.get("/api/v1/session-materials/")
        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"] if "results" in response.data else response.data
        assert len(results) >= 1
        assert any(m["id"] == sample_material.id for m in results)

    def test_student_can_list_enrolled_materials(self, api_client, student_user, student_profile, sample_material):
        api_client.force_authenticate(user=student_user)
        response = api_client.get("/api/v1/session-materials/")
        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"] if "results" in response.data else response.data
        assert len(results) >= 1
        item = next(m for m in results if m["id"] == sample_material.id)
        assert item["title"] == sample_material.title
        assert item["subject_name"] == sample_material.subject.name
        assert len(item["key_takeaways"]) == 3

    def test_class_session_materials_endpoint(self, api_client, student_user, student_profile, academic_setup, sample_material):
        api_client.force_authenticate(user=student_user)
        session_id = academic_setup["session"].id
        response = api_client.get(f"/api/v1/class-sessions/{session_id}/materials/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert response.data[0]["id"] == sample_material.id
        assert response.data[0]["material_type"] == MaterialType.HANDOUT

    def test_material_download_action_and_counter(self, api_client, student_user, student_profile, sample_material):
        api_client.force_authenticate(user=student_user)
        initial_downloads = sample_material.download_count
        response = api_client.get(f"/api/v1/session-materials/{sample_material.id}/download/")
        assert response.status_code == status.HTTP_200_OK
        assert response.headers["Content-Type"] == "application/pdf"
        assert "attachment" in response.headers["Content-Disposition"]

        sample_material.refresh_from_db()
        assert sample_material.download_count == initial_downloads + 1

    def test_student_cannot_download_unauthorized_material(self, api_client, student_user, student_profile, teacher_user):
        # Create another course/batch material that student is not enrolled in
        other_course = Course.objects.create(name="Other Course", code="OTHER")
        other_subject = Subject.objects.create(course=other_course, name="Other Subject", code="OTH-101")
        other_material = SessionMaterial.objects.create(
            subject=other_subject,
            title="Unauthorized Other Course Material",
            material_type=MaterialType.HANDOUT,
            uploaded_by=teacher_user,
        )

        api_client.force_authenticate(user=student_user)
        response = api_client.get(f"/api/v1/session-materials/{other_material.id}/download/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_student_cannot_upload_materials(self, api_client, student_user, student_profile, academic_setup):
        api_client.force_authenticate(user=student_user)
        payload = {
            "session": academic_setup["session"].id,
            "subject": academic_setup["subject"].id,
            "title": "Hacked Student Upload",
            "material_type": MaterialType.HANDOUT,
        }
        response = api_client.post("/api/v1/session-materials/", payload)
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST]
