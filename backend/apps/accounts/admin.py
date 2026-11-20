from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "login_id",
        "full_name",
        "role",
        "email",
        "phone",
        "is_active",
        "must_change_password",
        "created_at",
    )
    list_filter = ("role", "is_active", "must_change_password")
    search_fields = ("login_id", "full_name", "email", "phone")
    ordering = ("-created_at",)

    fieldsets = (
        (None, {"fields": ("login_id", "password")}),
        (
            "Personal info",
            {"fields": ("full_name", "email", "phone", "role")},
        ),
        (
            "Security & Lockout",
            {
                "fields": (
                    "must_change_password",
                    "failed_login_attempts",
                    "locked_until",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Important dates",
            {"fields": ("last_login", "soft_deleted_at", "created_at", "updated_at")},
        ),
    )
    readonly_fields = ("created_at", "updated_at", "last_login")

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("login_id", "full_name", "role", "password", "is_active"),
            },
        ),
    )
