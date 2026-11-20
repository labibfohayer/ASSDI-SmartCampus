from rest_framework.routers import DefaultRouter
from .views import ClassScheduleViewSet, ClassSessionViewSet

router = DefaultRouter()
router.register(r"class-schedules", ClassScheduleViewSet, basename="class-schedule")
router.register(r"class-sessions", ClassSessionViewSet, basename="class-session")

urlpatterns = router.urls
