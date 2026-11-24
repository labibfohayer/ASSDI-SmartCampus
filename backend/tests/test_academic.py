import pytest
from django.core.management import call_command
from django.db import IntegrityError
from django.urls import reverse
from rest_framework import status

from apps.academic.models import (
    Campus,
    CoordinatorCourseAssignment,
    Course,
    Department,
    Subject,
    ClassTopic,
)
from apps.accounts.models import User, UserRole
from apps.batches.models import Batch, BatchStatus, TeacherAssignment
from apps.students.models import (
    EducationBackground,
    Enrollment,
    EnrollmentStatus,
    Student,
    StudentStatus,
)


@pytest.fixture
def academic_setup(db):
    """Basic academic setup with two courses, two campuses and multiple batches."""
    campus_dhaka = Campus.objects.create(
        name="Kazi Bari Campus", code="KBC-DHAKA", gender_campus="male", address="North Badda, Dhaka"
    )
    campus_ctg = Campus.objects.create(
        name="Chittagong Campus", code="CTG-01", gender_campus="male", address="Agrabad, Chittagong"
    )

    course_sbmc = Course.objects.create(
        name="Small Business Management Course", code="SBMC", duration_months=3
    )
    course_it = Course.objects.create(
        name="IT Professional Course", code="ITPC", duration_months=6
    )

    batch_sbmc_42 = Batch.objects.create(
        course=course_sbmc, campus=campus_dhaka, batch_number=42, name="SBMC Batch 42",
        start_date="2026-11-01", end_date="2027-01-31", status=BatchStatus.ACTIVE
    )
    batch_sbmc_43 = Batch.objects.create(
        course=course_sbmc, campus=campus_dhaka, batch_number=43, name="SBMC Batch 43",
        start_date="2026-12-01", end_date="2027-02-28", status=BatchStatus.ACTIVE
    )
    batch_it_1 = Batch.objects.create(
        course=course_it, campus=campus_ctg, batch_number=1, name="IT Batch 1",
        start_date="2026-11-01", end_date="2027-04-30", status=BatchStatus.ACTIVE
    )

    subject_marketing = Subject.objects.create(course=course_sbmc, name="Meta Marketing", code="MKTG")
    subject_it = Subject.objects.create(course=course_it, name="Python Programming", code="PY-101")

    # Users
    coord_sbmc = User.objects.create_user(
        login_id="coord_sbmc", full_name="Coord SBMC", role=UserRole.COORDINATOR, password="Pass!"
    )
    CoordinatorCourseAssignment.objects.create(user=coord_sbmc, course=course_sbmc)

    coord_it = User.objects.create_user(
        login_id="coord_it", full_name="Coord IT", role=UserRole.COORDINATOR, password="Pass!"
    )
    CoordinatorCourseAssignment.objects.create(user=coord_it, course=course_it)

    teacher_1 = User.objects.create_user(
        login_id="teacher_1", full_name="Teacher One", role=UserRole.TEACHER, password="Pass!"
    )
    teacher_2 = User.objects.create_user(
        login_id="teacher_2", full_name="Teacher Two", role=UserRole.TEACHER, password="Pass!"
    )

    TeacherAssignment.objects.create(batch=batch_sbmc_42, subject=subject_marketing, teacher_user=teacher_1)
    TeacherAssignment.objects.create(batch=batch_sbmc_43, subject=subject_marketing, teacher_user=teacher_2)

    # Students
    u_std1 = User.objects.create_user(
        login_id="STD-42-001", full_name="Student One", role=UserRole.STUDENT,
        email="s1@assdi.local", phone="01711111111", password="Pass!"
    )
    std1 = Student.objects.create(
        user=u_std1, student_id_number="STD-42-001", registration_no="REG-42-001",
        campus=campus_dhaka, guardian_phone="01811111111"
    )
    Enrollment.objects.create(student=std1, batch=batch_sbmc_42, status=EnrollmentStatus.ACTIVE)

    u_std2 = User.objects.create_user(
        login_id="STD-IT-001", full_name="Student IT", role=UserRole.STUDENT,
        email="it1@assdi.local", phone="01722222222", password="Pass!"
    )
    std2 = Student.objects.create(
        user=u_std2, student_id_number="STD-IT-001", registration_no="REG-IT-001",
        campus=campus_ctg, guardian_phone="01822222222"
    )
    Enrollment.objects.create(student=std2, batch=batch_it_1, status=EnrollmentStatus.ACTIVE)

    return {
        "campus_dhaka": campus_dhaka,
        "campus_ctg": campus_ctg,
        "course_sbmc": course_sbmc,
        "course_it": course_it,
        "batch_sbmc_42": batch_sbmc_42,
        "batch_sbmc_43": batch_sbmc_43,
        "batch_it_1": batch_it_1,
        "coord_sbmc": coord_sbmc,
        "coord_it": coord_it,
        "teacher_1": teacher_1,
        "teacher_2": teacher_2,
        "std1": std1,
        "std2": std2,
    }


