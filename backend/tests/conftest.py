import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User, UserRole


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def super_admin_user(db):
    return User.objects.create_user(
        login_id="admin01",
        full_name="Rahim Admin (Test)",
        role=UserRole.SUPER_ADMIN,
        email="admin@assdi.local",
        password="SecurePass2026!",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def coordinator_user(db):
    return User.objects.create_user(
        login_id="coord01",
        full_name="Karim Coordinator (Test)",
        role=UserRole.COORDINATOR,
        email="coord@assdi.local",
        password="SecurePass2026!",
    )


@pytest.fixture
def teacher_user(db):
    return User.objects.create_user(
        login_id="teacher01",
        full_name="Masud Teacher (Test)",
        role=UserRole.TEACHER,
        email="teacher@assdi.local",
        password="SecurePass2026!",
    )


@pytest.fixture
def student_user(db):
    return User.objects.create_user(
        login_id="STD-2026-042-001",
        full_name="Abdullah Student (Test)",
        role=UserRole.STUDENT,
        password="SecurePass2026!",
    )


@pytest.fixture
def observer_user(db):
    return User.objects.create_user(
        login_id="observer01",
        full_name="Tariq Observer (Test)",
        role=UserRole.OBSERVER,
        email="observer@assdi.local",
        password="SecurePass2026!",
    )
