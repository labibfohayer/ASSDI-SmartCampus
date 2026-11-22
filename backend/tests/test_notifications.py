import datetime
import pytest
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import User, UserRole
from apps.academic.models import Campus, Course, Subject, ClassTopic, CoordinatorCourseAssignment
from apps.batches.models import Batch, TeacherAssignment
from apps.class_sessions.models import ClassSession, SessionStatus
from apps.feedback.models import LearningFeedback, HelpRequest, HelpRequestStatus
from apps.notifications.models import (
    Notification,
    Announcement,
    DeviceToken,
    NotificationType,
    AnnouncementScope,
)
from apps.students.models import Student, Enrollment, EnrollmentStatus


@pytest.fixture
def notifications_setup_data(db):
    """Sets up realistic entities for notifications testing."""
    campus = Campus.objects.create(name="Dhaka Campus", code="DHK")
    course = Course.objects.create(name="Small Business Management Course", code="SBMC")
    course_other = Course.objects.create(name="Web Development Course", code="WDC")

    batch = Batch.objects.create(
        name="SBMC Batch 42",
        batch_number=42,
        course=course,
        campus=campus,
        start_date=datetime.date(2026, 1, 1),
        end_date=datetime.date(2026, 6, 30),
    )

    subject = Subject.objects.create(name="Business Planning", code="BP101", course=course)
    topic = ClassTopic.objects.create(subject=subject, title="Cash Flow Management")

    admin_user = User.objects.create_user(
        login_id="admin01",
        full_name="Admin Rahim",
        role=UserRole.SUPER_ADMIN,
        password="SecurePass2026!",
        is_staff=True,
    )

    coord_user = User.objects.create_user(
        login_id="coord01",
        full_name="Coordinator Karim",
        role=UserRole.COORDINATOR,
        password="SecurePass2026!",
    )
    CoordinatorCourseAssignment.objects.create(user=coord_user, course=course)

    teacher_user = User.objects.create_user(
        login_id="teacher01",
        full_name="Teacher Masud",
        role=UserRole.TEACHER,
        password="SecurePass2026!",
    )
    TeacherAssignment.objects.create(batch=batch, subject=subject, teacher_user=teacher_user)

    st_user = User.objects.create_user(
        login_id="STD-2026-042-001",
        full_name="Student Abdullah",
        role=UserRole.STUDENT,
        password="SecurePass2026!",
    )
    student = Student.objects.create(
        user=st_user,
        student_id_number="STD-2026-042-001",
        registration_no="REG-2026-042-001",
        campus=campus,
    )
    Enrollment.objects.create(student=student, batch=batch, status=EnrollmentStatus.ACTIVE)

    session = ClassSession.objects.create(
        batch=batch,
        subject=subject,
        topic=topic,
        teacher_user=teacher_user,
        session_date=timezone.localdate(),
        start_time=datetime.time(10, 0),
        end_time=datetime.time(12, 0),
        status=SessionStatus.PUBLISHED,
    )

    return {
        "admin": admin_user,
        "coordinator": coord_user,
        "teacher": teacher_user,
        "student_user": st_user,
        "student": student,
        "course": course,
        "course_other": course_other,
        "batch": batch,
        "session": session,
        "topic": topic,
    }


