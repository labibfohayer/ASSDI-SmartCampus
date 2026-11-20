from django.contrib import admin
from .models import ClassSchedule, ClassSession


@admin.register(ClassSchedule)
class ClassScheduleAdmin(admin.ModelAdmin):
    list_display = ("batch", "subject", "teacher_user", "day_of_week", "start_time", "end_time", "room", "is_active")
    list_filter = ("batch", "subject", "day_of_week", "is_active")
    search_fields = ("batch__name", "subject__name", "teacher_user__full_name", "room")


@admin.register(ClassSession)
class ClassSessionAdmin(admin.ModelAdmin):
    list_display = ("batch", "subject", "teacher_user", "session_date", "start_time", "end_time", "audience", "status", "published_at")
    list_filter = ("batch", "subject", "audience", "status", "session_date")
    search_fields = ("batch__name", "subject__name", "teacher_user__full_name", "topic__title")
