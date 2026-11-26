from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import ExaminationViewSet, ExamResultViewSet

router = DefaultRouter()
router.register(r"examinations", ExaminationViewSet, basename="examination")
router.register(r"exam-results", ExamResultViewSet, basename="exam-result")

urlpatterns = [
    path("", include(router.urls)),
]
