from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from server.deps import require_auth
import tiny_bi

router = APIRouter()


@router.get("/data")
async def get_data(
    source: str = Query(...),
    startYear: int = Query(...),
    endYear: int = Query(...),
    _: str = Depends(require_auth),
):
    return tiny_bi.build_dataset(source, startYear, endYear)

