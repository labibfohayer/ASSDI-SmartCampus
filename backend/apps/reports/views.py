import zoneinfo
from typing import Any, Dict

from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditLog
from apps.reports.constants import ExportFormat, ReportType
from apps.reports.models import ReportLog
from apps.reports.serializers import (
    BatchWisePerformanceReportSerializer,
    CoordinatorDashboardSerializer,
    DailyAttendanceReportSerializer,
    DailyLearningProgressReportSerializer,
    MonthlyStudentPerformanceReportSerializer,
    RepeatedAbsencesReportSerializer,
    ReportLogSerializer,
    StudentHelpRequestsReportSerializer,
    TeacherWiseReportSerializer,
    TopicWiseUnderstandingReportSerializer,
    WeeklyProgressReportSerializer,
)
from apps.reports.services.dashboard_service import CoordinatorDashboardService
from apps.reports.services.excel_service import ExcelExportService
from apps.reports.services.pdf_service import PDFExportService
from apps.reports.services.docx_service import WordExportService
from apps.reports.services.pptx_service import PowerPointExportService
from apps.reports.services.csv_service import CSVExportService
from apps.reports.services.report_service import ReportService


def handle_export_or_json(request, report_type: str, data: Dict[str, Any], filename_prefix: str) -> HttpResponse:
    """
    Handles PDF, DOCX, PPTX, XLSX, and CSV file downloads or returns JSON response.
    Writes ReportLog and AuditLog records upon file export.
    """
    export_format = (
        request.query_params.get("export") or request.query_params.get("format") or "json"
    ).lower()
    user_name = request.user.full_name if request.user.is_authenticated else "Staff"
    filters = dict(request.query_params.items())

    valid_export_formats = [
        ExportFormat.PDF,
        ExportFormat.XLSX,
        ExportFormat.DOCX,
        ExportFormat.PPTX,
        ExportFormat.CSV,
    ]

    if export_format in valid_export_formats:
        # 1. Create ReportLog entry
        ReportLog.objects.create(
            report_type=report_type,
            export_format=export_format,
            filters_json=filters,
            generated_by=request.user if request.user.is_authenticated else None,
        )

        # 2. Create AuditLog entry
        AuditLog.objects.create(
            actor_user=request.user if request.user.is_authenticated else None,
            action=f"EXPORT_REPORT_{export_format.upper()}",
            entity_name="Report",
            entity_id=str(report_type),
            old_values=None,
            new_values={
                "format": export_format,
                "filters": filters,
            },
            ip_address=request.META.get("REMOTE_ADDR"),
        )

        dhaka_tz = zoneinfo.ZoneInfo("Asia/Dhaka")
        ts = timezone.now().astimezone(dhaka_tz).strftime("%Y%m%d_%H%M%S")

        if export_format == ExportFormat.PDF:
            pdf_buf = PDFExportService.generate_pdf(report_type, data, user_name, filters)
            response = HttpResponse(pdf_buf.getvalue(), content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="{filename_prefix}_{ts}.pdf"'
            return response

        elif export_format == ExportFormat.XLSX:
            xlsx_buf = ExcelExportService.generate_excel(report_type, data, user_name, filters)
            response = HttpResponse(
                xlsx_buf.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename_prefix}_{ts}.xlsx"'
            return response

        elif export_format == ExportFormat.DOCX:
            docx_buf = WordExportService.generate_docx(report_type, data, user_name, filters)
            response = HttpResponse(
                docx_buf.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename_prefix}_{ts}.docx"'
            return response

        elif export_format == ExportFormat.PPTX:
            pptx_buf = PowerPointExportService.generate_pptx(report_type, data, user_name, filters)
            response = HttpResponse(
                pptx_buf.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename_prefix}_{ts}.pptx"'
            return response

        elif export_format == ExportFormat.CSV:
            csv_buf = CSVExportService.generate_csv(report_type, data, user_name, filters)
            response = HttpResponse(csv_buf.getvalue(), content_type="text/csv; charset=utf-8")
            response["Content-Disposition"] = f'attachment; filename="{filename_prefix}_{ts}.csv"'
            return response

    return Response(data, status=status.HTTP_200_OK)


# Common export parameters for documentation
EXPORT_PARAMS = [
    OpenApiParameter(
        name="export",
        type=str,
        location=OpenApiParameter.QUERY,
        description="Export format: 'pdf' or 'xlsx'. Omit for standard JSON response.",
        enum=["pdf", "xlsx", "json"],
    ),
    OpenApiParameter(
        name="format",
        type=str,
        location=OpenApiParameter.QUERY,
        description="Synonym for 'export'.",
    ),
]


class CoordinatorDashboardView(APIView):
    """
    Coordinator & Management Analytics Dashboard API.
    Provides key institutional KPIs, batch performances, teacher activities, and alerts.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Analytics & Dashboard"],
        parameters=EXPORT_PARAMS
        + [
            OpenApiParameter("course", int, OpenApiParameter.QUERY, description="Course ID"),
            OpenApiParameter("batch", int, OpenApiParameter.QUERY, description="Batch ID"),
            OpenApiParameter("teacher", str, OpenApiParameter.QUERY, description="Teacher User ID"),
            OpenApiParameter("date_from", str, OpenApiParameter.QUERY, description="Start date (YYYY-MM-DD)"),
            OpenApiParameter("date_to", str, OpenApiParameter.QUERY, description="End date (YYYY-MM-DD)"),
            OpenApiParameter("topic", int, OpenApiParameter.QUERY, description="Topic ID"),
            OpenApiParameter("attendance_status", str, OpenApiParameter.QUERY, description="Attendance status"),
            OpenApiParameter("help_request_status", str, OpenApiParameter.QUERY, description="Help request status"),
        ],
        responses={200: CoordinatorDashboardSerializer},
    )
    def get(self, request):
        filters = dict(request.query_params.items())
        data = CoordinatorDashboardService.get_dashboard_data(request.user, filters)
        return handle_export_or_json(
            request, ReportType.COORDINATOR_DASHBOARD, data, "coordinator_dashboard"
        )


class DailyAttendanceReportView(APIView):
    """1. Daily Attendance Report: Breakdown of attendance across sessions for a given date."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Reports"],
        parameters=EXPORT_PARAMS
        + [
            OpenApiParameter("date", str, OpenApiParameter.QUERY, description="Date in YYYY-MM-DD (defaults to today in Asia/Dhaka)"),
            OpenApiParameter("batch", int, OpenApiParameter.QUERY, description="Filter by Batch ID"),
            OpenApiParameter("course", int, OpenApiParameter.QUERY, description="Filter by Course ID"),
        ],
        responses={200: DailyAttendanceReportSerializer},
    )
    def get(self, request):
        filters = dict(request.query_params.items())
        data = ReportService.get_daily_attendance_report(request.user, filters)
        return handle_export_or_json(
            request, ReportType.DAILY_ATTENDANCE, data, "daily_attendance"
        )


