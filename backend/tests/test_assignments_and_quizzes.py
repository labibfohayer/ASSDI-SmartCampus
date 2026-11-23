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
def base_data():
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

    batch_other = Batch.objects.create(
        course=course,
        name="SBMC Batch 43",
        campus=campus,
        batch_number=43,
        start_date=today - datetime.timedelta(days=30),
        end_date=today + datetime.timedelta(days=60),
        status=BatchStatus.ACTIVE,
    )

    subject = Subject.objects.create(course=course, name="Video Editing", code="VID42", audience_type=SubjectAudience.ALL)
    topic = ClassTopic.objects.create(subject=subject, title="Color Grading Fundamentals")

    # Teacher 1 (assigned to batch 42)
    teacher = User.objects.create_user(
        login_id="teacher_kawsar",
        full_name="Kawsar Hossain (Dummy)",
        role=UserRole.TEACHER,
        password="password123",
    )
    TeacherAssignment.objects.create(batch=batch, subject=subject, teacher_user=teacher)

    # Teacher 2 (unassigned to batch 42)
    unassigned_teacher = User.objects.create_user(
        login_id="teacher_other",
        full_name="Other Teacher (Dummy)",
        role=UserRole.TEACHER,
        password="password123",
    )

    # Student in batch 42
    student_user = User.objects.create_user(
        login_id="STD-2026-042-001",
        full_name="Abdullah Student (Dummy)",
        role=UserRole.STUDENT,
        password="password123",
    )
    student = Student.objects.create(
        user=student_user,
        student_id_number="STD-2026-042-001",
        registration_no="REG-2026-042-001",
        campus=campus,
        education_background=EducationBackground.GENERAL,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(student=student, batch=batch, status=EnrollmentStatus.ACTIVE)

    # Student in batch 43 (other batch)
    other_student_user = User.objects.create_user(
        login_id="STD-2026-043-001",
        full_name="Other Student (Dummy)",
        role=UserRole.STUDENT,
        password="password123",
    )
    other_student = Student.objects.create(
        user=other_student_user,
        student_id_number="STD-2026-043-001",
        registration_no="REG-2026-043-001",
        campus=campus,
        education_background=EducationBackground.GENERAL,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(student=other_student, batch=batch_other, status=EnrollmentStatus.ACTIVE)

    # Session for batch 42
    session = ClassSession.objects.create(
        batch=batch,
        subject=subject,
        topic=topic,
        teacher_user=teacher,
        session_date=today,
        start_time=datetime.time(10, 0),
        end_time=datetime.time(11, 30),
        audience=SessionAudience.ALL,
        status=SessionStatus.PUBLISHED,
    )

    return {
        "teacher": teacher,
        "unassigned_teacher": unassigned_teacher,
        "student_user": student_user,
        "student": student,
        "other_student_user": other_student_user,
        "other_student": other_student,
        "batch": batch,
        "session": session,
        "topic": topic,
    }


@pytest.mark.django_db
class TestMicroQuizAndHomeworkModule:
    def test_teacher_can_create_micro_quiz_with_mcq_questions(self, api_client, base_data):
        teacher = base_data["teacher"]
        session = base_data["session"]
        topic = base_data["topic"]
        api_client.force_authenticate(user=teacher)

        payload = {
            "session": session.id,
            "topic": topic.id,
            "title": "কালার গ্রেডিং বেসিক কুইজ",
            "instructions": "আজকের ক্লাসের মূল ধারণার ওপর ২ মিনিটের কুইজ।",
            "questions": [
                {
                    "question_text": "ভিডিওতে প্রাইমারি কালার কারেকশনে মূলত কোনটি সামঞ্জস্য করা হয়?",
                    "options": [
                        {"id": "A", "text": "এক্সপোজার ও হোয়াইট ব্যালেন্স"},
                        {"id": "B", "text": "অডিওর ভলিউম বৃদ্ধি"},
                        {"id": "C", "text": "স্পিড র‍্যাম্পিং"},
                        {"id": "D", "text": "সাবটাইটেল টাইপোগ্রাফি"},
                    ],
                    "correct_option": "A",
                    "explanation": "প্রাইমারি কালার কারেকশন সম্পূর্ণ ক্লিপের এক্সপোজার ও কালার ব্যালেন্স ঠিক করতে ব্যবহৃত হয়।",
                },
                {
                    "question_text": "LUT এর পূর্ণরূপ কী?",
                    "options": [
                        {"id": "A", "text": "Linear Uniform Tracking"},
                        {"id": "B", "text": "Look-Up Table"},
                        {"id": "C", "text": "Level Unit Transition"},
                        {"id": "D", "text": "Light Ultra Tone"},
                    ],
                    "correct_option": "B",
                    "explanation": "LUT মানে Look-Up Table, যা কালার গ্রেডিংয়ে রঙ ম্যাপিং করতে ব্যবহৃত হয়।",
                },
            ],
        }

        resp = api_client.post("/api/v1/quizzes/", payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        quiz_data = resp.data
        assert quiz_data["title"] == "কালার গ্রেডিং বেসিক কুইজ"
        assert len(quiz_data["questions"]) == 2

    def test_unassigned_teacher_cannot_create_quiz_for_session(self, api_client, base_data):
        unassigned_teacher = base_data["unassigned_teacher"]
        session = base_data["session"]
        api_client.force_authenticate(user=unassigned_teacher)

        payload = {
            "session": session.id,
            "title": "Unauthorized Quiz",
            "questions": [],
        }
        resp = api_client.post("/api/v1/quizzes/", payload, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_student_can_take_quiz_and_get_instant_grading(self, api_client, base_data):
        teacher = base_data["teacher"]
        session = base_data["session"]
        student_user = base_data["student_user"]

        # Teacher creates quiz
        api_client.force_authenticate(user=teacher)
        quiz_resp = api_client.post(
            "/api/v1/quizzes/",
            {
                "session": session.id,
                "title": "১০-১৫ সেকেন্ডের কুইক টেস্ট",
                "questions": [
                    {
                        "question_text": "LUT এর পূর্ণরূপ কী?",
                        "options": [
                            {"id": "A", "text": "Linear Uniform Tracking"},
                            {"id": "B", "text": "Look-Up Table"},
                        ],
                        "correct_option": "B",
                        "explanation": "LUT মানে Look-Up Table।",
                    }
                ],
            },
            format="json",
        )
        assert quiz_resp.status_code == status.HTTP_201_CREATED
        quiz_id = quiz_resp.data["id"]
        q_id = quiz_resp.data["questions"][0]["id"]

        # Student takes quiz
        api_client.force_authenticate(user=student_user)

        # Student can list quizzes for their session
        list_resp = api_client.get(f"/api/v1/quizzes/?session={session.id}")
        assert list_resp.status_code == status.HTTP_200_OK
        # Student should not see correct_option leaked before submitting!
        first_q = list_resp.data["results"][0]["questions"][0] if "results" in list_resp.data else list_resp.data[0]["questions"][0]
        assert "correct_option" not in first_q or first_q.get("correct_option") is None

        # Student submits attempt with correct answer B
        attempt_payload = {
            "answers": {str(q_id): "B"}
        }
        submit_resp = api_client.post(f"/api/v1/quizzes/{quiz_id}/submit/", attempt_payload, format="json")
        assert submit_resp.status_code == status.HTTP_201_CREATED
        attempt_data = submit_resp.data
        assert attempt_data["score"] == 1
        assert attempt_data["total_questions"] == 1
        assert attempt_data["percentage"] == 100.0
        assert attempt_data["passed"] is True

        # Duplicate attempt by same student returns 409 Conflict
        dup_resp = api_client.post(f"/api/v1/quizzes/{quiz_id}/submit/", attempt_payload, format="json")
        assert dup_resp.status_code == status.HTTP_409_CONFLICT

    def test_unenrolled_student_cannot_take_quiz(self, api_client, base_data):
        teacher = base_data["teacher"]
        session = base_data["session"]
        other_student_user = base_data["other_student_user"]

        api_client.force_authenticate(user=teacher)
        quiz_resp = api_client.post(
            "/api/v1/quizzes/",
            {"session": session.id, "title": "Batch 42 Quiz", "questions": []},
            format="json",
        )
        quiz_id = quiz_resp.data["id"]

        api_client.force_authenticate(user=other_student_user)
        submit_resp = api_client.post(f"/api/v1/quizzes/{quiz_id}/submit/", {"answers": {}}, format="json")
        assert submit_resp.status_code == status.HTTP_403_FORBIDDEN

    def test_homework_assignment_creation_submission_and_teacher_grading(self, api_client, base_data):
        teacher = base_data["teacher"]
        session = base_data["session"]
        student_user = base_data["student_user"]

        # 1. Teacher creates homework
        api_client.force_authenticate(user=teacher)
        due = str(timezone.now().date() + datetime.timedelta(days=5))
        hw_payload = {
            "session": session.id,
            "title": "কালার হুইল ব্যালেন্স প্র্যাকটিস",
            "instructions": "একটি ৩ মিনিটের ভিডিও ফুটেজ কালার ব্যালেন্স করে আপনার ড্রাইভ লিংক দিন।",
            "due_date": due,
            "max_score": 10,
        }
        hw_resp = api_client.post("/api/v1/homeworks/", hw_payload, format="json")
        assert hw_resp.status_code == status.HTTP_201_CREATED
        hw_id = hw_resp.data["id"]

        # 2. Student views homework and submits
        api_client.force_authenticate(user=student_user)
        sub_payload = {
            "submission_text": "স্যার, আমি প্রিমিয়ার প্রোতে কালার হুইল দিয়ে স্কিন টোন অ্যাডজাস্ট করেছি।",
            "attachment_url": "https://drive.google.com/file/d/dummy-homework-link",
        }
        sub_resp = api_client.post(f"/api/v1/homeworks/{hw_id}/submit/", sub_payload, format="json")
        assert sub_resp.status_code == status.HTTP_201_CREATED
        sub_id = sub_resp.data["id"]
        assert sub_resp.data["status"] == "submitted"

        # 3. Teacher reviews and grades the submission
        api_client.force_authenticate(user=teacher)
        grade_payload = {
            "score": 9,
            "teacher_feedback": "মাশাআল্লাহ, স্কিন টোন ব্যালেন্স নিখুঁত হয়েছে। হাইলাইটস আরেকটু কমাতে পারেন।",
        }
        grade_resp = api_client.post(f"/api/v1/homeworks/{hw_id}/review/{sub_id}/", grade_payload, format="json")
        assert grade_resp.status_code == status.HTTP_200_OK
        assert grade_resp.data["score"] == 9
        assert grade_resp.data["status"] == "reviewed"

        # 4. Student can see the review
        api_client.force_authenticate(user=student_user)
        my_hw_resp = api_client.get(f"/api/v1/homeworks/{hw_id}/my-submission/")
        assert my_hw_resp.status_code == status.HTTP_200_OK
        assert my_hw_resp.data["score"] == 9
        assert "মাশাআল্লাহ" in my_hw_resp.data["teacher_feedback"]
