from django.db import models


class ReportType(models.TextChoices):
    DAILY_ATTENDANCE = "daily_attendance", "Daily Attendance"
    DAILY_LEARNING_PROGRESS = "daily_learning_progress", "Daily Learning Progress"
    WEEKLY_PROGRESS = "weekly_progress", "Weekly Progress"
    MONTHLY_STUDENT_PERFORMANCE = "monthly_student_performance", "Monthly Student Performance"
    BATCH_WISE_PERFORMANCE = "batch_wise_performance", "Batch-Wise Performance"
    TOPIC_WISE_UNDERSTANDING = "topic_wise_understanding", "Topic-Wise Understanding"
    TEACHER_WISE = "teacher_wise", "Teacher-Wise"
    STUDENT_HELP_REQUESTS = "student_help_requests", "Student Help Requests"
    REPEATED_ABSENCES = "repeated_absences", "Repeated Absences"
    COORDINATOR_DASHBOARD = "coordinator_dashboard", "Coordinator Dashboard"


class ExportFormat(models.TextChoices):
    JSON = "json", "JSON"
    PDF = "pdf", "PDF"
    XLSX = "xlsx", "Excel (.xlsx)"


REPORT_NAMES = {
    ReportType.DAILY_ATTENDANCE: "Daily Attendance Report",
    ReportType.DAILY_LEARNING_PROGRESS: "Daily Learning Progress Report",
    ReportType.WEEKLY_PROGRESS: "Weekly Progress Report",
    ReportType.MONTHLY_STUDENT_PERFORMANCE: "Monthly Student Performance Report",
    ReportType.BATCH_WISE_PERFORMANCE: "Batch-Wise Performance Report",
    ReportType.TOPIC_WISE_UNDERSTANDING: "Topic-Wise Understanding Report",
    ReportType.TEACHER_WISE: "Teacher-Wise Performance Report",
    ReportType.STUDENT_HELP_REQUESTS: "Student Help Requests Report",
    ReportType.REPEATED_ABSENCES: "Repeated Absences Report",
    ReportType.COORDINATOR_DASHBOARD: "Coordinator Dashboard Analytics",
}
