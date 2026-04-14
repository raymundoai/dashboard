from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from server.deps import require_auth
import tiny_bi

router = APIRouter()


class SyncRangeRequest(BaseModel):
    start_date: str   # YYYY-MM-DD
    end_date: str     # YYYY-MM-DD
    sources: list[str] | None = None


@router.post("/ga4/sync-range")
async def ga4_sync_range(
    body: SyncRangeRequest,
    _: str = Depends(require_auth),
):
    """Fetch GA4 data for a date range and persist to ga4_daily_metrics."""
    try:
        result = tiny_bi.sync_ga4_range(body.start_date, body.end_date, body.sources)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return result


@router.get("/ga4/coverage")
async def ga4_coverage(
    source: str,
    _: str = Depends(require_auth),
):
    """Return available date ranges stored in ga4_daily_metrics for a source."""
    import sqlite3
    conn = tiny_bi._db_connect()
    try:
        rows = conn.execute(
            """
            SELECT MIN(date) AS min_date, MAX(date) AS max_date, COUNT(*) AS days
            FROM ga4_daily_metrics
            WHERE source = ?
            """,
            (source,),
        ).fetchone()
    finally:
        conn.close()
    return {
        "source": source,
        "minDate": rows["min_date"],
        "maxDate": rows["max_date"],
        "days": rows["days"],
    }
