from django.conf import settings
from django.db import models

from apps.reports.constants import ExportFormat, ReportType


class ReportLog(models.Model):
    """
    Tracks all generated or exported reports for compliance, monitoring, and audit trails.
    """

    report_type = models.CharField(
        max_length=50,
        choices=ReportType.choices,
        db_index=True,
        help_text="Type of the report generated or exported",
    )
    export_format = models.CharField(
        max_length=10,
        choices=ExportFormat.choices,
        db_index=True,
        help_text="Format of the export (json, pdf, xlsx)",
    )
    filters_json = models.JSONField(
        default=dict,
        blank=True,
        help_text="Filter parameters applied during report generation",
    )
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_reports",
        help_text="User who initiated the report generation or export",
    )
    generated_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when the report was generated",
    )

    class Meta:
        db_table = "report_logs"
        verbose_name = "Report Log"
        verbose_name_plural = "Report Logs"
        ordering = ["-generated_at"]

    def __str__(self):
        user_id = self.generated_by.login_id if self.generated_by else "Anonymous/System"
        return f"[{self.generated_at:%Y-%m-%d %H:%M:%S}] {self.report_type} ({self.export_format}) by {user_id}"
