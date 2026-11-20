import pytest
from django.urls import reverse
from rest_framework import status
from apps.accounts.models import UserRole


@pytest.mark.django_db
class TestAuthentication:

    def test_successful_login(self, api_client, student_user):
        """Verify valid login_id + password yields JWT tokens and user profile."""
        url = reverse("auth-login")
        payload = {
            "login_id": "STD-2026-042-001",
            "password": "SecurePass2026!",
        }
        response = api_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["success"] is True
        assert "access" in data["data"]
        assert "refresh" in data["data"]
        assert data["data"]["user"]["login_id"] == "STD-2026-042-001"
        assert data["data"]["user"]["role"] == UserRole.STUDENT

    def test_wrong_password_rejected(self, api_client, student_user):
        """Verify invalid credentials return 401 Unauthorized."""
        url = reverse("auth-login")
        payload = {
            "login_id": "STD-2026-042-001",
            "password": "WrongPassword123!",
        }
        response = api_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["success"] is False
        assert response.data["error"]["code"] == "INVALID_CREDENTIALS"

    def test_token_refresh(self, api_client, student_user):
        """Verify token refresh yields valid new access token."""
        login_url = reverse("auth-login")
        login_res = api_client.post(
            login_url,
            {"login_id": "STD-2026-042-001", "password": "SecurePass2026!"},
            format="json",
        )
        refresh_token = login_res.data["data"]["refresh"]

        refresh_url = reverse("auth-token-refresh")
        response = api_client.post(refresh_url, {"refresh": refresh_token}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_logout_invalidates_token(self, api_client, student_user):
        """Verify logout blacklists refresh token preventing subsequent refresh."""
        login_url = reverse("auth-login")
        login_res = api_client.post(
            login_url,
            {"login_id": "STD-2026-042-001", "password": "SecurePass2026!"},
            format="json",
        )
        access_token = login_res.data["data"]["access"]
        refresh_token = login_res.data["data"]["refresh"]

        # Authenticate client for logout
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logout_url = reverse("auth-logout")
        logout_res = api_client.post(logout_url, {"refresh": refresh_token}, format="json")

        assert logout_res.status_code == status.HTTP_200_OK
        assert logout_res.data["success"] is True

        # Attempt to use blacklisted refresh token
        refresh_url = reverse("auth-token-refresh")
        api_client.credentials()  # Clear credentials
        bad_refresh_res = api_client.post(refresh_url, {"refresh": refresh_token}, format="json")
        assert bad_refresh_res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_returns_right_role(self, api_client, teacher_user):
        """Verify /auth/me returns current user role and profile."""
        login_url = reverse("auth-login")
        login_res = api_client.post(
            login_url,
            {"login_id": "teacher01", "password": "SecurePass2026!"},
            format="json",
        )
        access_token = login_res.data["data"]["access"]

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        me_url = reverse("auth-me")
        me_res = api_client.get(me_url)

        assert me_res.status_code == status.HTTP_200_OK
        assert me_res.data["data"]["role"] == UserRole.TEACHER
        assert me_res.data["data"]["login_id"] == "teacher01"

    def test_role_isolation_enforcement(self, api_client, student_user, teacher_user):
        """Verify strict server-side RBAC: Student cannot access teacher/admin endpoints."""
        # 1. Login as Student
        login_url = reverse("auth-login")
        s_res = api_client.post(
            login_url,
            {"login_id": "STD-2026-042-001", "password": "SecurePass2026!"},
            format="json",
        )
        s_token = s_res.data["data"]["access"]

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {s_token}")
        admin_test_url = reverse("test-super-admin")
        teacher_test_url = reverse("test-teacher")

        # Student forbidden from admin and teacher endpoints
        assert api_client.get(admin_test_url).status_code == status.HTTP_403_FORBIDDEN
        assert api_client.get(teacher_test_url).status_code == status.HTTP_403_FORBIDDEN

        # 2. Login as Teacher
        t_res = api_client.post(
            login_url,
            {"login_id": "teacher01", "password": "SecurePass2026!"},
            format="json",
        )
        t_token = t_res.data["data"]["access"]

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {t_token}")
        # Teacher allowed on teacher endpoint
        assert api_client.get(teacher_test_url).status_code == status.HTTP_200_OK
        # Teacher forbidden on super admin endpoint
        assert api_client.get(admin_test_url).status_code == status.HTTP_403_FORBIDDEN

    def test_observer_read_only_restriction(self, api_client, observer_user):
        """Verify observer role has strictly read-only access (mutations return 403)."""
        login_url = reverse("auth-login")
        res = api_client.post(
            login_url,
            {"login_id": "observer01", "password": "SecurePass2026!"},
            format="json",
        )
        token = res.data["data"]["access"]

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        obs_url = reverse("test-observer")

        # GET is allowed
        assert api_client.get(obs_url).status_code == status.HTTP_200_OK
        # POST is forbidden for observer
        assert api_client.post(obs_url, {}, format="json").status_code == status.HTTP_403_FORBIDDEN

    def test_admin_password_reset_and_change_flow(
        self, api_client, coordinator_user, student_user
    ):
        """Verify admin temporary password reset and mandatory user password change flow."""
        # 1. Login as Coordinator
        c_login = api_client.post(
            reverse("auth-login"),
            {"login_id": "coord01", "password": "SecurePass2026!"},
            format="json",
        )
        c_token = c_login.data["data"]["access"]

        # 2. Coordinator sets temporary password for student
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {c_token}")
        reset_url = reverse("auth-admin-reset-password")
        reset_res = api_client.post(
            reset_url,
            {
                "user_id": str(student_user.id),
                "temporary_password": "TempStudentPass2026!",
            },
            format="json",
        )
        assert reset_res.status_code == status.HTTP_200_OK

        # 3. Student logs in with temporary password
        api_client.credentials()  # Clear credentials
        s_login = api_client.post(
            reverse("auth-login"),
            {"login_id": "STD-2026-042-001", "password": "TempStudentPass2026!"},
            format="json",
        )
        assert s_login.status_code == status.HTTP_200_OK
        assert s_login.data["data"]["user"]["must_change_password"] is True
        s_token = s_login.data["data"]["access"]

        # 4. Student changes password
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {s_token}")
        change_url = reverse("auth-change-password")
        change_res = api_client.post(
            change_url,
            {
                "old_password": "TempStudentPass2026!",
                "new_password": "NewPermanentStudentPass2026!",
            },
            format="json",
        )
        assert change_res.status_code == status.HTTP_200_OK

        # 5. Check must_change_password is now False via /auth/me
        me_res = api_client.get(reverse("auth-me"))
        assert me_res.data["data"]["must_change_password"] is False

    def test_account_lockout_on_failed_attempts(self, api_client, student_user):
        """Verify 5 consecutive failed attempts trigger account lock (429 Too Many Requests)."""
        url = reverse("auth-login")
        bad_payload = {
            "login_id": "STD-2026-042-001",
            "password": "BadPassword!",
        }

        # 4 failed attempts -> 401
        for _ in range(4):
            res = api_client.post(url, bad_payload, format="json")
            assert res.status_code == status.HTTP_401_UNAUTHORIZED

        # 5th failed attempt -> 429 Account Locked
        res5 = api_client.post(url, bad_payload, format="json")
        assert res5.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert res5.data["error"]["code"] == "ACCOUNT_LOCKED"