@pytest.mark.django_db
class TestAcademicStructureAndRBAC:

    def test_coordinator_course_scoping(self, api_client, academic_setup):
        """Verify coordinator cannot see or manage another course's batches or students."""
        api_client.force_authenticate(user=academic_setup["coord_sbmc"])

        # SBMC coordinator querying batches
        res = api_client.get(reverse("batch-list"))
        assert res.status_code == status.HTTP_200_OK
        batch_ids = [b["id"] for b in res.data["results"]]
        assert academic_setup["batch_sbmc_42"].id in batch_ids
        assert academic_setup["batch_sbmc_43"].id in batch_ids
        assert academic_setup["batch_it_1"].id not in batch_ids

        # SBMC coordinator querying students
        std_res = api_client.get(reverse("student-list"))
        assert std_res.status_code == status.HTTP_200_OK
        std_ids = [s["id"] for s in std_res.data["results"]]
        assert academic_setup["std1"].id in std_ids
        assert academic_setup["std2"].id not in std_ids

    def test_teacher_batch_scoping(self, api_client, academic_setup):
        """Verify teacher can only view their own assigned batch."""
        api_client.force_authenticate(user=academic_setup["teacher_1"])

        res = api_client.get(reverse("batch-list"))
        assert res.status_code == status.HTTP_200_OK
        batch_ids = [b["id"] for b in res.data["results"]]
        assert academic_setup["batch_sbmc_42"].id in batch_ids
        assert academic_setup["batch_sbmc_43"].id not in batch_ids

    def test_student_cannot_read_another_student_profile(self, api_client, academic_setup):
        """Verify student cannot read another student's detail view."""
        # Log in as Student 1
        api_client.force_authenticate(user=academic_setup["std1"].user)

        # Accessing own profile via me endpoint
        me_res = api_client.get(reverse("student-me"))
        assert me_res.status_code == status.HTTP_200_OK
        assert me_res.data["data"]["student_id_number"] == "STD-42-001"

        # Attempting to access Student 2's profile
        other_url = reverse("student-detail", kwargs={"pk": academic_setup["std2"].id})
        other_res = api_client.get(other_url)
        assert other_res.status_code == status.HTTP_404_NOT_FOUND

    def test_observer_privacy_sensitive_fields_absent(self, api_client, academic_setup, observer_user):
        """Verify observer role NEVER sees personal contact data (guardian_phone, phone, email, address)."""
        api_client.force_authenticate(user=observer_user)

        res = api_client.get(reverse("student-detail", kwargs={"pk": academic_setup["std1"].id}))
        assert res.status_code == status.HTTP_200_OK
        data = res.data

        # Sensitive contact fields MUST NOT be present
        assert "guardian_phone" not in data
        assert "phone" not in data
        assert "email" not in data

        # Non-sensitive aggregate identifiers MUST be present
        assert "student_id_number" in data
        assert "full_name" in data
        assert "campus_name" in data

    def test_student_transfer_between_batches(self, api_client, academic_setup):
        """Verify batch transfer maintains enrollment history and writes audit log."""
        api_client.force_authenticate(user=academic_setup["coord_sbmc"])
        student = academic_setup["std1"]

        transfer_url = reverse("student-transfer", kwargs={"pk": student.id})
        res = api_client.post(
            transfer_url,
            {"new_batch_id": academic_setup["batch_sbmc_43"].id, "reason": "Shift preference"},
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK

        # Verify old enrollment is transferred and new enrollment is active
        enrollments = list(student.enrollments.order_by("enrolled_at"))
        assert len(enrollments) == 2
        assert enrollments[0].batch == academic_setup["batch_sbmc_42"]
        assert enrollments[0].status == EnrollmentStatus.TRANSFERRED
        assert enrollments[1].batch == academic_setup["batch_sbmc_43"]
        assert enrollments[1].status == EnrollmentStatus.ACTIVE

    def test_student_returning_to_previous_batch(self, api_client, academic_setup):
        """
        Verify partial unique constraint:
        Student can return to a previous batch historically,
        but can NEVER have two concurrent ACTIVE enrollments.
        """
        student = academic_setup["std1"]
        batch_42 = academic_setup["batch_sbmc_42"]
        batch_43 = academic_setup["batch_sbmc_43"]

        api_client.force_authenticate(user=academic_setup["coord_sbmc"])
        transfer_url = reverse("student-transfer", kwargs={"pk": student.id})

        # Transfer 1: Batch 42 -> Batch 43
        api_client.post(transfer_url, {"new_batch_id": batch_43.id}, format="json")

        # Transfer 2: Batch 43 -> Batch 42 (Returning to Batch 42!)
        res = api_client.post(transfer_url, {"new_batch_id": batch_42.id}, format="json")
        assert res.status_code == status.HTTP_200_OK

        # Check total enrollments = 3
        all_enr = list(student.enrollments.order_by("id"))
        assert len(all_enr) == 3
        assert all_enr[0].status == EnrollmentStatus.TRANSFERRED
        assert all_enr[1].status == EnrollmentStatus.TRANSFERRED
        assert all_enr[2].status == EnrollmentStatus.ACTIVE
        assert all_enr[2].batch == batch_42

        # Verify database raises IntegrityError if two active enrollments exist
        with pytest.raises(IntegrityError):
            Enrollment.objects.create(student=student, batch=batch_43, status=EnrollmentStatus.ACTIVE)

    def test_campus_consistency_enforcement(self, api_client, academic_setup):
        """Verify student cannot be enrolled or transferred into a batch of a different campus."""
        api_client.force_authenticate(user=academic_setup["coord_sbmc"])
        student = academic_setup["std1"]  # In Dhaka campus

        transfer_url = reverse("student-transfer", kwargs={"pk": student.id})
        # Try transferring Dhaka student to Chittagong batch
        res = api_client.post(
            transfer_url,
            {"new_batch_id": academic_setup["batch_it_1"].id},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "campus" in str(res.data)

    def test_student_identity_and_deactivation_sync(self, api_client, academic_setup):
        """Verify Student.student_id_number == User.login_id and deactivating blocks login."""
        api_client.force_authenticate(user=academic_setup["coord_sbmc"])

        # 1. Create student via API
        create_res = api_client.post(
            reverse("student-list"),
            {
                "student_id_number": "STD-NEW-001",
                "registration_no": "REG-NEW-001",
                "full_name": "New Student (Test)",
                "campus_id": academic_setup["campus_dhaka"].id,
                "batch_id": academic_setup["batch_sbmc_42"].id,
                "password": "InitialPass123!",
            },
            format="json",
        )
        assert create_res.status_code == status.HTTP_201_CREATED
        new_std = Student.objects.get(student_id_number="STD-NEW-001")
        assert new_std.user.login_id == "STD-NEW-001"

        # Verify new student can log in
        login_res = api_client.post(
            reverse("auth-login"),
            {"login_id": "STD-NEW-001", "password": "InitialPass123!"},
            format="json",
        )
        assert login_res.status_code == status.HTTP_200_OK

        # 2. Deactivate student
        api_client.force_authenticate(user=academic_setup["coord_sbmc"])
        del_res = api_client.delete(reverse("student-detail", kwargs={"pk": new_std.id}))
        assert del_res.status_code == status.HTTP_204_NO_CONTENT

        new_std.refresh_from_db()
        assert new_std.status == StudentStatus.DROPPED
        assert new_std.user.is_active is False

        # 3. Verify deactivated student login is BLOCKED
        api_client.credentials()
        blocked_res = api_client.post(
            reverse("auth-login"),
            {"login_id": "STD-NEW-001", "password": "InitialPass123!"},
            format="json",
        )
        assert blocked_res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_seed_demo_idempotency(self, db):
        """Verify seed_demo command can run twice without creating duplicate records or crashing."""
        call_command("seed_demo")
        campus_count = Campus.objects.count()
        course_count = Course.objects.count()
        batch_count = Batch.objects.count()
        student_count = Student.objects.count()

        # Run again
        call_command("seed_demo")
        assert Campus.objects.count() == campus_count
        assert Course.objects.count() == course_count
        assert Batch.objects.count() == batch_count
        assert Student.objects.count() == student_count

    def test_student_import_template_excel_and_csv(self, api_client, academic_setup):
        """Test downloading Excel and CSV student import templates."""
        super_admin, _ = User.objects.get_or_create(
            login_id="super_admin_test",
            defaults={"full_name": "Super Admin Test", "role": UserRole.SUPER_ADMIN},
        )
        api_client.force_authenticate(user=super_admin)

        # 1. Excel template
        res_xlsx = api_client.get("/api/v1/students/import-template/")
        assert res_xlsx.status_code == status.HTTP_200_OK
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in res_xlsx.get("Content-Type")

        # 2. CSV template
        res_csv = api_client.get("/api/v1/students/import-template/?template_format=csv")
        assert res_csv.status_code == status.HTTP_200_OK
        assert "text/csv" in res_csv.get("Content-Type")
        csv_text = res_csv.content.decode("utf-8-sig")
        assert "student_id_number,registration_no,full_name" in csv_text

    def test_student_bulk_import_csv(self, api_client, academic_setup):
        """Test bulk importing students into a batch via CSV."""
        from django.core.files.uploadedfile import SimpleUploadedFile

        super_admin, _ = User.objects.get_or_create(
            login_id="super_admin_test",
            defaults={"full_name": "Super Admin Test", "role": UserRole.SUPER_ADMIN},
        )
        api_client.force_authenticate(user=super_admin)
        batch = Batch.objects.first()

        csv_content = (
            "student_id_number,registration_no,full_name,phone,guardian_phone,education_background,password\n"
            "STD-TEST-001,REG-TEST-001,Test Student One,01799000001,01899000001,General,TestPass2026!\n"
            "STD-TEST-002,REG-TEST-002,Test Student Two,01799000002,01899000002,Aliya,TestPass2026!\n"
        )
        uploaded_file = SimpleUploadedFile(
            "students.csv", csv_content.encode("utf-8-sig"), content_type="text/csv"
        )

        res = api_client.post(
            "/api/v1/students/bulk-import/",
            {"file": uploaded_file, "batch_id": batch.id},
            format="multipart",
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["created_count"] == 2
        assert res.data["error_count"] == 0

        # Verify students and enrollments in DB
        s1 = Student.objects.get(student_id_number="STD-TEST-001")
        assert s1.user.full_name == "Test Student One"
        assert s1.education_background == EducationBackground.GENERAL
        assert s1.enrollments.filter(batch=batch, status=EnrollmentStatus.ACTIVE).exists()

        s2 = Student.objects.get(student_id_number="STD-TEST-002")
        assert s2.user.full_name == "Test Student Two"
        assert s2.education_background == EducationBackground.ALIYA

        # Clean up
        User.objects.filter(login_id__in=["STD-TEST-001", "STD-TEST-002", "super_admin_test"]).delete()

    def test_student_bulk_import_unauthorized_for_students(self, api_client, academic_setup):
        """Verify normal students cannot bulk import."""
        from django.core.files.uploadedfile import SimpleUploadedFile

        student_user = User.objects.filter(role=UserRole.STUDENT).first()
        api_client.force_authenticate(user=student_user)
        batch = Batch.objects.first()

        uploaded = SimpleUploadedFile("test.csv", b"dummy content", content_type="text/csv")
        res = api_client.post(
            "/api/v1/students/bulk-import/",
            {"file": uploaded, "batch_id": batch.id},
            format="multipart",
        )
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_student_id_card_access_and_rbac(self, api_client, academic_setup):
        """Verify student ID card endpoint data and RBAC enforcement."""
        super_admin, _ = User.objects.get_or_create(
            login_id="super_admin_test_idcard",
            defaults={"full_name": "Super Admin Test", "role": UserRole.SUPER_ADMIN},
        )
        u_std1 = User.objects.get(login_id="STD-42-001")
        std1 = Student.objects.get(student_id_number="STD-42-001")

        # 1. Super admin can view ID card
        api_client.force_authenticate(user=super_admin)
        res = api_client.get(f"/api/v1/students/{std1.id}/id-card/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["student_id_number"] == "STD-42-001"
        assert res.data["full_name"] == "Student One"
        assert "ASSDI:VERIFY:STD-42-001" in res.data["verification_payload"]

        # 2. Student can view own ID card via 'me'
        api_client.force_authenticate(user=u_std1)
        res_me = api_client.get("/api/v1/students/me/id-card/")
        assert res_me.status_code == status.HTTP_200_OK
        assert res_me.data["student_id_number"] == "STD-42-001"

        # 3. Create another student and verify they CANNOT view std1's ID card
        u_std2 = User.objects.create_user(
            login_id="STD-43-999", full_name="Student Two", role=UserRole.STUDENT, password="Pass!"
        )
        api_client.force_authenticate(user=u_std2)
        res_forbidden = api_client.get(f"/api/v1/students/{std1.id}/id-card/")
        assert res_forbidden.status_code == status.HTTP_403_FORBIDDEN

        # Clean up
        u_std2.delete()
        super_admin.delete()

    def test_student_photo_and_offboard_with_reason(self, api_client, academic_setup):
        """Verify student photo persistence and offboarding with administrative reason."""
        super_admin = User.objects.create_user(
            login_id="admin_test_photo",
            full_name="Admin Test Photo",
            role=UserRole.SUPER_ADMIN,
            password="AdminPassword123!",
        )
        api_client.force_authenticate(user=super_admin)

        # 1. Create student with photo
        sample_photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        create_res = api_client.post(
            reverse("student-list"),
            {
                "student_id_number": "STD-PHOTO-001",
                "registration_no": "REG-PHOTO-001",
                "full_name": "Photo Student",
                "education_background": "General",
                "campus_id": academic_setup["campus_dhaka"].id,
                "batch_id": academic_setup["batch_sbmc_42"].id,
                "photo": sample_photo,
            },
        )
        assert create_res.status_code == status.HTTP_201_CREATED
        student_id = create_res.data["data"]["id"]

        # 2. Verify photo in ID card endpoint
        id_card_res = api_client.get(f"/api/v1/students/{student_id}/id-card/")
        assert id_card_res.status_code == status.HTTP_200_OK
        assert id_card_res.data["photo_url"] == sample_photo

        # 3. Offboard student with status=expelled and custom reason
        offboard_res = api_client.post(
            f"/api/v1/students/{student_id}/offboard/",
            {
                "status": "expelled",
                "reason": "Repeated disciplinary violation in classroom",
            },
        )
        assert offboard_res.status_code == status.HTTP_200_OK
        assert offboard_res.data["status"] == "expelled"
        assert offboard_res.data["reason"] == "Repeated disciplinary violation in classroom"

        # Verify database state
        st = Student.objects.get(id=student_id)
        assert st.status == "expelled"
        assert st.status_reason == "Repeated disciplinary violation in classroom"
        assert st.user.is_active is False

        # Clean up
        st.user.delete()
        super_admin.delete()

    def test_teacher_management_api(self, api_client, academic_setup):
        """Verify Super Admin can list, create, and deactivate teachers."""
        super_admin = User.objects.create_user(
            login_id="admin_test_teachers",
            full_name="Admin Test Teachers",
            role=UserRole.SUPER_ADMIN,
            password="AdminPassword123!",
        )
        api_client.force_authenticate(user=super_admin)

        # 1. Create a new teacher
        subject = Subject.objects.first()
        create_res = api_client.post(
            "/api/v1/teachers/",
            {
                "login_id": "tch_new_01",
                "full_name": "Md. Rafiqul Teacher",
                "email": "rafiq.teacher@assdi.edu.bd",
                "phone": "+8801700000099",
                "password": "TeacherPass2026!",
                "initial_batch_id": academic_setup["batch_sbmc_42"].id,
                "initial_subject_id": subject.id,
            },
        )
        assert create_res.status_code == status.HTTP_201_CREATED
        teacher_id = create_res.data["id"]
        assert create_res.data["login_id"] == "tch_new_01"
        assert create_res.data["assignments_count"] == 1

        # 2. List teachers
        list_res = api_client.get("/api/v1/teachers/")
        assert list_res.status_code == status.HTTP_200_OK
        teacher_ids = [t["id"] for t in (list_res.data if isinstance(list_res.data, list) else list_res.data.get("results", []))]
        assert teacher_id in teacher_ids

        # 3. Soft-deactivate teacher
        del_res = api_client.delete(f"/api/v1/teachers/{teacher_id}/")
        assert del_res.status_code == status.HTTP_204_NO_CONTENT

        t_user = User.objects.get(id=teacher_id)
        assert t_user.is_active is False

        # Clean up
        t_user.teacher_assignments.all().delete()
        t_user.delete()
        super_admin.delete()
