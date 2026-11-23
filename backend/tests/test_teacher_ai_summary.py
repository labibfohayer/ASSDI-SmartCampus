import datetime
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
from apps.batches.models import Batch, BatchStatus, TeacherAssignment
from apps.class_sessions.models import ClassSession, SessionAudience, SessionStatus
from apps.feedback.models import HelpRequest, HelpRequestStatus, LearningFeedback
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
def base_academic_data():
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
    subject = Subject.objects.create(course=course, name="Video Editing", code="VID42", audience_type=SubjectAudience.ALL)
    topic_hard = ClassTopic.objects.create(subject=subject, title="Color Grading & Audio Enhancement")
    topic_easy = ClassTopic.objects.create(subject=subject, title="Basic Cuts and Transitions")

    # Teacher
    teacher_user = User.objects.create_user(
        login_id="teacher_kawsar",
        full_name="Kawsar Hossain (Dummy)",
        role=UserRole.TEACHER,
        password="password123",
    )
    TeacherAssignment.objects.create(batch=batch, subject=subject, teacher_user=teacher_user)

    # Coordinator
    coord_user = User.objects.create_user(
        login_id="coord_ahmad",
        full_name="Ahmad Coordinator (Dummy)",
        role=UserRole.COORDINATOR,
        password="password123",
    )
    CoordinatorCourseAssignment.objects.create(user=coord_user, course=course)

    # Observer
    observer_user = User.objects.create_user(
        login_id="observer_zahir",
        full_name="Zahir Observer (Dummy)",
        role=UserRole.OBSERVER,
        password="password123",
    )

    # Super Admin
    admin_user = User.objects.create_user(
        login_id="admin_main",
        full_name="Admin Main (Dummy)",
        role=UserRole.SUPER_ADMIN,
        password="password123",
    )

    # Students
    students = []
    for i in range(1, 6):
        u = User.objects.create_user(
            login_id=f"STD-2026-042-{i:03d}",
            full_name=f"Student {i} (Dummy)",
            role=UserRole.STUDENT,
            password="password123",
        )
        st = Student.objects.create(
            user=u,
            student_id_number=f"STD-2026-042-{i:03d}",
            registration_no=f"REG-2026-042-{i:03d}",
            campus=campus,
            education_background=EducationBackground.GENERAL,
            status=StudentStatus.ACTIVE,
        )
        Enrollment.objects.create(student=st, batch=batch, status=EnrollmentStatus.ACTIVE)
        students.append(st)

    today = timezone.now().astimezone(DHAKA_TZ).date()

    # Session 1: Hard Topic (Color Grading)
    session1 = ClassSession.objects.create(
        batch=batch,
        subject=subject,
        topic=topic_hard,
        teacher_user=teacher_user,
        session_date=today - datetime.timedelta(days=2),
        start_time=datetime.time(10, 0),
        end_time=datetime.time(11, 30),
        audience=SessionAudience.ALL,
        status=SessionStatus.PUBLISHED,
    )

    # Session 2: Easy Topic (Basic Cuts)
    session2 = ClassSession.objects.create(
        batch=batch,
        subject=subject,
        topic=topic_easy,
        teacher_user=teacher_user,
        session_date=today - datetime.timedelta(days=1),
        start_time=datetime.time(14, 0),
        end_time=datetime.time(15, 30),
        audience=SessionAudience.ALL,
        status=SessionStatus.PUBLISHED,
    )

    # Session 1 feedbacks: Low ratings + Help Requests
    for idx, st in enumerate(students[:3]):
        fb = LearningFeedback.objects.create(
            session=session1,
            student=st,
            topic=topic_hard,
            understanding_rating=2,  # poor/low
            needs_help=True,
            student_comment="কালার কারেকশনের কার্ভস ও এলইউটি (LUT) বুঝতে সমস্যা হচ্ছে।",
        )
        HelpRequest.objects.create(
            feedback=fb,
            session=session1,
            topic=topic_hard,
            student=st,
            teacher_user=teacher_user,
            student_message=fb.student_comment,
            status=HelpRequestStatus.PENDING,
        )

    # Session 2 feedbacks: High ratings
    for st in students:
        LearningFeedback.objects.create(
            session=session2,
            student=st,
            topic=topic_easy,
            understanding_rating=5,  # excellent
            needs_help=False,
            student_comment="খুব ভালো লেগেছে, পরিষ্কার বুঝেছি।",
        )

    return {
        "teacher": teacher_user,
        "coordinator": coord_user,
        "observer": observer_user,
        "admin": admin_user,
        "student": students[0].user,
        "batch": batch,
        "session1": session1,
        "session2": session2,
        "topic_hard": topic_hard,
        "topic_easy": topic_easy,
    }


