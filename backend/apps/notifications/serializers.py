from rest_framework import serializers
from apps.notifications.models import (
    Notification,
    Announcement,
    DeviceToken,
    AnnouncementScope,
)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "body",
            "notification_type",
            "data_payload",
            "is_read",
            "read_at",
            "created_at",
        ]
        read_only_fields = fields


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)
    author_login_id = serializers.CharField(source="author.login_id", read_only=True)
    target_course_name = serializers.CharField(source="target_course.name", read_only=True)
    target_batch_name = serializers.CharField(source="target_batch.name", read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id",
            "author_id",
            "author_name",
            "author_login_id",
            "scope",
            "target_course",
            "target_course_name",
            "target_batch",
            "target_batch_name",
            "title",
            "content",
            "is_active",
            "published_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "author_id",
            "author_name",
            "author_login_id",
            "target_course_name",
            "target_batch_name",
            "created_at",
        ]


class AnnouncementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = [
            "scope",
            "target_course",
            "target_batch",
            "title",
            "content",
        ]

    def validate(self, attrs):
        scope = attrs.get("scope", AnnouncementScope.GLOBAL)
        target_course = attrs.get("target_course")
        target_batch = attrs.get("target_batch")

        if scope == AnnouncementScope.COURSE and not target_course:
            raise serializers.ValidationError({"target_course": "Target course is required when scope is Course."})
        if scope == AnnouncementScope.BATCH and not target_batch:
            raise serializers.ValidationError({"target_batch": "Target batch is required when scope is Batch."})

        return attrs


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ["fcm_token", "platform"]
        extra_kwargs = {
            "fcm_token": {"validators": []},
        }

    def validate_fcm_token(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("FCM token cannot be empty.")
        return value.strip()
