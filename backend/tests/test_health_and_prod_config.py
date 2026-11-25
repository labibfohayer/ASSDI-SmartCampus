import importlib
import sys

import pytest


def test_root_and_api_health_endpoints(client):
    """Root and /api/v1/health/ must return 200 OK without authentication for Render probes."""
    for url in ("/", "/api/v1/health/"):
        resp = client.get(url)
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok", "service": "assdi-backend"}


def test_prod_settings_parses_database_url_and_render_host(monkeypatch):
    """Production settings must support DATABASE_URL and RENDER_EXTERNAL_HOSTNAME cleanly."""
    monkeypatch.setenv("DATABASE_URL", "postgresql://demo:secret@ep-example.neon.tech:5432/neondb")
    monkeypatch.setenv("RENDER_EXTERNAL_HOSTNAME", "assdi-backend.onrender.com")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://assdi-smartcampus.pages.dev")
    monkeypatch.setenv("SECRET_KEY", "test-prod-secret-key-not-real")

    sys.modules.pop("config.settings.prod", None)
    prod = importlib.import_module("config.settings.prod")

    assert prod.DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql"
    assert prod.DATABASES["default"]["NAME"] == "neondb"
    assert prod.DATABASES["default"]["HOST"] == "ep-example.neon.tech"
    assert "assdi-backend.onrender.com" in prod.ALLOWED_HOSTS
    assert "https://assdi-smartcampus.pages.dev" in prod.CORS_ALLOWED_ORIGINS
    assert "https://assdi-backend.onrender.com" in prod.CSRF_TRUSTED_ORIGINS
    assert prod.SECURE_REDIRECT_EXEMPT == [r"^$", r"^api/v1/health/$"]

    # Pooled Neon URLs automatically disable persistent conn_max_age and server-side cursors
    monkeypatch.setenv("DATABASE_URL", "postgresql://demo:secret@ep-example-pooler.neon.tech:5432/neondb")
    sys.modules.pop("config.settings.prod", None)
    prod_pooled = importlib.import_module("config.settings.prod")
    assert prod_pooled.DATABASES["default"]["CONN_MAX_AGE"] == 0
    assert prod_pooled.DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] is True
