import datetime
import io
import zoneinfo
import openpyxl
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
from apps.attendance.models import AttendanceMethod, AttendanceRecord, AttendanceStatus
from apps.audit.models import AuditLog
from apps.batches.models import Batch, BatchStatus, TeacherAssignment
from apps.class_sessions.models import ClassSession, SessionAudience, SessionStatus
from apps.feedback.models import HelpRequest, HelpRequestStatus, LearningFeedback
from apps.reports.constants import ExportFormat, ReportType
from apps.reports.models import ReportLog
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
def report_setup_data(db):
    """Creates a comprehensive institutional dataset for testing reports and analytics."""
    dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
    today = timezone.now().astimezone(dhaka_tz).date()

    # Campus & Courses
    campus = Campus.objects.create(name="Main Campus", code="MC-01", gender_campus=CampusGender.MALE)
    course_1 = Course.objects.create(code="SBMC-01", name="Small Business Management", duration_months=3)
    course_2 = Course.objects.create(code="GD-01", name="Graphic Design", duration_months=4)

    # Users
    admin_user = User.objects.create_user(
        login_id="ADM-001",
        password="AdminPass123!",
        full_name="Super Administrator",
        role=UserRole.SUPER_ADMIN,
    )
    coord_user_1 = User.objects.create_user(
        login_id="CRD-001",
        password="CoordPass123!",
        full_name="Coordinator One",
        role=UserRole.COORDINATOR,
    )
    CoordinatorCourseAssignment.objects.create(user=coord_user_1, course=course_1)

    coord_user_2 = User.objects.create_user(
        login_id="CRD-002",
        password="CoordPass123!",
        full_name="Coordinator Two",
        role=UserRole.COORDINATOR,
    )
    CoordinatorCourseAssignment.objects.create(user=coord_user_2, course=course_2)

    teacher_1 = User.objects.create_user(
        login_id="TCH-001",
        password="TeacherPass123!",
        full_name="Teacher One",
        role=UserRole.TEACHER,
    )
    teacher_2 = User.objects.create_user(
        login_id="TCH-002",
        password="TeacherPass123!",
        full_name="Teacher Two",
        role=UserRole.TEACHER,
    )
    observer_user = User.objects.create_user(
        login_id="OBS-001",
        password="ObserverPass123!",
        full_name="Observer One",
        role=UserRole.OBSERVER,
    )

    # Subjects & Topics
    subj_acct = Subject.objects.create(course=course_1, name="Accounting", code="ACC-101", audience_type=SubjectAudience.ALL)
    subj_design = Subject.objects.create(course=course_2, name="Photoshop Basics", code="DES-101", audience_type=SubjectAudience.ALL)

    topic_1 = ClassTopic.objects.create(subject=subj_acct, title="Ledger Posting", learning_objectives="Post debit and credit entries")
    topic_2 = ClassTopic.objects.create(subject=subj_acct, title="Balance Sheet", learning_objectives="Prepare balance sheet")
    topic_design = ClassTopic.objects.create(subject=subj_design, title="Layers & Masks", learning_objectives="Master masking")

    # Batches
    batch_42 = Batch.objects.create(
        course=course_1,
        name="SBMC Batch 42",
        batch_number=42,
        campus=campus,
        start_date=today - datetime.timedelta(days=30),
        end_date=today + datetime.timedelta(days=60),
        status=BatchStatus.ACTIVE,
    )
    batch_43 = Batch.objects.create(
        course=course_2,
        name="GD Batch 43",
        batch_number=43,
        campus=campus,
        start_date=today - datetime.timedelta(days=15),
        end_date=today + datetime.timedelta(days=75),
        status=BatchStatus.ACTIVE,
    )

    TeacherAssignment.objects.create(batch=batch_42, subject=subj_acct, teacher_user=teacher_1)
    TeacherAssignment.objects.create(batch=batch_43, subject=subj_design, teacher_user=teacher_2)

    # Students & Enrollments
    # Student 1: Good attendance & feedback
    user_s1 = User.objects.create_user(login_id="STD-001", password="StudentPass123!", full_name="Student One", role=UserRole.STUDENT, phone="01711111111")
    s1 = Student.objects.create(user=user_s1, student_id_number="STD-001", registration_no="REG-001", education_background=EducationBackground.GENERAL, campus=campus)
    Enrollment.objects.create(student=s1, batch=batch_42, status=EnrollmentStatus.ACTIVE)

    # Student 2: Repeated absences
    user_s2 = User.objects.create_user(login_id="STD-002", password="StudentPass123!", full_name="Student Two", role=UserRole.STUDENT, phone="01722222222")
    s2 = Student.objects.create(user=user_s2, student_id_number="STD-002", registration_no="REG-002", education_background=EducationBackground.ALIYA, campus=campus)
    Enrollment.objects.create(student=s2, batch=batch_42, status=EnrollmentStatus.ACTIVE)

    # Student 3: Low understanding rating
    user_s3 = User.objects.create_user(login_id="STD-003", password="StudentPass123!", full_name="Student Three", role=UserRole.STUDENT, phone="01733333333")
    s3 = Student.objects.create(user=user_s3, student_id_number="STD-003", registration_no="REG-003", education_background=EducationBackground.GENERAL, campus=campus)
    Enrollment.objects.create(student=s3, batch=batch_42, status=EnrollmentStatus.ACTIVE)

    # Student 4 (in batch 43)
    user_s4 = User.objects.create_user(login_id="STD-004", password="StudentPass123!", full_name="Student Four", role=UserRole.STUDENT, phone="01744444444")
    s4 = Student.objects.create(user=user_s4, student_id_number="STD-004", registration_no="REG-004", education_background=EducationBackground.QAWMI, campus=campus)
    Enrollment.objects.create(student=s4, batch=batch_43, status=EnrollmentStatus.ACTIVE)

    # Class Sessions
    # Session 1: Today
    session_today = ClassSession.objects.create(
        batch=batch_42,
        subject=subj_acct,
        topic=topic_1,
        teacher_user=teacher_1,
        session_date=today,
        start_time=datetime.time(9, 0),
        end_time=datetime.time(10, 30),
        audience=SessionAudience.ALL,
        status=SessionStatus.PUBLISHED,
    )
    # Session 2: Past (3 days ago)
    session_past_1 = ClassSession.objects.create(
        batch=batch_42,
        subject=subj_acct,
        topic=topic_1,
        teacher_user=teacher_1,
        session_date=today - datetime.timedelta(days=3),
        start_time=datetime.time(9, 0),
        end_time=datetime.time(10, 30),
        audience=SessionAudience.ALL,
        status=SessionStatus.PUBLISHED,
    )
    # Session 3: Past (4 days ago)
    session_past_2 = ClassSession.objects.create(
        batch=batch_42,
        subject=subj_acct,
        topic=topic_2,
        teacher_user=teacher_1,
        session_date=today - datetime.timedelta(days=4),
        start_time=datetime.time(9, 0),
        end_time=datetime.time(10, 30),
        audience=SessionAudience.ALL,
        status=SessionStatus.PUBLISHED,
    )

    # Attendance Records
    # Session today: s1 present, s2 absent, s3 present
    AttendanceRecord.objects.create(session=session_today, student=s1, status=AttendanceStatus.PRESENT, method=AttendanceMethod.QR)
    AttendanceRecord.objects.create(session=session_today, student=s2, status=AttendanceStatus.ABSENT, method=AttendanceMethod.AUTO_ABSENT)
    AttendanceRecord.objects.create(session=session_today, student=s3, status=AttendanceStatus.PRESENT, method=AttendanceMethod.QR)

    # Session past 1: s1 present, s2 absent, s3 late
    AttendanceRecord.objects.create(session=session_past_1, student=s1, status=AttendanceStatus.PRESENT, method=AttendanceMethod.QR)
    AttendanceRecord.objects.create(session=session_past_1, student=s2, status=AttendanceStatus.ABSENT, method=AttendanceMethod.AUTO_ABSENT)
    AttendanceRecord.objects.create(session=session_past_1, student=s3, status=AttendanceStatus.LATE, method=AttendanceMethod.MANUAL)

    # Session past 2: s1 present, s2 absent, s3 present
    AttendanceRecord.objects.create(session=session_past_2, student=s1, status=AttendanceStatus.PRESENT, method=AttendanceMethod.QR)
    AttendanceRecord.objects.create(session=session_past_2, student=s2, status=AttendanceStatus.ABSENT, method=AttendanceMethod.AUTO_ABSENT)
    AttendanceRecord.objects.create(session=session_past_2, student=s3, status=AttendanceStatus.PRESENT, method=AttendanceMethod.QR)

    # Feedback:
    # s1 gives 5 stars
    fb_s1 = LearningFeedback.objects.create(
        session=session_today, student=s1, topic=topic_1, understanding_rating=5, needs_help=False, student_comment="Understood well"
    )
    # s3 gives 2 stars (needs help)
    fb_s3 = LearningFeedback.objects.create(
        session=session_today, student=s3, topic=topic_1, understanding_rating=2, needs_help=True, student_comment="Need help on debit rule"
    )
    # Help request for s3
    hr_s3 = HelpRequest.objects.create(
        feedback=fb_s3,
        student=s3,
        teacher_user=teacher_1,
        session=session_today,
        topic=topic_1,
        student_message="Need help on debit rule",
        status=HelpRequestStatus.PENDING,
    )

    return {
        "admin_user": admin_user,
        "coord_user_1": coord_user_1,
        "coord_user_2": coord_user_2,
        "teacher_1": teacher_1,
        "teacher_2": teacher_2,
        "observer_user": observer_user,
        "student_user_1": user_s1,
        "course_1": course_1,
        "course_2": course_2,
        "batch_42": batch_42,
        "batch_43": batch_43,
        "s1": s1,
        "s2": s2,
        "s3": s3,
        "s4": s4,
        "session_today": session_today,
        "today": today,
        "topic_1": topic_1,
        "topic_2": topic_2,
    }


