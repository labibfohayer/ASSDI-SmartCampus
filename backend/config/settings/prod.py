import os
import dj_database_url
from .base import *

DEBUG = False

# Database Configuration (Supports DATABASE_URL for Neon / Render, or discrete DB_* vars)
database_url = os.environ.get("DATABASE_URL") or config("DATABASE_URL", default="")
if database_url:
    DATABASES = {
        "default": dj_database_url.parse(
            database_url,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=True,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("DB_NAME"),
            "USER": config("DB_USER"),
            "PASSWORD": config("DB_PASSWORD"),
            "HOST": config("DB_HOST", default="db"),
            "PORT": config("DB_PORT", default="5432"),
            "CONN_MAX_AGE": 600,
        }
    }

# Render / Cloud Hostname Support
render_external_hostname = os.environ.get("RENDER_EXTERNAL_HOSTNAME", "").strip()
if render_external_hostname and render_external_hostname not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_external_hostname)

# Static files serving via WhiteNoise
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

# Strict Security Headers (exempt internal health checks so Render probe gets 200 OK)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
SECURE_REDIRECT_EXEMPT = [r"^$", r"^api/v1/health/$"]
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CORS & CSRF Configuration in Production
CORS_ALLOW_ALL_ORIGINS = False
cors_origins = config(
    "CORS_ALLOWED_ORIGINS",
    default="https://assdi-smartcampus.pages.dev",
)
CORS_ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in cors_origins.split(",") if o.strip()]

CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)
if render_external_hostname:
    CSRF_TRUSTED_ORIGINS.append(f"https://{render_external_hostname}")
