from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    AdminResetPasswordView,
    ChangePasswordView,
    LoginView,
    LogoutView,
    MeView,
    ObserverReadOnlyTestView,
    PasswordResetConfirmView,
    PasswordResetEmailRequestView,
    SuperAdminTestView,
    TeacherTestView,
)

urlpatterns = [
    # Core Authentication
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),

    # Password Management
    path("password-reset/email/", PasswordResetEmailRequestView.as_view(), name="auth-password-reset-email"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
    path("admin-reset-password/", AdminResetPasswordView.as_view(), name="auth-admin-reset-password"),
    path("change-password/", ChangePasswordView.as_view(), name="auth-change-password"),

    # RBAC Test Endpoints (for verifying permission isolation)
    path("test/super-admin/", SuperAdminTestView.as_view(), name="test-super-admin"),
    path("test/teacher/", TeacherTestView.as_view(), name="test-teacher"),
    path("test/observer/", ObserverReadOnlyTestView.as_view(), name="test-observer"),
]
