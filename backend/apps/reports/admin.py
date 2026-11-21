from django.contrib import admin

from apps.reports.models import ReportLog


@admin.register(ReportLog)
class ReportLogAdmin(admin.ModelAdmin):
    list_display = ("id", "report_type", "export_format", "generated_by", "generated_at")
    list_filter = ("report_type", "export_format", "generated_at")
    search_fields = ("report_type", "generated_by__login_id", "generated_by__phone_number")
    readonly_fields = ("report_type", "export_format", "filters_json", "generated_by", "generated_at")
