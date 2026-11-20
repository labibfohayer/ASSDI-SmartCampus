from rest_framework.routers import DefaultRouter
from .views import HelpRequestViewSet, LearningFeedbackViewSet

router = DefaultRouter()
router.register(r"feedback", LearningFeedbackViewSet, basename="feedback")
router.register(r"help-requests", HelpRequestViewSet, basename="help-request")

urlpatterns = router.urls
