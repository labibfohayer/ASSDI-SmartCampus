from datetime import timedelta
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import transaction

from apps.audit.models import AuditLog
from .models import User, UserRole
from .permissions import IsCoordinator, IsSuperAdmin, IsTeacher, IsStudent, IsObserverReadOnly
from .serializers import (
    AdminResetPasswordSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetEmailRequestSerializer,
    TeacherCreateSerializer,
    TeacherListSerializer,
    UserSerializer,
)
from .throttling import LoginIPRateThrottle


class LoginView(APIView):
    """
    Authenticate user via login_id + password.
    Returns JWT access and refresh tokens, user role and profile.
    Enforces per-login_id account lock and generous per-IP throttling.
    """

    permission_classes = [AllowAny]
    throttle_classes = [LoginIPRateThrottle]
    serializer_class = LoginSerializer

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: OpenApiResponse(description="Login successful"),
            401: OpenApiResponse(description="Invalid credentials or account deactivated"),
            429: OpenApiResponse(description="Account locked due to excessive failed attempts"),
        },
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        login_id = serializer.validated_data["login_id"]
        password = serializer.validated_data["password"]

        try:
            user = User.objects.get(login_id__iexact=login_id)
        except User.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "INVALID_CREDENTIALS", "message": "Invalid login ID or password."}},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # 1. Check if account is temporarily locked
        if user.is_locked():
            remaining_seconds = int((user.locked_until - timezone.now()).total_seconds())
            remaining_mins = max(1, (remaining_seconds + 59) // 60)
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "ACCOUNT_LOCKED",
                        "message": f"Account temporarily locked due to repeated failed attempts. Please try again in {remaining_mins} minute(s).",
                    },
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # 2. Check password
        if not user.check_password(password):
            user.failed_login_attempts += 1
            max_failed = getattr(settings, "THROTTLE_LOGIN_ACCOUNT_FAILED_LIMIT", 5)
            lock_minutes = getattr(settings, "THROTTLE_LOGIN_ACCOUNT_LOCK_MINUTES", 5)

            if user.failed_login_attempts >= max_failed:
                user.locked_until = timezone.now() + timedelta(minutes=lock_minutes)
                user.save(update_fields=["failed_login_attempts", "locked_until"])
                return Response(
                    {
                        "success": False,
                        "error": {
                            "code": "ACCOUNT_LOCKED",
                            "message": f"Too many failed login attempts. Account locked for {lock_minutes} minutes.",
                        },
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

            user.save(update_fields=["failed_login_attempts"])
            return Response(
                {"success": False, "error": {"code": "INVALID_CREDENTIALS", "message": "Invalid login ID or password."}},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # 3. Check active status
        if not user.is_active:
            return Response(
                {"success": False, "error": {"code": "ACCOUNT_INACTIVE", "message": "This account has been deactivated."}},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # 4. Successful login: Reset failed counter and lock
        if user.failed_login_attempts > 0 or user.locked_until is not None:
            user.failed_login_attempts = 0
            user.locked_until = None
            user.save(update_fields=["failed_login_attempts", "locked_until"])

        # 5. Generate tokens
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "success": True,
                "data": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "user": UserSerializer(user).data,
                },
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    Invalidate and blacklist the provided refresh token.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request={"application/json": {"type": "object", "properties": {"refresh": {"type": "string"}}}},
        responses={200: OpenApiResponse(description="Logged out successfully")},
    )
    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Refresh token is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"success": True, "message": "Successfully logged out. Refresh token blacklisted."},
                status=status.HTTP_200_OK,
            )
        except Exception:
            return Response(
                {"success": False, "error": {"code": "INVALID_TOKEN", "message": "Token is invalid or already blacklisted."}},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MeView(APIView):
    """
    Return currently authenticated user profile and permissions.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        serializer = self.serializer_class(request.user)
        return Response({"success": True, "data": serializer.data}, status=status.HTTP_200_OK)


class PasswordResetEmailRequestView(APIView):
    """
    Path A: Request email-based password reset for users with an email address.
    """

    permission_classes = [AllowAny]
    serializer_class = PasswordResetEmailRequestSerializer

    @extend_schema(
        request=PasswordResetEmailRequestSerializer,
        responses={200: OpenApiResponse(description="Password reset email dispatched")},
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()

        users = User.objects.filter(email__iexact=email, is_active=True)
        if users.exists():
            for user in users:
                token = default_token_generator.make_token(user)
                uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
                reset_url = f"/auth/password-reset/confirm/?uidb64={uidb64}&token={token}"
                send_mail(
                    subject="ASSDI Password Reset Request",
                    message=f"Hello {user.full_name},\n\nUse this link to reset your password:\n{reset_url}\n\nIf you did not request this, please ignore.",
                    from_email="no-reply@assunnahskill.edu.bd",
                    recipient_list=[user.email],
                    fail_silently=True,
                )

        return Response(
            {
                "success": True,
                "message": "If an active account exists with this email, password reset instructions have been sent.",
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """
    Confirm password reset via email token and set new password.
    """

    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    @extend_schema(
        request=PasswordResetConfirmSerializer,
        responses={200: OpenApiResponse(description="Password reset confirmed")},
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        uidb64 = serializer.validated_data["uidb64"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"success": False, "error": {"code": "INVALID_TOKEN", "message": "Invalid or expired reset token."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"success": False, "error": {"code": "INVALID_TOKEN", "message": "Invalid or expired reset token."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.must_change_password = False
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save()

        return Response(
            {"success": True, "message": "Password has been reset successfully. You can now log in."},
            status=status.HTTP_200_OK,
        )


class AdminResetPasswordView(APIView):
    """
    Path B: Admin or Coordinator sets temporary password for a student.
    Flags must_change_password = True.
    """

    permission_classes = [IsCoordinator]
    serializer_class = AdminResetPasswordSerializer

    @extend_schema(
        request=AdminResetPasswordSerializer,
        responses={200: OpenApiResponse(description="Temporary password set successfully")},
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_id = serializer.validated_data["user_id"]
        temporary_password = serializer.validated_data["temporary_password"]

        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "USER_NOT_FOUND", "message": "User not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        target_user.set_password(temporary_password)
        target_user.must_change_password = True
        target_user.failed_login_attempts = 0
        target_user.locked_until = None
        target_user.save()

        return Response(
            {
                "success": True,
                "message": f"Temporary password set for user {target_user.login_id}. User must change password at next login.",
            },
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    """
    Allows authenticated user to change their password and clears must_change_password flag.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    @extend_schema(
        request=ChangePasswordSerializer,
        responses={200: OpenApiResponse(description="Password changed successfully")},
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_password = serializer.validated_data["old_password"]
        new_password = serializer.validated_data["new_password"]

        user = request.user
        if not user.check_password(old_password):
            return Response(
                {"success": False, "error": {"code": "INCORRECT_PASSWORD", "message": "Current password does not match."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.must_change_password = False
        user.save()

        return Response(
            {"success": True, "message": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


# =========================================================================
# RBAC Test Endpoints (For Automated Role Verification Testing)
# =========================================================================

class SuperAdminTestView(APIView):
    """Restricted strictly to super_admin."""
    permission_classes = [IsSuperAdmin]

    @extend_schema(exclude=True)
    def get(self, request):
        return Response({"success": True, "role": request.user.role, "message": "Super admin access granted."})


class TeacherTestView(APIView):
    """Restricted to teacher, coordinator, super_admin."""
    permission_classes = [IsTeacher]

    @extend_schema(exclude=True)
    def get(self, request):
        return Response({"success": True, "role": request.user.role, "message": "Teacher access granted."})


class ObserverReadOnlyTestView(APIView):
    """Allows read access to observer, blocks write/mutation."""
    permission_classes = [IsObserverReadOnly]

    @extend_schema(exclude=True)
    def get(self, request):
        return Response({"success": True, "message": "Read access allowed."})

    @extend_schema(exclude=True)
    def post(self, request):
        return Response({"success": True, "message": "Write access allowed."})


# =========================================================================
# Teacher Management ViewSet (Super Admin Full CRUD, Coordinator Read/Assign)
# =========================================================================

class TeacherViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoint for Teacher faculty management.
    - Super Admin: List, Create, Update, Deactivate/Delete teachers.
    - Coordinator & Observer: List and Retrieve teachers.
    """

    queryset = User.objects.filter(role=UserRole.TEACHER).order_by("full_name")

    def get_serializer_class(self):
        if self.action == "create":
            return TeacherCreateSerializer
        return TeacherListSerializer

    def get_permissions(self):
        if self.action in ["create", "destroy", "update", "partial_update"]:
            return [IsSuperAdmin()]
        return [IsCoordinator()]

    def create(self, request, *args, **kwargs):
        serializer = TeacherCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            user = User.objects.create_user(
                login_id=data["login_id"],
                password=data.get("password") or "TeacherPass2026!",
                full_name=data["full_name"],
                role=UserRole.TEACHER,
                email=data.get("email"),
                phone=data.get("phone", ""),
                is_active=True,
            )

            batch_id = data.get("initial_batch_id")
            subject_id = data.get("initial_subject_id")
            if batch_id and subject_id:
                from apps.batches.models import TeacherAssignment
                TeacherAssignment.objects.create(
                    batch_id=batch_id,
                    subject_id=subject_id,
                    teacher_user=user,
                    is_primary=data.get("is_primary", True),
                )

            AuditLog.objects.create(
                actor_user=request.user,
                action="TEACHER_CREATED",
                entity_name="User",
                entity_id=str(user.id),
                new_values={"login_id": user.login_id, "full_name": user.full_name},
                ip_address=request.META.get("REMOTE_ADDR"),
            )

        out_serializer = TeacherListSerializer(user)
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        """Soft-deactivate teacher user account and log audit trail."""
        with transaction.atomic():
            instance.is_active = False
            instance.save(update_fields=["is_active"])
            instance.teacher_assignments.all().delete()
            AuditLog.objects.create(
                actor_user=self.request.user,
                action="TEACHER_DEACTIVATED",
                entity_name="User",
                entity_id=str(instance.id),
                old_values={"is_active": True},
                new_values={"is_active": False},
                ip_address=self.request.META.get("REMOTE_ADDR"),
            )
