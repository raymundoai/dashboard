from __future__ import annotations
import threading, uuid
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, Query
from server.deps import require_auth
from server.sync_runner import is_tiny_sync_running, run_tiny_sync
import tiny_bi

router = APIRouter()

_SYNC_JOBS: dict[str, dict] = {}
_SYNC_LOCK = threading.Lock()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_years(value: str) -> list[int]:
    years: list[int] = []
    for chunk in value.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" in chunk:
            start_str, end_str = chunk.split("-", 1)
            start = int(start_str)
            end = int(end_str)
            if end < start:
                raise ValueError(f"Invalid year range: {chunk}")
            years.extend(range(start, end + 1))
        else:
            years.append(int(chunk))
    if not years:
        raise ValueError("At least one year is required")
    return sorted(set(years))


def _run_sync_mode(
    source: str,
    mode: str,
    lookback_days: int,
    start: str | None,
    end: str | None,
    years: str | None,
) -> dict:
    if mode == "incremental":
        return run_tiny_sync(source=source, mode=mode, lookback_days=lookback_days)

    if mode == "range":
        if not start or not end:
            raise ValueError("mode=range requires start and end query params in YYYY-MM-DD format")
        return run_tiny_sync(
            source=source,
            mode=mode,
            start=date.fromisoformat(start),
            end=date.fromisoformat(end),
        )

    if mode == "backfill":
        if not years:
            raise ValueError("mode=backfill requires years query param, e.g. years=2024-2026")
        return run_tiny_sync(source=source, mode=mode, years=_parse_years(years))

    raise ValueError("Invalid sync mode. Use incremental, range, or backfill.")


@router.post("/sync")
async def trigger_sync(
    source: str = Query("all"),
    mode: str = Query("incremental"),
    lookback_days: int = Query(tiny_bi.SYNC_LOOKBACK_DAYS),
    start: str | None = Query(None),
    end: str | None = Query(None),
    years: str | None = Query(None),
    _: str = Depends(require_auth),
):
    job_id = str(uuid.uuid4())
    with _SYNC_LOCK:
        _SYNC_JOBS[job_id] = {
            "status": "running",
            "started_at": _utc_now(),
            "source": source,
            "mode": mode,
            "error": None,
            "result": None,
        }

    def _run():
        try:
            result = _run_sync_mode(source, mode, lookback_days, start, end, years)
            with _SYNC_LOCK:
                _SYNC_JOBS[job_id]["status"] = "done"
                _SYNC_JOBS[job_id]["finished_at"] = _utc_now()
                _SYNC_JOBS[job_id]["result"] = result
        except Exception as exc:
            with _SYNC_LOCK:
                _SYNC_JOBS[job_id]["status"] = "error"
                _SYNC_JOBS[job_id]["finished_at"] = _utc_now()
                _SYNC_JOBS[job_id]["error"] = str(exc)

    threading.Thread(target=_run, daemon=True).start()
    return {"job_id": job_id, "status": "running"}


@router.get("/sync/status")
async def sync_status(job_id: str | None = Query(None), _: str = Depends(require_auth)):
    if job_id:
        return _SYNC_JOBS.get(job_id, {"status": "not_found"})
    return {"jobs": list(_SYNC_JOBS.values())[-5:], "sync_running": is_tiny_sync_running()}
