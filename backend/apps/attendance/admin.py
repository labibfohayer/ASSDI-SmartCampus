from django.contrib import admin
from .models import AttendanceRecord


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "student",
        "session",
        "status",
        "method",
        "marked_at",
        "marked_by",
    ]
    list_filter = ["status", "method", "session__batch", "marked_at"]
    search_fields = [
        "student__student_id_number",
        "student__user__full_name",
        "session__subject__name",
        "reason",
    ]
    readonly_fields = ["marked_at", "updated_at"]
