from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from server.deps import require_auth
import tiny_bi

router = APIRouter()

@router.get("/products")
async def get_products(
    source: str = Query(...),
    period: str = Query("current_year"),
    metric: str = Query("revenue"),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    _: str = Depends(require_auth),
):
    return tiny_bi.build_products_payload(source, period, metric, start_date, end_date)
