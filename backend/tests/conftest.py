from __future__ import annotations
import os
import tempfile
import sqlite3

# Set env vars BEFORE importing any app modules
os.environ.setdefault("AUTH_USER_1_NAME", "admin")
os.environ.setdefault("AUTH_USER_1_HASH", "$2b$12$929/BICTWnFHFQZULrgsNuwhdidfUuAUxaa5LwJ/wFwJx4lQ/u7oa")  # Brew051104
os.environ.setdefault("AUTH_USER_2_NAME", "xico")
os.environ.setdefault("AUTH_USER_2_HASH", "$2b$12$929/BICTWnFHFQZULrgsNuwhdidfUuAUxaa5LwJ/wFwJx4lQ/u7oa")
os.environ.setdefault("AUTH_SECRET", "test-secret-do-not-use-in-prod")

# Create temp DB file (avoid deprecated tempfile.mktemp)
_tmp_db_file = tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False)
_tmp_db_file.close()
os.environ.setdefault("TINY_DB_PATH", _tmp_db_file.name)

import pytest
from fastapi.testclient import TestClient


def _seed_stores(db_path: str) -> None:
    """Insert the 6 known store rows so FK constraints on revenue_targets_monthly pass."""
    stores = [
        ("brewnh",     "Brew NH",    "tag",       None,      "brewnh"),
        ("brewpoa",    "Brew POA",   "tag",       None,      "brewpoa"),
        ("bigb",       "Big B",      "tag",       None,      "bigb"),
        ("brew",       "Brew Site",  "ecommerce", "Brew",    None),
        ("grow_fisica","Grow Loja",  "tag",       None,      "grow"),
        ("grow",       "Grow Site",  "ecommerce", "Grow",    None),
    ]
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    for code, label, stype, ecom, tag in stores:
        conn.execute(
            "INSERT OR IGNORE INTO stores (code, label, store_type, ecommerce_name, marker_tag) VALUES (?,?,?,?,?)",
            (code, label, stype, ecom, tag),
        )
    conn.commit()
    conn.close()


@pytest.fixture(scope="session")
def client():
    from server.main import app
    import tiny_bi
    tiny_bi.ensure_database(force=True)
    _seed_stores(str(tiny_bi.DB_PATH))
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture
def admin_client(client):
    """A TestClient for admin — separate cookie jar from the shared client."""
    from fastapi.testclient import TestClient
    from server.main import app
    c = TestClient(app, raise_server_exceptions=True)
    r = c.post("/api/auth/login", data={"username": "admin", "password": "Brew051104"})
    assert r.status_code == 200
    return c


@pytest.fixture
def viewer_client(client):
    """A TestClient for viewer — separate cookie jar from the shared client."""
    from fastapi.testclient import TestClient
    from server.main import app
    c = TestClient(app, raise_server_exceptions=True)
    r = c.post("/api/auth/login", data={"username": "xico", "password": "Brew051104"})
    assert r.status_code == 200
    return c