class DailyLearningProgressReportView(APIView):
    """2. Daily Learning Progress Report: Topic feedback ratings, understanding bands, and pending counts."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Reports"],
        parameters=EXPORT_PARAMS
        + [
            OpenApiParameter("date", str, OpenApiParameter.QUERY, description="Date in YYYY-MM-DD (defaults to today in Asia/Dhaka)"),
            OpenApiParameter("batch", int, OpenApiParameter.QUERY, description="Filter by Batch ID"),
            OpenApiParameter("course", int, OpenApiParameter.QUERY, description="Filter by Course ID"),
        ],
        responses={200: DailyLearningProgressReportSerializer},
    )
    def get(self, request):
        filters = dict(request.query_params.items())
        data = ReportService.get_daily_learning_progress_report(request.user, filters)
        return handle_export_or_json(
            request, ReportType.DAILY_LEARNING_PROGRESS, data, "daily_learning_progress"
        )


class WeeklyProgressReportView(APIView):
    """3. Weekly Progress Report: Multi-day trend of classes, attendance rates, and feedback averages."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Reports"],
        parameters=EXPORT_PARAMS
        + [
            OpenApiParameter("week_start", str, OpenApiParameter.QUERY, description="Start date (YYYY-MM-DD)"),
            OpenApiParameter("week_end", str, OpenApiParameter.QUERY, description="End date (YYYY-MM-DD)"),
            OpenApiParameter("batch", int, OpenApiParameter.QUERY, description="Batch ID"),
            OpenApiParameter("course", int, OpenApiParameter.QUERY, description="Course ID"),
        ],
        responses={200: WeeklyProgressReportSerializer},
    )
    def get(self, request):
        filters = dict(request.query_params.items())
        data = ReportService.get_weekly_progress_report(request.user, filters)
        return handle_export_or_json(
            request, ReportType.WEEKLY_PROGRESS, data, "weekly_progress"
        )


class MonthlyStudentPerformanceReportView(APIView):
    """4. Monthly Student Performance Report: Individual student attendance, ratings, and status."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Reports"],
        parameters=EXPORT_PARAMS
        + [
            OpenApiParameter("year", int, OpenApiParameter.QUERY, description="Year (e.g. 2026)"),
            OpenApiParameter("month", int, OpenApiParameter.QUERY, description="Month (1-12)"),
            OpenApiParameter("batch", int, OpenApiParameter.QUERY, description="Batch ID"),
            OpenApiParameter("student", str, OpenApiParameter.QUERY, description="Student ID or Student ID Number"),
        ],
        responses={200: MonthlyStudentPerformanceReportSerializer},
    )
    def get(self, request):
        filters = dict(request.query_params.items())
        data = ReportService.get_monthly_student_performance_report(request.user, filters)
        return handle_export_or_json(
            request, ReportType.MONTHLY_STUDENT_PERFORMANCE, data, "monthly_student_performance"
        )


class BatchWisePerformanceReportView(APIView):
    """5. Batch-Wise Performance Report: Cross-batch comparison of attendance and feedback metrics."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Reports"],
        parameters=EXPORT_PARAMS
        + [
            OpenApiParameter("course", int, OpenApiParameter.QUERY, description="Course ID"),
            OpenApiParameter("batch", int, OpenApiParameter.QUERY, description="Batch ID"),
            OpenApiParameter("date_from", str, OpenApiParameter.QUERY, description="Start date (YYYY-MM-DD)"),
            OpenApiParameter("date_to", str, OpenApiParameter.QUERY, description="End date (YYYY-MM-DD)"),
        ],
        responses={200: BatchWisePerformanceReportSerializer},
    )
    def get(self, request):
        filters = dict(request.query_params.items())
        data = ReportService.get_batch_wise_performance_report(request.user, filters)
        return handle_export_or_json(
            request, ReportType.BATCH_WISE_PERFORMANCE, data, "batch_wise_performance"
        )