@pytest.mark.django_db
class TestNotificationsEngine:
    def test_notification_listing_and_isolation(self, api_client, notifications_setup_data):
        """Verifies a user sees only their own notifications."""
        data = notifications_setup_data
        teacher = data["teacher"]
        student_user = data["student_user"]

        Notification.objects.create(
            recipient=teacher,
            title="Teacher Alert",
            body="You have a class today.",
            notification_type=NotificationType.CLASS_REMINDER,
        )
        Notification.objects.create(
            recipient=student_user,
            title="Student Alert",
            body="Feedback pending.",
            notification_type=NotificationType.ATTENDANCE_ALERT,
        )

        # Teacher listing
        api_client.force_authenticate(user=teacher)
        res_t = api_client.get("/api/v1/notifications/")
        assert res_t.status_code == status.HTTP_200_OK
        assert len(res_t.data["results"]) == 1
        assert res_t.data["results"][0]["title"] == "Teacher Alert"

        # Student listing
        api_client.force_authenticate(user=student_user)
        res_s = api_client.get("/api/v1/notifications/")
        assert res_s.status_code == status.HTTP_200_OK
        assert len(res_s.data["results"]) == 1
        assert res_s.data["results"][0]["title"] == "Student Alert"

    def test_unread_count_and_mark_read_flows(self, api_client, notifications_setup_data):
        """Verifies unread count, single mark-read, and mark-all-read."""
        data = notifications_setup_data
        st_user = data["student_user"]
        teacher = data["teacher"]

        n1 = Notification.objects.create(
            recipient=st_user,
            title="Notification 1",
            body="Body 1",
            is_read=False,
        )
        n2 = Notification.objects.create(
            recipient=st_user,
            title="Notification 2",
            body="Body 2",
            is_read=False,
        )

        api_client.force_authenticate(user=st_user)

        # Check unread count
        res_count = api_client.get("/api/v1/notifications/unread-count/")
        assert res_count.status_code == status.HTTP_200_OK
        assert res_count.data["unread_count"] == 2

        # Mark single read
        res_mark1 = api_client.post(f"/api/v1/notifications/{n1.id}/mark-read/")
        assert res_mark1.status_code == status.HTTP_200_OK
        assert res_mark1.data["is_read"] is True

        res_count2 = api_client.get("/api/v1/notifications/unread-count/")
        assert res_count2.data["unread_count"] == 1

        # Teacher cannot mark student's notification as read (returns 404)
        api_client.force_authenticate(user=teacher)
        res_forbidden = api_client.post(f"/api/v1/notifications/{n2.id}/mark-read/")
        assert res_forbidden.status_code == status.HTTP_404_NOT_FOUND

        # Student marks all read
        api_client.force_authenticate(user=st_user)
        res_all = api_client.post("/api/v1/notifications/mark-all-read/")
        assert res_all.status_code == status.HTTP_200_OK
        assert res_all.data["marked_count"] == 1

        res_count3 = api_client.get("/api/v1/notifications/unread-count/")
        assert res_count3.data["unread_count"] == 0

        # Delete single notification
        res_del = api_client.delete(f"/api/v1/notifications/{n1.id}/delete/")
        assert res_del.status_code == status.HTTP_200_OK
        assert not Notification.objects.filter(id=n1.id).exists()

        # Clear all read notifications
        res_clear = api_client.post("/api/v1/notifications/clear-all-read/")
        assert res_clear.status_code == status.HTTP_200_OK
        assert res_clear.data["cleared_count"] == 1  # n2 was read
        assert not Notification.objects.filter(id=n2.id).exists()

    def test_signal_help_request_created_notifies_teacher(self, api_client, notifications_setup_data):
        """When student creates a help request, teacher receives notification via signal."""
        data = notifications_setup_data
        st_user = data["student_user"]
        student = data["student"]
        teacher = data["teacher"]
        session = data["session"]
        topic = data["topic"]

        from apps.feedback.signals import help_request_created

        # Create feedback and help request, triggering signal
        fb = LearningFeedback.objects.create(
            session=session,
            student=student,
            topic=topic,
            understanding_rating=2,
            needs_help=True,
            student_comment="নগদ প্রবাহের হিসাবটা পুনরায় বুঝতে চাই।",
        )
        help_req = HelpRequest.objects.create(
            feedback=fb,
            student=student,
            teacher_user=teacher,
            session=session,
            topic=topic,
            student_message="নগদ প্রবাহের হিসাবটা পুনরায় বুঝতে চাই।",
            status=HelpRequestStatus.PENDING,
        )
        help_request_created.send(
            sender=HelpRequest,
            help_request=help_req,
            created_by_user=st_user,
        )

        # Verify teacher has received a notification
        teacher_notifs = Notification.objects.filter(recipient=teacher)
        assert teacher_notifs.exists()
        notif = teacher_notifs.first()
        assert notif.notification_type == NotificationType.HELP_REQUEST
        assert "Cash Flow Management" in notif.title
        assert "নগদ প্রবাহ" in notif.body

    def test_signal_help_request_resolved_notifies_student(self, api_client, notifications_setup_data):
        """When teacher resolves a help request, student receives a help_reply notification."""
        data = notifications_setup_data
        st_user = data["student_user"]
        student = data["student"]
        teacher = data["teacher"]
        session = data["session"]
        topic = data["topic"]

        # Create feedback and help request
        fb = LearningFeedback.objects.create(
            session=session,
            student=student,
            topic=topic,
            understanding_rating=2,
            needs_help=True,
            student_comment="সহায়তা প্রয়োজন",
        )
        help_req = HelpRequest.objects.create(
            feedback=fb,
            student=student,
            teacher_user=teacher,
            session=session,
            topic=topic,
            student_message="সহায়তা প্রয়োজন",
            status=HelpRequestStatus.PENDING,
        )

        # Teacher starts working on it (pending -> in_progress)
        api_client.force_authenticate(user=teacher)
        res_start = api_client.post(f"/api/v1/help-requests/{help_req.id}/start/")
        assert res_start.status_code == status.HTTP_200_OK

        # Teacher resolves it (in_progress -> resolved)
        res_resolve = api_client.post(
            f"/api/v1/help-requests/{help_req.id}/resolve/",
            {
                "teacher_note": "আগামীকালের ক্লাসে প্রথম ১০ মিনিট এটি নিয়ে বিস্তারিত আলোচনা করব।",
            },
            format="json",
        )
        assert res_resolve.status_code == status.HTTP_200_OK

        # Verify student received resolution notification
        st_notifs = Notification.objects.filter(
            recipient=st_user,
            notification_type=NotificationType.HELP_REPLY,
        )
        assert st_notifs.count() == 2  # 1 for in_progress + 1 for resolved
        latest_notif = st_notifs.first()
        assert "সমাধান" in latest_notif.title
        assert "আগামীকালের ক্লাসে" in latest_notif.body

    def test_announcements_rbac_and_broadcast(self, api_client, notifications_setup_data):
        """Verifies RBAC rules and notification fan-out for announcements."""
        data = notifications_setup_data
        admin = data["admin"]
        coord = data["coordinator"]
        teacher = data["teacher"]
        st_user = data["student_user"]
        course = data["course"]
        course_other = data["course_other"]
        batch = data["batch"]

        # 1. Student cannot create announcement
        api_client.force_authenticate(user=st_user)
        res_st = api_client.post(
            "/api/v1/announcements/",
            {"title": "Test", "content": "Test content", "scope": "Global"},
            format="json",
        )
        assert res_st.status_code == status.HTTP_403_FORBIDDEN

        # 2. Coordinator cannot create Global announcement
        api_client.force_authenticate(user=coord)
        res_coord_global = api_client.post(
            "/api/v1/announcements/",
            {"title": "Global Notice", "content": "Hello All", "scope": "Global"},
            format="json",
        )
        assert res_coord_global.status_code == status.HTTP_403_FORBIDDEN

        # 3. Coordinator cannot create announcement for an unassigned course
        res_coord_unassigned = api_client.post(
            "/api/v1/announcements/",
            {
                "title": "WDC Notice",
                "content": "For WDC",
                "scope": "Course",
                "target_course": course_other.id,
            },
            format="json",
        )
        assert res_coord_unassigned.status_code == status.HTTP_403_FORBIDDEN

        # 4. Coordinator can create announcement for their assigned course -> broadcast triggers
        res_coord_ok = api_client.post(
            "/api/v1/announcements/",
            {
                "title": "SBMC গুরুত্বপূর্ণ নোটিশ",
                "content": "আগামী রবিবার সকল ব্যাচের ক্লাস নির্ধারিত সময়ে অনুষ্ঠিত হবে।",
                "scope": "Course",
                "target_course": course.id,
            },
            format="json",
        )
        assert res_coord_ok.status_code == status.HTTP_201_CREATED

        # Verify enrolled student in that course received an in-app notification!
        student_notif = Notification.objects.filter(
            recipient=st_user,
            notification_type=NotificationType.ANNOUNCEMENT,
        )
        assert student_notif.exists()
        assert "SBMC গুরুত্বপূর্ণ নোটিশ" in student_notif.first().title

    def test_device_tokens_registration_and_removal(self, api_client, notifications_setup_data):
        """Verifies registering and unregistering FCM device tokens."""
        data = notifications_setup_data
        st_user = data["student_user"]

        api_client.force_authenticate(user=st_user)

        # Register token
        res_reg = api_client.post(
            "/api/v1/notifications/device-token/",
            {"fcm_token": "sample-fcm-token-123456", "platform": "android"},
            format="json",
        )
        assert res_reg.status_code == status.HTTP_201_CREATED
        assert DeviceToken.objects.filter(user=st_user, fcm_token="sample-fcm-token-123456").exists()

        # Update token (idempotent / platform change)
        res_update = api_client.post(
            "/api/v1/notifications/device-token/",
            {"fcm_token": "sample-fcm-token-123456", "platform": "web"},
            format="json",
        )
        assert res_update.status_code == status.HTTP_200_OK

        # Remove token
        res_del = api_client.delete(
            "/api/v1/notifications/device-token/",
            {"fcm_token": "sample-fcm-token-123456"},
            format="json",
        )
        assert res_del.status_code == status.HTTP_200_OK
        assert not DeviceToken.objects.filter(fcm_token="sample-fcm-token-123456").exists()