# =============================================================================
# 1. Coordinator Dashboard Tests
# =============================================================================

@pytest.mark.django_db
def test_coordinator_dashboard_aggregates_and_filters(api_client, report_setup_data):
    """Test dashboard metrics, calculations and filtering for super_admin and coordinator."""
    data = report_setup_data
    api_client.force_authenticate(user=data["coord_user_1"])

    url = "/api/v1/analytics/coordinator-dashboard/"
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK

    res = response.json()
    assert res["total_students"] == 3  # s1, s2, s3 in batch 42
    assert res["total_active_batches"] == 1  # batch 42 (batch 43 belongs to course 2)
    assert res["total_teachers"] == 1  # teacher 1
    assert res["todays_classes"] == 1
    assert res["total_help_requests"] == 1
    assert res["pending_help_requests"] == 1

    # Check attendance percentage:
    # 9 total records in batch 42 (6 present, 1 late, 2 absent, etc):
    # s1: 3 present; s2: 3 absent; s3: 2 present, 1 late -> total=9, present=5, late=1, absent=3.
    # (5 + 1) / 9 * 100 = 66.67%
    assert res["overall_attendance_percentage"] is not None
    assert 60.0 <= res["overall_attendance_percentage"] <= 70.0

    # Check overall learning progress: ratings 5 and 2 -> avg 3.5, pct 70.0%
    assert res["overall_learning_progress"]["average_rating"] == 3.5
    assert res["overall_learning_progress"]["average_percentage"] == 70.0

    # Repeated absences: s2 has 3 consecutive absences
    assert res["repeated_absence_count"] == 1
    assert len(res["repeated_absences"]) == 1
    assert res["repeated_absences"][0]["student_id"] == data["s2"].id

    # Students requiring attention: s2 (repeated absences) and s3 (avg rating 2.0 <= 2.0)
    assert res["students_requiring_attention_count"] == 2


