from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import UserRole


class BaseRolePermission(BasePermission):
    """Base helper to verify user is authenticated and active."""

    def is_valid_user(self, request):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
        )


class IsSuperAdmin(BaseRolePermission):
    """Allows access exclusively to Super Administrators."""

    def has_permission(self, request, view):
        return self.is_valid_user(request) and request.user.role == UserRole.SUPER_ADMIN


class IsCoordinator(BaseRolePermission):
    """Allows access to Course Coordinators and Super Admins."""

    def has_permission(self, request, view):
        return self.is_valid_user(request) and request.user.role in [
            UserRole.COORDINATOR,
            UserRole.SUPER_ADMIN,
        ]


class IsTeacher(BaseRolePermission):
    """Allows access to Teachers, Coordinators and Super Admins."""

    def has_permission(self, request, view):
        return self.is_valid_user(request) and request.user.role in [
            UserRole.TEACHER,
            UserRole.COORDINATOR,
            UserRole.SUPER_ADMIN,
        ]


class IsStudent(BaseRolePermission):
    """Allows access to enrolled students."""

    def has_permission(self, request, view):
        return self.is_valid_user(request) and request.user.role == UserRole.STUDENT


class IsObserverReadOnly(BaseRolePermission):
    """
    Observers have strictly Read-Only access.
    Mutating methods (POST, PUT, PATCH, DELETE) return 403 Forbidden.
    """

    def has_permission(self, request, view):
        if not self.is_valid_user(request):
            return False

        if request.user.role == UserRole.OBSERVER:
            return request.method in SAFE_METHODS

        # Allow other roles to pass through if view combines permissions
        return True


def RoleRequired(*allowed_roles):
    """
    Dynamic factory returning a DRF permission class that permits
    any of the specified roles (and always Super Admin).
    """

    class DynamicRolePermission(BaseRolePermission):
        def has_permission(self, request, view):
            if not self.is_valid_user(request):
                return False

            if request.user.role == UserRole.SUPER_ADMIN:
                return True

            return request.user.role in allowed_roles

    return DynamicRolePermission
