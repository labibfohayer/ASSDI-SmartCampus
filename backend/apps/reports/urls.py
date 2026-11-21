from django.urls import path

from apps.reports.views import (
    BatchWisePerformanceReportView,
    CoordinatorDashboardView,
    DailyAttendanceReportView,
    DailyLearningProgressReportView,
    MonthlyStudentPerformanceReportView,
    RepeatedAbsencesReportView,
    StudentHelpRequestsReportView,
    TeacherWiseReportView,
    TopicWiseUnderstandingReportView,
    WeeklyProgressReportView,
)

urlpatterns = [
    # Analytics Dashboard
    path(
        "analytics/coordinator-dashboard/",
        CoordinatorDashboardView.as_view(),
        name="coordinator-dashboard",
    ),
    # 9 SRS Reports
    path(
        "reports/daily-attendance/",
        DailyAttendanceReportView.as_view(),
        name="report-daily-attendance",
    ),
    path(
        "reports/daily-learning-progress/",
        DailyLearningProgressReportView.as_view(),
        name="report-daily-learning-progress",
    ),
    path(
        "reports/weekly-progress/",
        WeeklyProgressReportView.as_view(),
        name="report-weekly-progress",
    ),
    path(
        "reports/monthly-student-performance/",
        MonthlyStudentPerformanceReportView.as_view(),
        name="report-monthly-student-performance",
    ),
    path(
        "reports/batch-wise-performance/",
        BatchWisePerformanceReportView.as_view(),
        name="report-batch-wise-performance",
    ),
    path(
        "reports/topic-wise-understanding/",
        TopicWiseUnderstandingReportView.as_view(),
        name="report-topic-wise-understanding",
    ),
    path(
        "reports/teacher-wise/",
        TeacherWiseReportView.as_view(),
        name="report-teacher-wise",
    ),
    path(
        "reports/student-help-requests/",
        StudentHelpRequestsReportView.as_view(),
        name="report-student-help-requests",
    ),
    path(
        "reports/repeated-absences/",
        RepeatedAbsencesReportView.as_view(),
        name="report-repeated-absences",
    ),
]
