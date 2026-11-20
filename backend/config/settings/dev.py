from .base import *

DEBUG = True

# Database Configuration
DB_ENGINE = config("DB_ENGINE", default="django.db.backends.postgresql")
DB_NAME = config("DB_NAME", default="assdi_db")
DB_USER = config("DB_USER", default="assdi_user")
DB_PASSWORD = config("DB_PASSWORD", default="assdi_secure_password_dev")
DB_HOST = config("DB_HOST", default="127.0.0.1")
DB_PORT = config("DB_PORT", default="5432")

DATABASES = {
    "default": {
        "ENGINE": DB_ENGINE,
        "NAME": DB_NAME,
        "USER": DB_USER,
        "PASSWORD": DB_PASSWORD,
        "HOST": DB_HOST,
        "PORT": DB_PORT,
    }
}

# CORS Configuration for local frontend development
CORS_ALLOW_ALL_ORIGINS = config("CORS_ALLOW_ALL_ORIGINS", default=True, cast=bool)
cors_origins = config("CORS_ALLOWED_ORIGINS", default="http://localhost:3000,http://127.0.0.1:3000")
CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_origins.split(",") if o.strip()]

# In development, output emails to console for password reset testing
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