@pytest.mark.django_db
def test_coordinator_unassigned_course_forbidden(api_client, report_setup_data):
    """Coordinator assigned to course 1 cannot filter by unassigned course 2 or batch 43."""
    data = report_setup_data
    api_client.force_authenticate(user=data["coord_user_1"])

    url = "/api/v1/analytics/coordinator-dashboard/"
    # Filter unassigned course 2
    res = api_client.get(f"{url}?course={data['course_2'].id}")
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # Filter unassigned batch 43
    res = api_client.get(f"{url}?batch={data['batch_43'].id}")
    assert res.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_student_forbidden_on_dashboard_and_reports(api_client, report_setup_data):
    """Students are strictly forbidden from dashboard and all report endpoints."""
    data = report_setup_data
    api_client.force_authenticate(user=data["student_user_1"])

    endpoints = [
        "/api/v1/analytics/coordinator-dashboard/",
        "/api/v1/reports/daily-attendance/",
        "/api/v1/reports/daily-learning-progress/",
        "/api/v1/reports/weekly-progress/",
        "/api/v1/reports/monthly-student-performance/",
        "/api/v1/reports/batch-wise-performance/",
        "/api/v1/reports/topic-wise-understanding/",
        "/api/v1/reports/teacher-wise/",
        "/api/v1/reports/student-help-requests/",
        "/api/v1/reports/repeated-absences/",
    ]
    for ep in endpoints:
        res = api_client.get(ep)
        assert res.status_code == status.HTTP_403_FORBIDDEN, f"Failed on endpoint: {ep}"


