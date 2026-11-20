from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from apps.accounts.models import UserRole
from .constants import DAY_OF_WEEK_CHOICES
from .models import ClassSchedule, ClassSession, SessionAudience, SessionStatus


class ClassScheduleSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    teacher_name = serializers.CharField(source="teacher_user.full_name", read_only=True)
    day_name = serializers.SerializerMethodField()

    class Meta:
        model = ClassSchedule
        fields = [
            "id",
            "batch",
            "batch_name",
            "subject",
            "subject_name",
            "teacher_user",
            "teacher_name",
            "day_of_week",
            "day_name",
            "start_time",
            "end_time",
            "room",
            "valid_from",
            "valid_to",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    @extend_schema_field(serializers.CharField)
    def get_day_name(self, obj) -> str:
        return dict(DAY_OF_WEEK_CHOICES).get(obj.day_of_week, str(obj.day_of_week))

    def validate(self, attrs):
        # Model full_clean handles assignment and time validation
        return attrs


class ClassSessionSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    teacher_name = serializers.CharField(source="teacher_user.full_name", read_only=True)
    topic_title = serializers.CharField(source="topic.title", read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True, allow_null=True)

    class Meta:
        model = ClassSession
        fields = [
            "id",
            "batch",
            "batch_name",
            "subject",
            "subject_name",
            "teacher_user",
            "teacher_name",
            "topic",
            "topic_title",
            "schedule",
            "session_date",
            "start_time",
            "end_time",
            "description",
            "learning_objectives",
            "audience",
            "status",
            "published_at",
            "cancel_reason",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "published_at", "created_by"]

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            # Teacher constraint (User Change 4): teacher cannot assign another teacher
            if request.user.role == UserRole.TEACHER:
                teacher = attrs.get("teacher_user")
                if teacher and teacher != request.user:
                    raise serializers.ValidationError({
                        "teacher_user": "Teachers can only create or edit sessions for themselves."
                    })
                # If creating and not explicitly specified, default to request.user
                if not teacher and not self.instance:
                    attrs["teacher_user"] = request.user

        # Create temporary instance to execute full_clean business rules
        temp_instance = ClassSession(
            pk=self.instance.pk if self.instance else None,
            batch=attrs.get("batch", self.instance.batch if self.instance else None),
            subject=attrs.get("subject", self.instance.subject if self.instance else None),
            teacher_user=attrs.get("teacher_user", self.instance.teacher_user if self.instance else None),
            topic=attrs.get("topic", self.instance.topic if self.instance else None),
            schedule=attrs.get("schedule", self.instance.schedule if self.instance else None),
            session_date=attrs.get("session_date", self.instance.session_date if self.instance else None),
            start_time=attrs.get("start_time", self.instance.start_time if self.instance else None),
            end_time=attrs.get("end_time", self.instance.end_time if self.instance else None),
            audience=attrs.get("audience", self.instance.audience if self.instance else SessionAudience.ALL),
            status=attrs.get("status", self.instance.status if self.instance else SessionStatus.DRAFT),
            published_at=attrs.get("published_at", self.instance.published_at if self.instance else None),
            cancel_reason=attrs.get("cancel_reason", self.instance.cancel_reason if self.instance else ""),
        )
        try:
            temp_instance.clean()
        except serializers.ValidationError:
            raise
        except Exception as exc:
            if hasattr(exc, "message_dict"):
                raise serializers.ValidationError(exc.message_dict)
            raise serializers.ValidationError(str(exc))

        return attrs


class GenerateSessionsSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)
    batch_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        if attrs["end_date"] < attrs["start_date"]:
            raise serializers.ValidationError({"end_date": "end_date cannot be earlier than start_date."})
        return attrs


class CancelSessionSerializer(serializers.Serializer):
    cancel_reason = serializers.CharField(
        required=True,
        allow_blank=False,
        help_text="Required explanation for cancelling this session.",
    )
