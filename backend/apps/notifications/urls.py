from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.notifications.views import (
    NotificationViewSet,
    AnnouncementViewSet,
    DeviceTokenViewSet,
)

router = DefaultRouter()
router.register(r"items", NotificationViewSet, basename="notification")
router.register(r"announcements", AnnouncementViewSet, basename="announcement")

urlpatterns = [
    path("unread-count/", NotificationViewSet.as_view({"get": "unread_count"}), name="notification-unread-count"),
    path("mark-all-read/", NotificationViewSet.as_view({"post": "mark_all_read"}), name="notification-mark-all-read"),
    path("device-tokens/register/", DeviceTokenViewSet.as_view({"post": "register"}), name="device-token-register"),
    path("device-tokens/remove/", DeviceTokenViewSet.as_view({"post": "remove"}), name="device-token-remove"),
    path("", include(router.urls)),
]
