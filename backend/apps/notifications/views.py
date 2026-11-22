from django.db import models
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from apps.accounts.models import UserRole
from apps.notifications.models import (
    Notification,
    Announcement,
    DeviceToken,
    AnnouncementScope,
)
from apps.notifications.serializers import (
    NotificationSerializer,
    AnnouncementSerializer,
    AnnouncementCreateSerializer,
    DeviceTokenSerializer,
)
from apps.notifications.services import broadcast_announcement
from apps.students.models import Enrollment, EnrollmentStatus


@extend_schema_view(
    list=extend_schema(summary="List user notifications", description="Returns in-app notifications for authenticated user, sorted by date DESC."),
    unread_count=extend_schema(summary="Get unread notification count", description="Returns total count of unread notifications."),
    mark_read=extend_schema(summary="Mark single notification as read"),
    mark_all_read=extend_schema(summary="Mark all user notifications as read"),
)
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Notification.objects.filter(recipient=user)

        unread_filter = self.request.query_params.get("unread", "").lower()
        if unread_filter in ["true", "1"]:
            qs = qs.filter(is_read=False)

        return qs

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)

        notification.mark_as_read()
        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(is_read=True, read_at=timezone.now())

        return Response(
            {"success": True, "marked_count": updated_count},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["delete", "post"], url_path="delete")
    def delete_notification(self, request, pk=None):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)

        notification.delete()
        return Response({"success": True, "detail": "Notification deleted."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="clear-all-read")
    def clear_all_read(self, request):
        deleted_count, _ = Notification.objects.filter(
            recipient=request.user,
            is_read=True,
        ).delete()

        return Response(
            {"success": True, "cleared_count": deleted_count},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post", "delete"], url_path="device-token")
    def device_token(self, request):
        if request.method == "POST":
            serializer = DeviceTokenSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            token = serializer.validated_data["fcm_token"]
            platform = serializer.validated_data.get("platform", "web")

            device_token, created = DeviceToken.objects.update_or_create(
                fcm_token=token,
                defaults={
                    "user": request.user,
                    "platform": platform,
                    "is_active": True,
                    "last_seen_at": timezone.now(),
                },
            )

            return Response(
                {
                    "success": True,
                    "detail": "Device token registered successfully.",
                    "created": created,
                },
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )
        else:
            token = request.data.get("fcm_token") or request.query_params.get("fcm_token")
            if not token:
                return Response(
                    {"detail": "fcm_token is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            deleted_count, _ = DeviceToken.objects.filter(
                fcm_token=token,
                user=request.user,
            ).delete()

            return Response(
                {"success": True, "deleted_count": deleted_count},
                status=status.HTTP_200_OK,
            )


@extend_schema_view(
    list=extend_schema(summary="List announcements", description="Role-scoped listing of institutional announcements."),
    create=extend_schema(summary="Publish new announcement", description="Super admins can post Global/Course/Batch; Coordinators can post Course/Batch for assigned courses."),
)
class AnnouncementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return AnnouncementCreateSerializer
        return AnnouncementSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Announcement.objects.filter(is_active=True).select_related(
            "author", "target_course", "target_batch"
        )

        if user.role == UserRole.SUPER_ADMIN:
            return qs

        if user.role == UserRole.COORDINATOR:
            assigned_courses = user.coordinator_course_assignments.values_list("course_id", flat=True)
            return qs.filter(
                models.Q(scope=AnnouncementScope.GLOBAL)
                | models.Q(scope=AnnouncementScope.COURSE, target_course_id__in=assigned_courses)
                | models.Q(scope=AnnouncementScope.BATCH, target_batch__course_id__in=assigned_courses)
            )

        if user.role == UserRole.TEACHER:
            assigned_batches = user.teacher_assignments.values_list("batch_id", flat=True)
            assigned_courses = user.teacher_assignments.values_list("batch__course_id", flat=True)
            return qs.filter(
                models.Q(scope=AnnouncementScope.GLOBAL)
                | models.Q(scope=AnnouncementScope.BATCH, target_batch_id__in=assigned_batches)
                | models.Q(scope=AnnouncementScope.COURSE, target_course_id__in=assigned_courses)
            )

        if user.role == UserRole.STUDENT:
            student_batches = Enrollment.objects.filter(
                student__user=user,
                status=EnrollmentStatus.ACTIVE,
            ).values_list("batch_id", flat=True)
            student_courses = Enrollment.objects.filter(
                student__user=user,
                status=EnrollmentStatus.ACTIVE,
            ).values_list("batch__course_id", flat=True)

            return qs.filter(
                models.Q(scope=AnnouncementScope.GLOBAL)
                | models.Q(scope=AnnouncementScope.BATCH, target_batch_id__in=student_batches)
                | models.Q(scope=AnnouncementScope.COURSE, target_course_id__in=student_courses)
            )

        if user.role == UserRole.OBSERVER:
            # Observers see Global + their assigned courses
            assigned_courses = getattr(user, "observer_course_assignments", []).values_list("course_id", flat=True) if hasattr(user, "observer_course_assignments") else []
            return qs.filter(
                models.Q(scope=AnnouncementScope.GLOBAL)
                | models.Q(scope=AnnouncementScope.COURSE, target_course_id__in=assigned_courses)
            )

        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in [UserRole.SUPER_ADMIN, UserRole.COORDINATOR]:
            raise PermissionDenied("Only super admins and coordinators can publish announcements.")

        scope = serializer.validated_data.get("scope", AnnouncementScope.GLOBAL)

        # Coordinators cannot publish Global announcements; only Super Admins can
        if scope == AnnouncementScope.GLOBAL and user.role != UserRole.SUPER_ADMIN:
            raise PermissionDenied("Only super admins can publish global announcements.")

        # Coordinator course assignment validation
        if user.role == UserRole.COORDINATOR:
            assigned_courses = set(user.coordinator_course_assignments.values_list("course_id", flat=True))
            if scope == AnnouncementScope.COURSE:
                target_course = serializer.validated_data.get("target_course")
                if not target_course or target_course.id not in assigned_courses:
                    raise PermissionDenied("You can only publish announcements for your assigned courses.")
            elif scope == AnnouncementScope.BATCH:
                target_batch = serializer.validated_data.get("target_batch")
                if not target_batch or target_batch.course_id not in assigned_courses:
                    raise PermissionDenied("You can only publish announcements for batches in your assigned courses.")

        announcement = serializer.save(author=user)

        # Fan-out in-app notifications to target users
        broadcast_announcement(announcement)

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role != UserRole.SUPER_ADMIN and instance.author != user:
            raise PermissionDenied("You can only delete your own announcements.")
        instance.is_active = False
        instance.save(update_fields=["is_active"])


@extend_schema_view(
    register=extend_schema(summary="Register FCM device token", request=DeviceTokenSerializer),
    remove=extend_schema(summary="Remove or deactivate FCM device token"),
)
class DeviceTokenViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="register")
    def register(self, request):
        serializer = DeviceTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["fcm_token"]
        platform = serializer.validated_data.get("platform", "web")

        device_token, created = DeviceToken.objects.update_or_create(
            fcm_token=token,
            defaults={
                "user": request.user,
                "platform": platform,
                "is_active": True,
                "last_seen_at": timezone.now(),
            },
        )

        return Response(
            {
                "success": True,
                "detail": "Device token registered successfully.",
                "created": created,
            },
            status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="remove")
    def remove(self, request):
        token = request.data.get("fcm_token")
        if not token:
            return Response(
                {"detail": "fcm_token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted_count, _ = DeviceToken.objects.filter(
            fcm_token=token,
            user=request.user,
        ).delete()

        return Response(
            {"success": True, "deleted_count": deleted_count},
            status=status.HTTP_200_OK,
        )
