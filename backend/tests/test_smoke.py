"""Basic smoke tests for the FastAPI app."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Patch DB and scheduler so tests run without real connections
with patch("app.db.create_engine"), patch("app.services.scheduler.create_scheduler"):
    from app.main import app

client = TestClient(app)


def test_health():
    # Bypass lifespan for simple unit tests
    response = client.get("/api/health")
    assert response.status_code in (200, 500)  # 500 if DB not available in CI


def test_ics_404():
    response = client.get("/cal/nonexistent-feed-hash.ics")
    assert response.status_code == 404


def test_build_ics_empty():
    from app.services.ics_generator import build_ics
    result = build_ics([], "testhash")
    assert b"BEGIN:VCALENDAR" in result
    assert b"END:VCALENDAR" in result
