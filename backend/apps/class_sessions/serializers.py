from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from apps.accounts.models import UserRole
from .constants import DAY_OF_WEEK_CHOICES
from .models import ClassSchedule, ClassSession, MaterialType, RoutineApprovalStatus, RoutineVersion, SessionAudience, SessionMaterial, SessionStatus


class RoutineVersionSerializer(serializers.ModelSerializer):
    approved_by_name = serializers.CharField(source="approved_by.full_name", read_only=True)
    published_by_name = serializers.CharField(source="published_by.full_name", read_only=True)

    class Meta:
        model = RoutineVersion
        fields = [
            "id",
            "batch",
            "version_number",
            "change_summary",
            "schedule_snapshot",
            "approved_by_name",
            "published_by_name",
            "published_at",
            "created_at",
        ]


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
    step1_approved_by_name = serializers.CharField(source="step1_approved_by.full_name", read_only=True, allow_null=True)

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
            "approval_status",
            "step1_approved_by",
            "step1_approved_by_name",
            "step1_approved_at",
            "version_number",
            "published_at",
            "cancel_reason",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "published_at",
            "created_by",
            "approval_status",
            "step1_approved_by",
            "step1_approved_by_name",
            "step1_approved_at",
            "version_number",
        ]

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


class SessionMaterialSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    topic_title = serializers.CharField(source="topic.title", read_only=True, allow_null=True)
    session_date = serializers.DateField(source="session.session_date", read_only=True, allow_null=True)
    session_time = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source="uploaded_by.full_name", read_only=True, allow_null=True)
    formatted_file_size = serializers.SerializerMethodField()
    material_type_display = serializers.CharField(source="get_material_type_display", read_only=True)
    key_takeaways = serializers.SerializerMethodField()

    class Meta:
        model = SessionMaterial
        fields = [
            "id",
            "session",
            "session_date",
            "session_time",
            "subject",
            "subject_name",
            "subject_code",
            "topic",
            "topic_title",
            "teacher_name",
            "title",
            "description",
            "key_takeaways",
            "hadith_or_ethics_ref",
            "material_type",
            "material_type_display",
            "file",
            "file_url",
            "file_size_bytes",
            "formatted_file_size",
            "download_count",
            "uploaded_by",
            "uploaded_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "download_count", "uploaded_by"]

    @extend_schema_field(serializers.CharField)
    def get_session_time(self, obj) -> str:
        if obj.session:
            return f"{obj.session.start_time.strftime('%H:%M')} - {obj.session.end_time.strftime('%H:%M')}"
        return ""

    @extend_schema_field(serializers.CharField)
    def get_teacher_name(self, obj) -> str:
        if obj.session and obj.session.teacher_user:
            return obj.session.teacher_user.full_name
        return ""

    @extend_schema_field(serializers.CharField)
    def get_formatted_file_size(self, obj) -> str:
        size = obj.file_size_bytes or (obj.file.size if obj.file else 0)
        if size >= 1024 * 1024:
            return f"{size / (1024 * 1024):.1f} MB"
        elif size >= 1024:
            return f"{size / 1024:.0f} KB"
        return f"{size} B"

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_key_takeaways(self, obj) -> list[str]:
        if not obj.key_takeaways:
            return []
        import json
        if isinstance(obj.key_takeaways, list):
            return obj.key_takeaways
        val = str(obj.key_takeaways).strip()
        if val.startswith("[") and val.endswith("]"):
            try:
                import ast
                return ast.literal_eval(val)
            except Exception:
                try:
                    return json.loads(val)
                except Exception:
                    pass
        return [line.strip("-•* ").strip() for line in val.split("\n") if line.strip()]
