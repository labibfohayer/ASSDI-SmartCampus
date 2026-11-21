from rest_framework import serializers

from apps.reports.models import ReportLog


class ReportLogSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.CharField(source="generated_by.full_name", read_only=True)
    generated_by_login_id = serializers.CharField(source="generated_by.login_id", read_only=True)

    class Meta:
        model = ReportLog
        fields = [
            "id",
            "report_type",
            "export_format",
            "filters_json",
            "generated_by",
            "generated_by_name",
            "generated_by_login_id",
            "generated_at",
        ]
        read_only_fields = fields


# Generic serializers for spectacular schema representation
class CoordinatorDashboardSerializer(serializers.Serializer):
    total_students = serializers.IntegerField()
    total_active_batches = serializers.IntegerField()
    total_teachers = serializers.IntegerField()
    todays_classes = serializers.IntegerField()
    overall_attendance_percentage = serializers.FloatField(allow_null=True)
    overall_learning_progress = serializers.DictField()
    total_help_requests = serializers.IntegerField()
    pending_help_requests = serializers.IntegerField()
    batch_wise_performance = serializers.ListField()
    teacher_wise_performance = serializers.ListField()
    repeated_absence_count = serializers.IntegerField()
    repeated_absences = serializers.ListField()
    students_requiring_attention_count = serializers.IntegerField()
    students_requiring_attention = serializers.ListField()


class DailyAttendanceReportSerializer(serializers.Serializer):
    report_date = serializers.DateField()
    total_sessions = serializers.IntegerField()
    total_records = serializers.IntegerField()
    present_count = serializers.IntegerField()
    late_count = serializers.IntegerField()
    absent_count = serializers.IntegerField()
    approved_leave_count = serializers.IntegerField()
    attendance_percentage = serializers.FloatField(allow_null=True)
    sessions = serializers.ListField()


class DailyLearningProgressReportSerializer(serializers.Serializer):
    report_date = serializers.DateField()
    total_sessions = serializers.IntegerField()
    total_feedbacks = serializers.IntegerField()
    average_rating = serializers.FloatField(allow_null=True)
    average_percentage = serializers.FloatField(allow_null=True)
    band_distribution = serializers.DictField()
    sessions = serializers.ListField()


class WeeklyProgressReportSerializer(serializers.Serializer):
    period = serializers.DictField()
    total_classes = serializers.IntegerField()
    attendance_summary = serializers.DictField()
    learning_summary = serializers.DictField()
    daily_breakdown = serializers.ListField()


class MonthlyStudentPerformanceReportSerializer(serializers.Serializer):
    year = serializers.IntegerField()
    month = serializers.IntegerField()
    batch_id = serializers.IntegerField(allow_null=True)
    batch_name = serializers.CharField(allow_null=True)
    total_students = serializers.IntegerField()
    students = serializers.ListField()


class BatchWisePerformanceReportSerializer(serializers.Serializer):
    total_batches = serializers.IntegerField()
    batches = serializers.ListField()


class TopicWiseUnderstandingReportSerializer(serializers.Serializer):
    total_topics = serializers.IntegerField()
    topics = serializers.ListField()


class TeacherWiseReportSerializer(serializers.Serializer):
    total_teachers = serializers.IntegerField()
    teachers = serializers.ListField()


class StudentHelpRequestsReportSerializer(serializers.Serializer):
    total_help_requests = serializers.IntegerField()
    pending_count = serializers.IntegerField()
    in_progress_count = serializers.IntegerField()
    resolved_count = serializers.IntegerField()
    help_requests = serializers.ListField()


class RepeatedAbsencesReportSerializer(serializers.Serializer):
    threshold_consecutive = serializers.IntegerField()
    threshold_total = serializers.IntegerField()
    total_flagged_students = serializers.IntegerField()
    flagged_students = serializers.ListField()