@pytest.mark.django_db
def test_teacher_permissions_and_scoping(api_client, report_setup_data):
    """Teachers receive 403 on dashboard and teacher-wise report, and are scoped to assigned batches."""
    data = report_setup_data
    api_client.force_authenticate(user=data["teacher_1"])

    # 403 on coordinator dashboard
    res = api_client.get("/api/v1/analytics/coordinator-dashboard/")
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # 403 on teacher-wise supervisory report
    res = api_client.get("/api/v1/reports/teacher-wise/")
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # 403 when filtering unassigned batch 43
    res = api_client.get(f"/api/v1/reports/daily-attendance/?batch={data['batch_43'].id}")
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # 200 on assigned batch 42
    res = api_client.get(f"/api/v1/reports/daily-attendance/?batch={data['batch_42'].id}")
    assert res.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_observer_aggregate_access_and_private_report_forbidden(api_client, report_setup_data):
    """Observer gets aggregate access with personal info stripped, and 403 on individual reports."""
    data = report_setup_data
    api_client.force_authenticate(user=data["observer_user"])

    # Observer dashboard: 200 OK, but repeated_absences and students_requiring_attention are count-only
    res = api_client.get("/api/v1/analytics/coordinator-dashboard/")
    assert res.status_code == status.HTTP_200_OK
    body = res.json()
    assert body["repeated_absence_count"] == 1
    assert body["repeated_absences"] == []  # Individual student list masked
    assert body["students_requiring_attention_count"] == 2
    assert body["students_requiring_attention"] == []  # Individual student list masked

    # Observer aggregate reports: 200 OK
    assert api_client.get("/api/v1/reports/daily-attendance/").status_code == status.HTTP_200_OK
    assert api_client.get("/api/v1/reports/daily-learning-progress/").status_code == status.HTTP_200_OK
    assert api_client.get("/api/v1/reports/weekly-progress/").status_code == status.HTTP_200_OK
    assert api_client.get("/api/v1/reports/batch-wise-performance/").status_code == status.HTTP_200_OK
    assert api_client.get("/api/v1/reports/topic-wise-understanding/").status_code == status.HTTP_200_OK
    assert api_client.get("/api/v1/reports/teacher-wise/").status_code == status.HTTP_200_OK

    # Observer individual reports: 403 FORBIDDEN
    assert api_client.get("/api/v1/reports/monthly-student-performance/").status_code == status.HTTP_403_FORBIDDEN
    assert api_client.get("/api/v1/reports/student-help-requests/").status_code == status.HTTP_403_FORBIDDEN
    assert api_client.get("/api/v1/reports/repeated-absences/").status_code == status.HTTP_403_FORBIDDEN


# =============================================================================
# 2. Individual Reports Verification Tests
# =============================================================================

@pytest.mark.django_db
def test_daily_attendance_and_learning_progress_reports(api_client, report_setup_data):
    """Tests reports 1 & 2: Daily Attendance and Daily Learning Progress."""
    data = report_setup_data
    api_client.force_authenticate(user=data["coord_user_1"])

    # 1. Daily Attendance
    att_res = api_client.get(f"/api/v1/reports/daily-attendance/?date={data['today'].isoformat()}")
    assert att_res.status_code == status.HTTP_200_OK
    att_json = att_res.json()
    assert att_json["total_sessions"] == 1
    assert att_json["present_count"] == 2
    assert att_json["absent_count"] == 1
    assert att_json["total_records"] == 3
    # (2 / 3) * 100 = 66.67%
    assert round(att_json["attendance_percentage"], 1) == 66.7

    # 2. Daily Learning Progress
    lp_res = api_client.get(f"/api/v1/reports/daily-learning-progress/?date={data['today'].isoformat()}")
    assert lp_res.status_code == status.HTTP_200_OK
    lp_json = lp_res.json()
    assert lp_json["total_sessions"] == 1
    assert lp_json["total_feedbacks"] == 2
    assert lp_json["average_rating"] == 3.5
    assert lp_json["average_percentage"] == 70.0
    assert lp_json["band_distribution"]["band_81_100"] == 1  # 5 stars
    assert lp_json["band_distribution"]["band_21_40"] == 1   # 2 stars
    assert lp_json["sessions"][0]["needs_help_count"] == 1


