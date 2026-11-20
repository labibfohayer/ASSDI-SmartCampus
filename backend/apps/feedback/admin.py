from django.contrib import admin
from .models import HelpRequest, LearningFeedback


@admin.register(LearningFeedback)
class LearningFeedbackAdmin(admin.ModelAdmin):
    list_display = ("student", "session", "topic", "understanding_rating", "needs_help", "submitted_at")
    list_filter = ("understanding_rating", "needs_help", "submitted_at")
    search_fields = ("student__student_id_number", "session__subject__name", "topic__title")


@admin.register(HelpRequest)
class HelpRequestAdmin(admin.ModelAdmin):
    list_display = ("student", "teacher_user", "session", "status", "created_at", "resolved_at")
    list_filter = ("status", "created_at")
    search_fields = ("student__student_id_number", "teacher_user__full_name", "topic__title")
