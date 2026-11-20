from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .constants import ALL_BANDS
from .models import HelpRequest, LearningFeedback


class LearningFeedbackCreateSerializer(serializers.ModelSerializer):
    understanding_rating = serializers.IntegerField(
        min_value=1,
        max_value=5,
        required=True,
        help_text="Rating 1-5 where 1=Poor (20%) and 5=Full understanding (100%).",
    )
    student_comment = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        default="",
    )
    client_submission_id = serializers.UUIDField(
        required=False,
        allow_null=True,
    )

    class Meta:
        model = LearningFeedback
        fields = [
            "session",
            "understanding_rating",
            "needs_help",
            "student_comment",
            "client_submission_id",
        ]


class LearningFeedbackSerializer(serializers.ModelSerializer):
    session_date = serializers.DateField(source="session.session_date", read_only=True)
    subject_name = serializers.CharField(source="session.subject.name", read_only=True)
    topic_title = serializers.CharField(source="topic.title", read_only=True)
    percentage = serializers.IntegerField(read_only=True)
    band = serializers.CharField(read_only=True)
    help_request_id = serializers.SerializerMethodField()

    class Meta:
        model = LearningFeedback
        fields = [
            "id",
            "session",
            "session_date",
            "subject_name",
            "topic",
            "topic_title",
            "understanding_rating",
            "percentage",
            "band",
            "needs_help",
            "student_comment",
            "client_submission_id",
            "submitted_at",
            "help_request_id",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_help_request_id(self, obj):
        return obj.help_request.id if hasattr(obj, "help_request") and obj.help_request else None


class LearningFeedbackStudentReadSerializer(serializers.ModelSerializer):
    """Used by teachers/admins to inspect individual feedback submissions without contact info."""
    student_id_number = serializers.CharField(source="student.student_id_number", read_only=True)
    student_name = serializers.CharField(source="student.user.full_name", read_only=True)
    percentage = serializers.IntegerField(read_only=True)

    class Meta:
        model = LearningFeedback
        fields = [
            "id",
            "student_id_number",
            "student_name",
            "understanding_rating",
            "percentage",
            "needs_help",
            "student_comment",
            "submitted_at",
        ]
        read_only_fields = fields


class HelpRequestSerializer(serializers.ModelSerializer):
    student_id_number = serializers.CharField(source="student.student_id_number", read_only=True)
    student_name = serializers.CharField(source="student.user.full_name", read_only=True)
    batch_id = serializers.IntegerField(source="session.batch.id", read_only=True)
    batch_name = serializers.CharField(source="session.batch.name", read_only=True)
    session_date = serializers.DateField(source="session.session_date", read_only=True)
    subject_id = serializers.IntegerField(source="session.subject.id", read_only=True)
    subject_name = serializers.CharField(source="session.subject.name", read_only=True)
    topic_title = serializers.CharField(source="topic.title", read_only=True)
    teacher_name = serializers.CharField(source="teacher_user.full_name", read_only=True)
    resolved_by_name = serializers.CharField(source="resolved_by.full_name", read_only=True, allow_null=True)
    understanding_rating = serializers.SerializerMethodField()

    class Meta:
        model = HelpRequest
        fields = [
            "id",
            "feedback",
            "student",
            "student_id_number",
            "student_name",
            "batch_id",
            "batch_name",
            "session",
            "session_date",
            "subject_id",
            "subject_name",
            "topic",
            "topic_title",
            "teacher_user",
            "teacher_name",
            "understanding_rating",
            "student_message",
            "teacher_note",
            "status",
            "created_at",
            "in_progress_at",
            "resolved_at",
            "resolved_by",
            "resolved_by_name",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_understanding_rating(self, obj):
        return obj.feedback.understanding_rating if obj.feedback else None


class HelpRequestResolveSerializer(serializers.Serializer):
    teacher_note = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        help_text="Optional follow-up notes from the teacher explaining how help was provided.",
    )


class FeedbackSummarySerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    session_date = serializers.DateField()
    subject_name = serializers.CharField()
    topic_title = serializers.CharField(allow_null=True)
    total_enrolled = serializers.IntegerField(help_text="Active enrolled students matching session audience.")
    submitted_count = serializers.IntegerField()
    pending_count = serializers.IntegerField(help_text="Active matching students who have not yet submitted.")
    average_rating = serializers.FloatField(allow_null=True)
    average_percentage = serializers.FloatField(allow_null=True)
    needs_help_count = serializers.IntegerField()
    band_distribution = serializers.DictField(child=serializers.IntegerField())


class TopicUnderstandingSerializer(serializers.Serializer):
    topic_id = serializers.IntegerField()
    topic_title = serializers.CharField()
    subject_id = serializers.IntegerField()
    subject_name = serializers.CharField()
    batch_id = serializers.IntegerField()
    batch_name = serializers.CharField()
    total_feedbacks = serializers.IntegerField()
    average_rating = serializers.FloatField(allow_null=True)
    average_percentage = serializers.FloatField(allow_null=True)
    band_distribution = serializers.DictField(child=serializers.IntegerField())


class StudentProgressSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    student_id_number = serializers.CharField()
    student_name = serializers.CharField()
    total_feedbacks = serializers.IntegerField()
    last_7_days_avg_rating = serializers.FloatField(allow_null=True)
    last_30_days_avg_rating = serializers.FloatField(allow_null=True)
    total_help_requests = serializers.IntegerField()
    resolved_help_requests = serializers.IntegerField()
    topics_with_low_ratings = serializers.ListField(child=serializers.DictField())
