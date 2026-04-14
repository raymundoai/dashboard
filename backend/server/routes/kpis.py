from __future__ import annotations
from fastapi import APIRouter, Depends, Query, HTTPException
from server.deps import require_auth
import tiny_bi

router = APIRouter()

@router.get("/kpis")
async def get_kpis(
    source: str = Query(...),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    _: str = Depends(require_auth),
):
    if source == 'all':
        raise HTTPException(status_code=422, detail="source='all' not supported for /kpis — call per-store sources and aggregate client-side")
    return tiny_bi.build_monthly_kpis(source, year, month)
