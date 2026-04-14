from __future__ import annotations
import pytest


VALID_STORES = ["brewnh", "brewpoa", "bigb", "brew", "grow_fisica", "grow"]
ECOM_STORES = {"brew", "grow"}


def test_get_monthly_returns_all_stores(admin_client):
    r = admin_client.get("/api/admin/monthly?year=2026&month=3")
    assert r.status_code == 200
    body = r.json()
    assert body["year"] == 2026
    assert body["month"] == 3
    assert set(body["stores"].keys()) == set(VALID_STORES)


def test_get_monthly_ecom_stores_have_ad_fields(admin_client):
    r = admin_client.get("/api/admin/monthly?year=2026&month=3")
    stores = r.json()["stores"]
    for code in ECOM_STORES:
        assert "google_ads" in stores[code]
        assert "meta_ads" in stores[code]


def test_get_monthly_non_ecom_stores_no_ad_fields(admin_client):
    r = admin_client.get("/api/admin/monthly?year=2026&month=3")
    stores = r.json()["stores"]
    for code in set(VALID_STORES) - ECOM_STORES:
        assert "google_ads" not in stores[code]
        assert "meta_ads" not in stores[code]


def test_get_monthly_empty_returns_nulls(admin_client):
    r = admin_client.get("/api/admin/monthly?year=2020&month=1")
    stores = r.json()["stores"]
    for code, data in stores.items():
        for v in data.values():
            assert v is None


def test_post_monthly_upserts_target(admin_client):
    payload = {
        "year": 2026, "month": 3,
        "stores": {"brewnh": {"target_revenue": 150000}}
    }
    r = admin_client.post("/api/admin/monthly", json=payload)
    assert r.status_code == 200
    assert r.json()["ok"] is True
    r2 = admin_client.get("/api/admin/monthly?year=2026&month=3")
    assert r2.json()["stores"]["brewnh"]["target_revenue"] == 150000


def test_post_monthly_upserts_ad_spend(admin_client):
    payload = {
        "year": 2026, "month": 3,
        "stores": {"brew": {"target_revenue": 43200, "google_ads": 3500.0, "meta_ads": None}}
    }
    r = admin_client.post("/api/admin/monthly", json=payload)
    assert r.status_code == 200
    r2 = admin_client.get("/api/admin/monthly?year=2026&month=3")
    brew = r2.json()["stores"]["brew"]
    assert brew["google_ads"] == 3500.0
    assert brew["meta_ads"] is None


def test_post_monthly_null_ad_spend_deletes_row(admin_client):
    admin_client.post("/api/admin/monthly", json={
        "year": 2026, "month": 4,
        "stores": {"grow": {"meta_ads": 150.0}}
    })
    admin_client.post("/api/admin/monthly", json={
        "year": 2026, "month": 4,
        "stores": {"grow": {"meta_ads": None}}
    })
    r = admin_client.get("/api/admin/monthly?year=2026&month=4")
    assert r.json()["stores"]["grow"]["meta_ads"] is None


def test_post_monthly_invalid_month(admin_client):
    r = admin_client.post("/api/admin/monthly", json={
        "year": 2026, "month": 13,
        "stores": {"brewnh": {"target_revenue": 1000}}
    })
    assert r.status_code == 422


def test_post_monthly_unknown_store_ignored(admin_client):
    r = admin_client.post("/api/admin/monthly", json={
        "year": 2026, "month": 3,
        "stores": {"nonexistent_store": {"target_revenue": 999}}
    })
    assert r.status_code == 200


def test_viewer_cannot_access_admin_routes(viewer_client):
    r = viewer_client.get("/api/admin/monthly?year=2026&month=3")
    assert r.status_code == 403
    r2 = viewer_client.post("/api/admin/monthly", json={"year": 2026, "month": 3, "stores": {}})
    assert r2.status_code == 403


def test_unauthenticated_cannot_access_admin_routes(client):
    from fastapi.testclient import TestClient
    from server.main import app
    fresh = TestClient(app, raise_server_exceptions=True)
    r = fresh.get("/api/admin/monthly?year=2026&month=3")
    assert r.status_code == 401
