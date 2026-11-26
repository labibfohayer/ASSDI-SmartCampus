from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .constants import ALL_BANDS
from .models import (
    HelpRequest,
    HelpRequestMessage,
    LearningFeedback,
    SubjectUnderstandingHistory,
    SubjectUnderstandingProgress,
)


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


class HelpRequestMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender_user.full_name", read_only=True)
    sender_role = serializers.CharField(source="sender_user.role", read_only=True)

    class Meta:
        model = HelpRequestMessage
        fields = [
            "id",
            "help_request",
            "sender_user",
            "sender_name",
            "sender_role",
            "message_text",
            "attached_resource_url",
            "attached_resource_name",
            "is_teacher_response",
            "created_at",
        ]
        read_only_fields = ["sender_user", "created_at"]


class HelpRequestSerializer(serializers.ModelSerializer):
    student_id_number = serializers.CharField(source="student.student_id_number", read_only=True)
    student_name = serializers.CharField(source="student.user.full_name", read_only=True)
    batch_id = serializers.SerializerMethodField()
    batch_name = serializers.SerializerMethodField()
    session_date = serializers.DateField(source="session.session_date", read_only=True)
    subject_id = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    topic_title = serializers.CharField(source="topic.title", read_only=True)
    teacher_name = serializers.CharField(source="teacher_user.full_name", read_only=True)
    resolved_by_name = serializers.CharField(source="resolved_by.full_name", read_only=True, allow_null=True)
    understanding_rating = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    messages = HelpRequestMessageSerializer(many=True, read_only=True)

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
            "subject",
            "subject_id",
            "subject_name",
            "topic",
            "topic_title",
            "teacher_user",
            "teacher_name",
            "understanding_rating",
            "unclear_part",
            "reported_understanding_pct",
            "student_message",
            "teacher_note",
            "status",
            "is_overdue",
            "student_resolution_confirmed",
            "created_at",
            "in_progress_at",
            "last_teacher_response_at",
            "resolved_at",
            "resolved_by",
            "resolved_by_name",
            "messages",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_understanding_rating(self, obj):
        return obj.feedback.understanding_rating if obj.feedback else None

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_batch_id(self, obj):
        if obj.session and obj.session.batch:
            return obj.session.batch.id
        enrollment = obj.student.enrollments.filter(status="active").first()
        return enrollment.batch.id if enrollment and enrollment.batch else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_batch_name(self, obj):
        if obj.session and obj.session.batch:
            return obj.session.batch.name
        enrollment = obj.student.enrollments.filter(status="active").first()
        return enrollment.batch.name if enrollment and enrollment.batch else None

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_subject_id(self, obj):
        if obj.subject:
            return obj.subject.id
        return obj.session.subject.id if obj.session and obj.session.subject else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_subject_name(self, obj):
        if obj.subject:
            return obj.subject.name
        return obj.session.subject.name if obj.session and obj.session.subject else None


class SubjectUnderstandingHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectUnderstandingHistory
        fields = [
            "id",
            "percentage",
            "notes",
            "recorded_at",
        ]


class SubjectUnderstandingProgressSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.user.full_name", read_only=True)
    student_id_number = serializers.CharField(source="student.student_id_number", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    history = SubjectUnderstandingHistorySerializer(many=True, read_only=True)

    class Meta:
        model = SubjectUnderstandingProgress
        fields = [
            "id",
            "student",
            "student_name",
            "student_id_number",
            "subject",
            "subject_name",
            "understanding_percentage",
            "previous_percentage",
            "student_notes",
            "last_updated_at",
            "history",
        ]
        read_only_fields = ["student", "last_updated_at"]



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
