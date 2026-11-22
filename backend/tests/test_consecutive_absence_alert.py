import datetime
import pytest
from apps.academic.models import Campus, CoordinatorCourseAssignment, Course, Subject
from apps.accounts.models import User, UserRole
from apps.attendance.models import AttendanceMethod, AttendanceRecord, AttendanceStatus
from apps.attendance.services import check_and_create_consecutive_absence_alert
from apps.audit.models import AuditLog
from apps.batches.models import Batch, BatchStatus, TeacherAssignment
from apps.class_sessions.models import ClassSession, ClassTopic, SessionAudience, SessionStatus
from apps.notifications.models import Notification, NotificationType
from apps.students.models import EducationBackground, Enrollment, EnrollmentStatus, Student, StudentStatus


@pytest.fixture
def alert_academic_setup(db, teacher_user, coordinator_user, super_admin_user):
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
    # Assign coordinator to this course
    CoordinatorCourseAssignment.objects.create(
        user=coordinator_user,
        course=course,
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

    # Create 4 consecutive published sessions on different dates
    sessions = []
    base_date = datetime.date(2026, 11, 1)
    for i in range(4):
        s = ClassSession.objects.create(
            batch=batch,
            subject=subject,
            topic=topic,
            teacher_user=teacher_user,
            session_date=base_date + datetime.timedelta(days=i),
            start_time=datetime.time(9, 0),
            end_time=datetime.time(11, 0),
            audience=SessionAudience.ALL,
            status=SessionStatus.PUBLISHED,
        )
        sessions.append(s)

    # Student
    user = User.objects.create_user(
        login_id="STD-ALERT-001",
        role=UserRole.STUDENT,
        full_name="Absentee Student",
        password="StudentPass2026!",
    )
    student = Student.objects.create(
        user=user,
        student_id_number="STD-ALERT-001",
        registration_no="REG-ALERT-001",
        campus=campus,
        education_background=EducationBackground.GENERAL,
        status=StudentStatus.ACTIVE,
    )
    Enrollment.objects.create(
        student=student,
        batch=batch,
        status=EnrollmentStatus.ACTIVE,
    )

    return {
        "course": course,
        "campus": campus,
        "batch": batch,
        "subject": subject,
        "sessions": sessions,
        "student": student,
        "coordinator": coordinator_user,
        "super_admin": super_admin_user,
    }


@pytest.mark.django_db
class TestConsecutiveAbsenceAlert:
    def test_three_consecutive_absences_triggers_alerts(self, alert_academic_setup):
        student = alert_academic_setup["student"]
        sessions = alert_academic_setup["sessions"]
        super_admin = alert_academic_setup["super_admin"]
        coordinator = alert_academic_setup["coordinator"]

        # Day 1: Absent
        AttendanceRecord.objects.create(
            student=student,
            session=sessions[0],
            status=AttendanceStatus.ABSENT,
        )
        assert Notification.objects.filter(notification_type=NotificationType.ATTENDANCE_ALERT).count() == 0

        # Day 2: Absent
        AttendanceRecord.objects.create(
            student=student,
            session=sessions[1],
            status=AttendanceStatus.ABSENT,
        )
        assert Notification.objects.filter(notification_type=NotificationType.ATTENDANCE_ALERT).count() == 0

        # Day 3: Absent (Threshold of 3 reached!)
        AttendanceRecord.objects.create(
            student=student,
            session=sessions[2],
            status=AttendanceStatus.ABSENT,
        )

        # Super admin and assigned coordinator must have received attendance_alert notification
        admin_notif = Notification.objects.filter(
            recipient=super_admin,
            notification_type=NotificationType.ATTENDANCE_ALERT,
        ).first()
        assert admin_notif is not None
        assert "টানা 3 দিন অনুপস্থিতির সতর্কবার্তা" in admin_notif.title
        assert admin_notif.data_payload["consecutive_absences"] == 3
        assert admin_notif.data_payload["student_id"] == student.id
        assert admin_notif.data_payload["session_id"] == sessions[2].id

        coord_notif = Notification.objects.filter(
            recipient=coordinator,
            notification_type=NotificationType.ATTENDANCE_ALERT,
        ).first()
        assert coord_notif is not None
        assert coord_notif.data_payload["consecutive_absences"] == 3

        # AuditLog entry must exist
        audit = AuditLog.objects.filter(
            action="ATTENDANCE_CONSECUTIVE_ALERT",
            entity_id=str(student.id),
        ).first()
        assert audit is not None
        assert audit.new_values["consecutive_absences"] == 3

    def test_interrupted_streak_does_not_trigger_alert(self, alert_academic_setup):
        student = alert_academic_setup["student"]
        sessions = alert_academic_setup["sessions"]

        # Day 1: Absent
        AttendanceRecord.objects.create(
            student=student,
            session=sessions[0],
            status=AttendanceStatus.ABSENT,
        )
        # Day 2: Absent
        AttendanceRecord.objects.create(
            student=student,
            session=sessions[1],
            status=AttendanceStatus.ABSENT,
        )
        # Day 3: Present!
        AttendanceRecord.objects.create(
            student=student,
            session=sessions[2],
            status=AttendanceStatus.PRESENT,
        )

        # No alert triggered
        assert Notification.objects.filter(notification_type=NotificationType.ATTENDANCE_ALERT).count() == 0

    def test_approved_leave_breaks_consecutive_absence_streak(self, alert_academic_setup):
        student = alert_academic_setup["student"]
        sessions = alert_academic_setup["sessions"]

        # Day 1: Absent
        AttendanceRecord.objects.create(
            student=student,
            session=sessions[0],
            status=AttendanceStatus.ABSENT,
        )
        # Day 2: Approved Leave
        AttendanceRecord.objects.create(
            student=student,
            session=sessions[1],
            status=AttendanceStatus.APPROVED_LEAVE,
        )
        # Day 3: Absent (only 1 consecutive trailing absence)
        AttendanceRecord.objects.create(
            student=student,
            session=sessions[2],
            status=AttendanceStatus.ABSENT,
        )

        assert Notification.objects.filter(notification_type=NotificationType.ATTENDANCE_ALERT).count() == 0

    def test_idempotency_prevents_duplicate_notifications(self, alert_academic_setup):
        student = alert_academic_setup["student"]
        sessions = alert_academic_setup["sessions"]

        # Create 3 absences
        for i in range(3):
            AttendanceRecord.objects.create(
                student=student,
                session=sessions[i],
                status=AttendanceStatus.ABSENT,
            )

        initial_count = Notification.objects.filter(notification_type=NotificationType.ATTENDANCE_ALERT).count()
        assert initial_count > 0

        # Trigger check again explicitly on the same session
        check_and_create_consecutive_absence_alert(student.id, sessions[2])

        # Count must remain exactly the same
        assert Notification.objects.filter(notification_type=NotificationType.ATTENDANCE_ALERT).count() == initial_count

    def test_manual_attendance_api_triggers_alert(self, api_client, alert_academic_setup):
        student = alert_academic_setup["student"]
        sessions = alert_academic_setup["sessions"]
        super_admin = alert_academic_setup["super_admin"]

        # 2 prior absences
        AttendanceRecord.objects.create(
            student=student,
            session=sessions[0],
            status=AttendanceStatus.ABSENT,
        )
        AttendanceRecord.objects.create(
            student=student,
            session=sessions[1],
            status=AttendanceStatus.ABSENT,
        )

        api_client.force_authenticate(user=super_admin)
        # Admin submits manual attendance for 3rd session via API
        payload = {
            "items": [
                {
                    "student_id": student.id,
                    "status": "absent",
                    "reason": "Family emergency reported",
                }
            ]
        }
        res = api_client.post(
            f"/api/v1/class-sessions/{sessions[2].id}/attendance/manual/",
            data=payload,
            format="json",
        )
        assert res.status_code == 200

        # Verify admin received the consecutive absence alert
        admin_alert = Notification.objects.filter(
            recipient=super_admin,
            notification_type=NotificationType.ATTENDANCE_ALERT,
        ).first()
        assert admin_alert is not None
        assert admin_alert.data_payload["consecutive_absences"] == 3