@pytest.mark.django_db
def test_weekly_progress_and_monthly_performance_reports(api_client, report_setup_data):
    """Tests reports 3 & 4: Weekly Progress and Monthly Student Performance."""
    data = report_setup_data
    api_client.force_authenticate(user=data["coord_user_1"])

    # 3. Weekly Progress
    start_str = (data["today"] - datetime.timedelta(days=6)).isoformat()
    end_str = data["today"].isoformat()
    week_res = api_client.get(f"/api/v1/reports/weekly-progress/?week_start={start_str}&week_end={end_str}")
    assert week_res.status_code == status.HTTP_200_OK
    week_json = week_res.json()
    assert week_json["total_classes"] == 3
    assert len(week_json["daily_breakdown"]) == 7

    # 4. Monthly Student Performance (Individual)
    month_res = api_client.get(
        f"/api/v1/reports/monthly-student-performance/?year={data['today'].year}&month={data['today'].month}&batch={data['batch_42'].id}"
    )
    assert month_res.status_code == status.HTTP_200_OK
    month_json = month_res.json()
    assert month_json["total_students"] == 3
    students_by_id = {s["student_id"]: s for s in month_json["students"]}
    assert students_by_id[data["s1"].id]["present_count"] == 3
    assert students_by_id[data["s1"].id]["status"] == "Satisfactory"
    assert students_by_id[data["s2"].id]["absent_count"] == 3
    assert students_by_id[data["s2"].id]["status"] == "Needs Attention"


@pytest.mark.django_db
def test_batch_wise_topic_wise_and_teacher_wise_reports(api_client, report_setup_data):
    """Tests reports 5, 6, 7: Batch-Wise, Topic-Wise, and Teacher-Wise."""
    data = report_setup_data
    api_client.force_authenticate(user=data["admin_user"])

    # 5. Batch-Wise Performance
    batch_res = api_client.get("/api/v1/reports/batch-wise-performance/")
    assert batch_res.status_code == status.HTTP_200_OK
    batch_json = batch_res.json()
    assert batch_json["total_batches"] == 2

    # 6. Topic-Wise Understanding
    topic_res = api_client.get("/api/v1/reports/topic-wise-understanding/")
    assert topic_res.status_code == status.HTTP_200_OK
    topic_json = topic_res.json()
    assert topic_json["total_topics"] >= 1
    t1 = next(t for t in topic_json["topics"] if t["topic_id"] == data["topic_1"].id)
    assert t1["total_feedbacks"] == 2
    assert t1["needs_help_count"] == 1

    # 7. Teacher-Wise Performance
    t_res = api_client.get("/api/v1/reports/teacher-wise/")
    assert t_res.status_code == status.HTTP_200_OK
    t_json = t_res.json()
    assert t_json["total_teachers"] == 2
    t1_item = next(t for t in t_json["teachers"] if t["teacher_id"] == str(data["teacher_1"].id))
    assert t1_item["classes_conducted"] == 3
    assert t1_item["help_requests_received"] == 1


@pytest.mark.django_db
def test_student_help_requests_and_repeated_absences_reports(api_client, report_setup_data):
    """Tests reports 8 & 9: Student Help Requests and Repeated Absences."""
    data = report_setup_data
    api_client.force_authenticate(user=data["coord_user_1"])

    # 8. Student Help Requests
    hr_res = api_client.get("/api/v1/reports/student-help-requests/")
    assert hr_res.status_code == status.HTTP_200_OK
    hr_json = hr_res.json()
    assert hr_json["total_help_requests"] == 1
    assert hr_json["pending_count"] == 1
    assert hr_json["help_requests"][0]["student_id"] == data["s3"].id

    # 9. Repeated Absences Report
    rep_res = api_client.get("/api/v1/reports/repeated-absences/?threshold_consecutive=3")
    assert rep_res.status_code == status.HTTP_200_OK
    rep_json = rep_res.json()
    assert rep_json["total_flagged_students"] == 1
    flagged = rep_json["flagged_students"][0]
    assert flagged["student_id"] == data["s2"].id
    assert flagged["consecutive_absences"] == 3
    assert flagged["total_absences"] == 3


# =============================================================================
# 3. Export & Audit Logging Tests (PDF and Excel)
# =============================================================================

