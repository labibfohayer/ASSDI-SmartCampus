from django.conf import settings
from django.db import models
from django.utils import timezone


class NotificationType(models.TextChoices):
    HELP_REQUEST = "help_request", "Help Request"
    HELP_REPLY = "help_reply", "Help Reply"
    ATTENDANCE_ALERT = "attendance_alert", "Attendance Alert"
    CLASS_REMINDER = "class_reminder", "Class Reminder"
    ANNOUNCEMENT = "announcement", "Announcement"
    SYSTEM = "system", "System"


class AnnouncementScope(models.TextChoices):
    GLOBAL = "Global", "Global"
    COURSE = "Course", "Course"
    BATCH = "Batch", "Batch"


class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=200)
    body = models.TextField()
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
        db_index=True,
    )
    data_payload = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "-created_at"]),
        ]

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.recipient.login_id}"


class Announcement(models.Model):
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="authored_announcements",
    )
    scope = models.CharField(
        max_length=20,
        choices=AnnouncementScope.choices,
        default=AnnouncementScope.GLOBAL,
        db_index=True,
    )
    target_course = models.ForeignKey(
        "academic.Course",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="announcements",
    )
    target_batch = models.ForeignKey(
        "batches.Batch",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="announcements",
    )
    title = models.CharField(max_length=250)
    content = models.TextField()
    is_active = models.BooleanField(default=True, db_index=True)
    published_at = models.DateTimeField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "announcements"
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return f"[{self.scope}] {self.title} by {self.author.login_id}"


class DeviceToken(models.Model):
    PLATFORM_CHOICES = [
        ("android", "Android"),
        ("ios", "iOS"),
        ("web", "Web"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="device_tokens",
    )
    fcm_token = models.TextField(unique=True)
    platform = models.CharField(
        max_length=20,
        choices=PLATFORM_CHOICES,
        default="web",
    )
    is_active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "device_tokens"
        ordering = ["-last_seen_at"]

    def __str__(self):
        return f"{self.user.login_id} ({self.platform})"