class TopicWiseUnderstandingReportView(APIView):
    """6. Topic-Wise Understanding Report: Feedback scores and band distributions per topic."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Reports"],
        parameters=EXPORT_PARAMS
        + [
            OpenApiParameter("subject", int, OpenApiParameter.QUERY, description="Subject ID"),
            OpenApiParameter("topic", int, OpenApiParameter.QUERY, description="Topic ID"),
            OpenApiParameter("batch", int, OpenApiParameter.QUERY, description="Batch ID"),
            OpenApiParameter("course", int, OpenApiParameter.QUERY, description="Course ID"),
        ],
        responses={200: TopicWiseUnderstandingReportSerializer},
    )
    def get(self, request):
        filters = dict(request.query_params.items())
        data = ReportService.get_topic_wise_understanding_report(request.user, filters)
        return handle_export_or_json(
            request, ReportType.TOPIC_WISE_UNDERSTANDING, data, "topic_wise_understanding"
        )


class TeacherWiseReportView(APIView):
    """7. Teacher-Wise Performance Report: Supervisory review of classes conducted and student ratings."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Reports"],
        parameters=EXPORT_PARAMS
        + [
            OpenApiParameter("course", int, OpenApiParameter.QUERY, description="Course ID"),
            OpenApiParameter("teacher", str, OpenApiParameter.QUERY, description="Teacher User ID or Login ID"),
            OpenApiParameter("date_from", str, OpenApiParameter.QUERY, description="Start date (YYYY-MM-DD)"),
            OpenApiParameter("date_to", str, OpenApiParameter.QUERY, description="End date (YYYY-MM-DD)"),
        ],
        responses={200: TeacherWiseReportSerializer},
    )
    def get(self, request):
        filters = dict(request.query_params.items())
        data = ReportService.get_teacher_wise_report(request.user, filters)
        return handle_export_or_json(
            request, ReportType.TEACHER_WISE, data, "teacher_wise_report"
        )


class StudentHelpRequestsReportView(APIView):
    """8. Student Help Requests Report: Track student clarification and follow-up requests."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Reports"],
        parameters=EXPORT_PARAMS
        + [
            OpenApiParameter("status", str, OpenApiParameter.QUERY, description="Status (pending, in_progress, resolved)"),
            OpenApiParameter("batch", int, OpenApiParameter.QUERY, description="Batch ID"),
            OpenApiParameter("teacher", str, OpenApiParameter.QUERY, description="Teacher User ID"),
            OpenApiParameter("topic", int, OpenApiParameter.QUERY, description="Topic ID"),
            OpenApiParameter("date_from", str, OpenApiParameter.QUERY, description="Start date (YYYY-MM-DD)"),
            OpenApiParameter("date_to", str, OpenApiParameter.QUERY, description="End date (YYYY-MM-DD)"),
        ],
        responses={200: StudentHelpRequestsReportSerializer},
    )
    def get(self, request):
        filters = dict(request.query_params.items())
        data = ReportService.get_student_help_requests_report(request.user, filters)
        return handle_export_or_json(
            request, ReportType.STUDENT_HELP_REQUESTS, data, "student_help_requests"
        )


class RepeatedAbsencesReportView(APIView):
    """9. Repeated Absences Report: Identify students with persistent or consecutive absences."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Reports"],
        parameters=EXPORT_PARAMS
        + [
            OpenApiParameter("batch", int, OpenApiParameter.QUERY, description="Batch ID"),
            OpenApiParameter("course", int, OpenApiParameter.QUERY, description="Course ID"),
            OpenApiParameter("threshold_consecutive", int, OpenApiParameter.QUERY, description="Consecutive absences threshold (default: 3)"),
            OpenApiParameter("threshold_total", int, OpenApiParameter.QUERY, description="Total absences threshold (default: 5)"),
        ],
        responses={200: RepeatedAbsencesReportSerializer},
    )
    def get(self, request):
        filters = dict(request.query_params.items())
        data = ReportService.get_repeated_absences_report(request.user, filters)
        return handle_export_or_json(
            request, ReportType.REPEATED_ABSENCES, data, "repeated_absences"
        )