@pytest.mark.django_db
def test_xlsx_export_generates_valid_workbook(api_client, report_setup_data):
    """Tests ?export=xlsx returns valid openpyxl spreadsheet across endpoints."""
    data = report_setup_data
    api_client.force_authenticate(user=data["coord_user_1"])

    endpoints = [
        "/api/v1/analytics/coordinator-dashboard/?export=xlsx",
        "/api/v1/reports/daily-attendance/?export=xlsx",
        "/api/v1/reports/daily-learning-progress/?export=xlsx",
        "/api/v1/reports/weekly-progress/?export=xlsx",
        f"/api/v1/reports/monthly-student-performance/?batch={data['batch_42'].id}&export=xlsx",
        "/api/v1/reports/batch-wise-performance/?export=xlsx",
        "/api/v1/reports/topic-wise-understanding/?export=xlsx",
        "/api/v1/reports/student-help-requests/?export=xlsx",
        "/api/v1/reports/repeated-absences/?export=xlsx",
    ]

    for ep in endpoints:
        res = api_client.get(ep)
        assert res.status_code == status.HTTP_200_OK, f"Failed XLSX export for {ep}"
        assert res["Content-Type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert "attachment; filename=" in res["Content-Disposition"]
        assert res["Content-Disposition"].endswith('.xlsx"')

        # Verify workbook opens cleanly with openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(res.content))
        assert "Report" in wb.sheetnames
        ws = wb["Report"]
        assert ws["A1"].value == "As-Sunnah Skill Development Institute (ASSDI)"


@pytest.mark.django_db
def test_pdf_export_generates_valid_pdf(api_client, report_setup_data):
    """Tests ?export=pdf returns valid binary PDF starting with %PDF- across endpoints."""
    data = report_setup_data
    api_client.force_authenticate(user=data["coord_user_1"])

    endpoints = [
        "/api/v1/analytics/coordinator-dashboard/?export=pdf",
        "/api/v1/reports/daily-attendance/?export=pdf",
        "/api/v1/reports/daily-learning-progress/?export=pdf",
        "/api/v1/reports/weekly-progress/?export=pdf",
        f"/api/v1/reports/monthly-student-performance/?batch={data['batch_42'].id}&export=pdf",
        "/api/v1/reports/batch-wise-performance/?export=pdf",
        "/api/v1/reports/topic-wise-understanding/?export=pdf",
        "/api/v1/reports/student-help-requests/?export=pdf",
        "/api/v1/reports/repeated-absences/?export=pdf",
    ]

    for ep in endpoints:
        res = api_client.get(ep)
        assert res.status_code == status.HTTP_200_OK, f"Failed PDF export for {ep}"
        assert res["Content-Type"] == "application/pdf"
        assert "attachment; filename=" in res["Content-Disposition"]
        assert res["Content-Disposition"].endswith('.pdf"')
        assert res.content.startswith(b"%PDF-")


@pytest.mark.django_db
def test_export_creates_report_log_and_audit_log(api_client, report_setup_data):
    """Exporting PDF or Excel creates corresponding ReportLog and AuditLog rows."""
    data = report_setup_data
    api_client.force_authenticate(user=data["coord_user_1"])

    ReportLog.objects.all().delete()
    AuditLog.objects.all().delete()

    # 1. Export PDF
    pdf_url = f"/api/v1/reports/daily-attendance/?export=pdf&batch={data['batch_42'].id}"
    pdf_res = api_client.get(pdf_url)
    assert pdf_res.status_code == status.HTTP_200_OK

    r_log = ReportLog.objects.filter(report_type=ReportType.DAILY_ATTENDANCE, export_format=ExportFormat.PDF).first()
    assert r_log is not None
    assert r_log.generated_by == data["coord_user_1"]
    assert "batch" in r_log.filters_json

    a_log = AuditLog.objects.filter(action="EXPORT_REPORT_PDF", entity_name="Report").first()
    assert a_log is not None
    assert a_log.actor_user == data["coord_user_1"]
    assert a_log.entity_id == ReportType.DAILY_ATTENDANCE

    # 2. Export XLSX
    xlsx_url = "/api/v1/analytics/coordinator-dashboard/?export=xlsx"
    xlsx_res = api_client.get(xlsx_url)
    assert xlsx_res.status_code == status.HTTP_200_OK

    r_log_2 = ReportLog.objects.filter(report_type=ReportType.COORDINATOR_DASHBOARD, export_format=ExportFormat.XLSX).first()
    assert r_log_2 is not None

    a_log_2 = AuditLog.objects.filter(action="EXPORT_REPORT_XLSX", entity_name="Report").first()
    assert a_log_2 is not None
