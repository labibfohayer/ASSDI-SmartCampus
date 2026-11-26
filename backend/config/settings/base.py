import os
import sys
from datetime import timedelta
from pathlib import Path
from decouple import Config, RepositoryEnv

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent

# Add apps to sys.path
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / "apps"))

# Load .env from ROOT_DIR or BASE_DIR
env_path = ROOT_DIR / ".env"
if not env_path.exists():
    env_path = BASE_DIR / ".env"

if env_path.exists():
    config = Config(RepositoryEnv(str(env_path)))
else:
    from decouple import config

# Security
SECRET_KEY = config(
    "SECRET_KEY",
    default="django-insecure-change-this-in-production-assdi-demo-key-2026",
)
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = [
    h.strip()
    for h in config("ALLOWED_HOSTS", default="localhost,127.0.0.1,0.0.0.0").split(",")
    if h.strip()
]
if "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")

# Application definition
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.accounts.apps.AccountsConfig",
    "apps.academic.apps.AcademicConfig",
    "apps.batches.apps.BatchesConfig",
    "apps.students.apps.StudentsConfig",
    "apps.class_sessions.apps.ClassSessionsConfig",
    "apps.feedback.apps.FeedbackConfig",
    "apps.attendance.apps.AttendanceConfig",
    "apps.audit.apps.AuditConfig",
    "apps.reports.apps.ReportsConfig",
    "apps.notifications.apps.NotificationsConfig",
    "apps.assignments.apps.AssignmentsConfig",
    "apps.examinations.apps.ExaminationsConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Custom User Model
AUTH_USER_MODEL = "accounts.User"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Dhaka"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/minute",
        "user": "500/minute",
        "login_ip": config("THROTTLE_LOGIN_IP_RATE", default="100/minute"),
    },
}

# SimpleJWT Settings
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=60, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# drf-spectacular (OpenAPI 3.0)
SPECTACULAR_SETTINGS = {
    "TITLE": "ASSDI Student Learning Progress, Feedback & Management System API",
    "DESCRIPTION": (
        "Comprehensive REST API for As-Sunnah Skill Development Institute (ASSDI). "
        "Strict role-based access control across super_admin, coordinator, teacher, "
        "student, and observer roles."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "AudienceEnum": "apps.academic.models.SubjectAudience",
    },
}

# Custom Configurable Throttling Limits
THROTTLE_LOGIN_ACCOUNT_FAILED_LIMIT = config(
    "THROTTLE_LOGIN_ACCOUNT_FAILED_LIMIT", default=5, cast=int
)
THROTTLE_LOGIN_ACCOUNT_LOCK_MINUTES = config(
    "THROTTLE_LOGIN_ACCOUNT_LOCK_MINUTES", default=5, cast=int
)

# Academic Timetable & Session Generation Settings
# 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
SCHOOL_DAYS = [
    int(d.strip())
    for d in config("SCHOOL_DAYS", default="0,1,2,3,4").split(",")
    if d.strip()
]

# Daily Feedback Submission Settings
FEEDBACK_WINDOW_HOURS = config("FEEDBACK_WINDOW_HOURS", default=24, cast=int)

# Attendance Management Engine Settings (Sprint 5)
QR_TOKEN_VALIDITY_SECONDS = config("QR_TOKEN_VALIDITY_SECONDS", default=45, cast=int)
QR_WINDOW_MINUTES = config("QR_WINDOW_MINUTES", default=15, cast=int)
LATE_THRESHOLD_MINUTES = config("LATE_THRESHOLD_MINUTES", default=10, cast=int)
ATTENDANCE_CORRECTION_WINDOW_HOURS = config("ATTENDANCE_CORRECTION_WINDOW_HOURS", default=48, cast=int)
REPEATED_ABSENCE_CONSECUTIVE = config("REPEATED_ABSENCE_CONSECUTIVE", default=3, cast=int)
REPEATED_ABSENCE_TOTAL = config("REPEATED_ABSENCE_TOTAL", default=5, cast=int)
