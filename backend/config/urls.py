from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.routers import DefaultRouter


def health_check(request):
    """Lightweight unauthenticated health probe for Render and uptime monitors."""
    return JsonResponse({"status": "ok", "service": "assdi-backend"})

from apps.academic.views import (
    CampusViewSet,
    ClassTopicViewSet,
    CoordinatorCourseAssignmentViewSet,
    CourseViewSet,
    DepartmentViewSet,
    SubjectViewSet,
)
from apps.accounts.views import TeacherViewSet
from apps.assignments.views import HomeworkViewSet, MicroQuizViewSet, SpeakingVideoSubmissionViewSet
from apps.attendance.views import AttendanceViewSet
from apps.batches.views import BatchViewSet, TeacherAssignmentViewSet
from apps.class_sessions.views import ClassScheduleViewSet, ClassSessionViewSet, SessionMaterialViewSet
from apps.feedback.views import HelpRequestViewSet, LearningFeedbackViewSet, SubjectUnderstandingViewSet
from apps.notifications.views import AnnouncementViewSet, NotificationViewSet
from apps.students.views import StudentViewSet

# REST Framework Router for v1 API
router = DefaultRouter()
router.register(r"campuses", CampusViewSet, basename="campus")
router.register(r"courses", CourseViewSet, basename="course")
router.register(r"coordinator-assignments", CoordinatorCourseAssignmentViewSet, basename="coordinator-assignment")
router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"subjects", SubjectViewSet, basename="subject")
router.register(r"topics", ClassTopicViewSet, basename="topic")
router.register(r"batches", BatchViewSet, basename="batch")
router.register(r"teacher-assignments", TeacherAssignmentViewSet, basename="teacher-assignment")
router.register(r"teachers", TeacherViewSet, basename="teacher")
router.register(r"students", StudentViewSet, basename="student")
router.register(r"class-schedules", ClassScheduleViewSet, basename="class-schedule")
router.register(r"class-sessions", ClassSessionViewSet, basename="class-session")
router.register(r"session-materials", SessionMaterialViewSet, basename="session-material")
router.register(r"feedback", LearningFeedbackViewSet, basename="feedback")
router.register(r"help-requests", HelpRequestViewSet, basename="help-request")
router.register(r"subject-understandings", SubjectUnderstandingViewSet, basename="subject-understanding")
router.register(r"attendance", AttendanceViewSet, basename="attendance")
router.register(r"quizzes", MicroQuizViewSet, basename="quiz")
router.register(r"homeworks", HomeworkViewSet, basename="homework")
router.register(r"speaking-videos", SpeakingVideoSubmissionViewSet, basename="speaking-video")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"announcements", AnnouncementViewSet, basename="announcement")

urlpatterns = [
    # Health Check Endpoints
    path("", health_check, name="root-health"),
    path("api/v1/health/", health_check, name="api-health"),

    # Django Administration
    path("admin/", admin.site.urls),

    # OpenAPI 3.0 Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # Auth Endpoints
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/accounts/", include("apps.accounts.urls")),

    # Analytics & Reports Endpoints
    path("api/v1/", include("apps.reports.urls")),

    # Examinations & Result Management (Double Approval Workflow)
    path("api/v1/", include("apps.examinations.urls")),

    # Core Academic & Student Endpoints
    path("api/v1/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