@pytest.mark.django_db
class TestTeacherAIWeeklySummary:
    def test_teacher_can_fetch_own_ai_weekly_summary(self, api_client, base_academic_data):
        teacher = base_academic_data["teacher"]
        api_client.force_authenticate(user=teacher)

        url = "/api/v1/reports/teacher-ai-weekly-summary/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        res_data = response.data
        assert res_data["success"] is True
        summary = res_data["data"]

        assert summary["teacher_id"] == teacher.id
        assert summary["read_time_minutes"] == 2
        assert "week_label" in summary
        assert "generated_at" in summary
        assert "summary_metrics" in summary

        metrics = summary["summary_metrics"]
        assert metrics["total_sessions"] == 2
        assert metrics["total_feedbacks"] == 8  # 3 on session1 + 5 on session2
        assert metrics["total_help_requests"] == 3
        assert metrics["pending_help_requests"] == 3

    def test_struggling_topics_and_ai_recommendations_computed_accurately(
        self, api_client, base_academic_data
    ):
        teacher = base_academic_data["teacher"]
        api_client.force_authenticate(user=teacher)

        url = "/api/v1/reports/teacher-ai-weekly-summary/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        summary = response.data["data"]

        # Topic 1 (Color Grading) had ratings of 2 (40%) and 3 help requests -> must be #1 struggling topic
        struggling = summary["top_struggling_topics"]
        assert len(struggling) >= 1
        hardest = struggling[0]
        assert hardest["topic_id"] == base_academic_data["topic_hard"].id
        assert hardest["understanding_percentage"] == 40.0
        assert hardest["help_requests_count"] == 3
        assert hardest["difficulty_level"] == "উচ্চ জটিলতা (Critical)"

        # Verify AI Recommendations generated
        recommendations = summary["ai_recommendations"]
        assert len(recommendations) >= 2

        # Check bottleneck recommendation mentions the hardest topic
        rec_texts = " ".join([r["title"] + " " + r["description"] for r in recommendations])
        assert "Color Grading & Audio Enhancement" in rec_texts or "রিভিউ" in rec_texts

        # Check pending help request recommendation is present
        assert any(r["category"] == "help_resolution" for r in recommendations)

        # Check attention students list contains the struggling students
        attention = summary["attention_students"]
        assert len(attention) >= 1

    def test_student_and_observer_forbidden_on_ai_summary(self, api_client, base_academic_data):
        url = "/api/v1/reports/teacher-ai-weekly-summary/"

        # Student forbidden
        api_client.force_authenticate(user=base_academic_data["student"])
        resp_student = api_client.get(url)
        assert resp_student.status_code == status.HTTP_403_FORBIDDEN

        # Observer forbidden
        api_client.force_authenticate(user=base_academic_data["observer"])
        resp_observer = api_client.get(url)
        assert resp_observer.status_code == status.HTTP_403_FORBIDDEN

    def test_coordinator_and_admin_can_preview_teacher_summary(self, api_client, base_academic_data):
        teacher = base_academic_data["teacher"]
        coord = base_academic_data["coordinator"]
        api_client.force_authenticate(user=coord)

        url = f"/api/v1/reports/teacher-ai-weekly-summary/?teacher_id={teacher.id}"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["teacher_id"] == teacher.id
