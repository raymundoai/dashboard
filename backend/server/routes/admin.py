from __future__ import annotations

import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, field_validator

import tiny_bi
from server.deps import require_admin

router = APIRouter()

_VALID_STORES = {"brewnh", "brewpoa", "bigb", "brew", "grow_fisica", "grow"}
_ECOM_STORES = {"brew", "grow"}


class StoreData(BaseModel):
    target_revenue: Optional[float] = None
    google_ads: Optional[float] = None
    meta_ads: Optional[float] = None


class MonthlyPayload(BaseModel):
    year: int
    month: int
    stores: dict[str, StoreData]

    @field_validator("year")
    @classmethod
    def validate_year(cls, v: int) -> int:
        if not (2020 <= v <= 2030):
            raise ValueError("year must be between 2020 and 2030")
        return v

    @field_validator("month")
    @classmethod
    def validate_month(cls, v: int) -> int:
        if not (1 <= v <= 12):
            raise ValueError("month must be between 1 and 12")
        return v


def _db() -> sqlite3.Connection:
    tiny_bi.ensure_database()
    return tiny_bi._db_connect()


@router.get("/admin/monthly")
async def get_monthly(
    year: int = Query(...),
    month: int = Query(...),
    _: str = Depends(require_admin),
):
    conn = _db()
    try:
        targets: dict[str, Optional[float]] = {code: None for code in _VALID_STORES}
        rows = conn.execute(
            "SELECT store_code, target_revenue FROM revenue_targets_monthly WHERE year=? AND month=?",
            (year, month),
        ).fetchall()
        for code, val in rows:
            if code in targets:
                targets[code] = val

        ad_spend: dict[str, dict[str, Optional[float]]] = {
            code: {"google_ads": None, "meta_ads": None} for code in _ECOM_STORES
        }
        rows = conn.execute(
            "SELECT store_code, platform, amount FROM ad_spend_monthly WHERE year=? AND month=?",
            (year, month),
        ).fetchall()
        for code, platform, amount in rows:
            if code in ad_spend and platform in ("google_ads", "meta_ads"):
                ad_spend[code][platform] = amount

        stores: dict[str, dict] = {}
        for code in _VALID_STORES:
            entry: dict = {"target_revenue": targets[code]}
            if code in _ECOM_STORES:
                entry["google_ads"] = ad_spend[code]["google_ads"]
                entry["meta_ads"] = ad_spend[code]["meta_ads"]
            stores[code] = entry

        return {"year": year, "month": month, "stores": stores}
    finally:
        conn.close()


@router.post("/admin/monthly")
async def post_monthly(
    payload: MonthlyPayload,
    _: str = Depends(require_admin),
):
    conn = _db()
    try:
        for store_code, data in payload.stores.items():
            if store_code not in _VALID_STORES:
                continue

            if data.target_revenue is not None:
                conn.execute(
                    """
                    INSERT INTO revenue_targets_monthly (store_code, year, month, target_revenue)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(store_code, year, month) DO UPDATE SET
                        target_revenue = excluded.target_revenue
                    """,
                    (store_code, payload.year, payload.month, data.target_revenue),
                )

            if store_code in _ECOM_STORES:
                for platform, amount in [("google_ads", data.google_ads), ("meta_ads", data.meta_ads)]:
                    if amount is None:
                        conn.execute(
                            "DELETE FROM ad_spend_monthly WHERE store_code=? AND year=? AND month=? AND platform=?",
                            (store_code, payload.year, payload.month, platform),
                        )
                    else:
                        conn.execute(
                            """
                            INSERT INTO ad_spend_monthly (store_code, year, month, platform, amount)
                            VALUES (?, ?, ?, ?, ?)
                            ON CONFLICT(store_code, year, month, platform) DO UPDATE SET amount = excluded.amount
                            """,
                            (store_code, payload.year, payload.month, platform, amount),
                        )

        conn.commit()
        return {"ok": True}
    finally:
        conn.close()
