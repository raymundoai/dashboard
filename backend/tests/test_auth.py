from __future__ import annotations
import pytest


def test_login_sets_cookie(client):
    r = client.post("/api/auth/login", data={"username": "admin", "password": "Brew051104"})
    assert r.status_code == 200
    assert r.json()["username"] == "admin"
    assert "brew_session" in r.cookies


def test_login_embeds_role_viewer(client):
    r = client.post("/api/auth/login", data={"username": "xico", "password": "Brew051104"})
    assert r.status_code == 200
    assert r.json()["username"] == "xico"


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", data={"username": "admin", "password": "wrong"})
    assert r.status_code == 401


def test_me_returns_role_admin(admin_client):
    r = admin_client.get("/api/auth/me")
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "admin"
    assert body["role"] == "admin"


def test_me_returns_role_viewer(viewer_client):
    r = viewer_client.get("/api/auth/me")
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "xico"
    assert body["role"] == "viewer"


def test_me_unauthenticated(client):
    from fastapi.testclient import TestClient
    from server.main import app
    fresh = TestClient(app, raise_server_exceptions=True)
    r = fresh.get("/api/auth/me")
    assert r.status_code == 401


def test_logout_clears_cookie(admin_client):
    r = admin_client.post("/api/auth/logout")
    assert r.status_code == 200
    r2 = admin_client.get("/api/auth/me")
    assert r2.status_code == 401


def test_require_auth_blocks_unauthenticated(client):
    """A protected route should return 401 without a valid cookie."""
    from fastapi.testclient import TestClient
    from server.main import app
    fresh = TestClient(app, raise_server_exceptions=True)
    r = fresh.get("/api/data?source=brew&startYear=2026&endYear=2026")
    assert r.status_code == 401


def test_require_admin_blocks_viewer(viewer_client):
    """Admin routes must return 403 for viewer role."""
    r = viewer_client.get("/api/admin/monthly?year=2026&month=3")
    assert r.status_code == 403


def test_require_admin_allows_admin(admin_client):
    """Admin routes must return 200 for admin role."""
    r = admin_client.get("/api/admin/monthly?year=2026&month=3")
    assert r.status_code == 200
