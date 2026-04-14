from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from server.deps import require_auth
import tiny_bi

router = APIRouter()

@router.get("/customers")
async def get_customers(
    source: str = Query(...),
    period: str = Query("30d"),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    _: str = Depends(require_auth),
):
    return tiny_bi.build_customers_payload(source, period, start_date, end_date)
