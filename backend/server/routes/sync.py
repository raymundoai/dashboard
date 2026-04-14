from __future__ import annotations
import threading, uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from server.deps import require_auth
import tiny_bi

router = APIRouter()

_SYNC_JOBS: dict[str, dict] = {}
_SYNC_LOCK = threading.Lock()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/sync")
async def trigger_sync(
    source: str = Query("all"),
    mode: str = Query("incremental"),
    lookback_days: int = Query(7),
    _: str = Depends(require_auth),
):
    job_id = str(uuid.uuid4())
    with _SYNC_LOCK:
        _SYNC_JOBS[job_id] = {"status": "running", "started_at": _utc_now(), "error": None}

    def _run():
        try:
            tiny_bi.sync_incremental(source=source, lookback_days=lookback_days)
            with _SYNC_LOCK:
                _SYNC_JOBS[job_id]["status"] = "done"
        except Exception as exc:
            with _SYNC_LOCK:
                _SYNC_JOBS[job_id]["status"] = "error"
                _SYNC_JOBS[job_id]["error"] = str(exc)

    threading.Thread(target=_run, daemon=True).start()
    return {"job_id": job_id, "status": "running"}


@router.get("/sync/status")
async def sync_status(job_id: str | None = Query(None), _: str = Depends(require_auth)):
    if job_id:
        return _SYNC_JOBS.get(job_id, {"status": "not_found"})
    return {"jobs": list(_SYNC_JOBS.values())[-5:]}
