from __future__ import annotations

import threading
from datetime import date
from typing import Any

import tiny_bi


_TINY_SYNC_LOCK = threading.Lock()


def is_tiny_sync_running() -> bool:
    return _TINY_SYNC_LOCK.locked()


def run_tiny_sync(
    *,
    source: str = "all",
    mode: str = "incremental",
    lookback_days: int | None = None,
    start: date | None = None,
    end: date | None = None,
    years: list[int] | None = None,
) -> dict[str, Any]:
    if not _TINY_SYNC_LOCK.acquire(blocking=False):
        raise RuntimeError("Sincronizacao Tiny ja esta em andamento")

    try:
        if mode == "incremental":
            if lookback_days is None:
                return tiny_bi.sync_incremental(source=source)
            return tiny_bi.sync_incremental(source=source, lookback_days=lookback_days)

        if mode == "range":
            if start is None or end is None:
                raise ValueError("mode=range exige start e end")
            return tiny_bi.sync_date_range(source, start, end)

        if mode == "backfill":
            if not years:
                raise ValueError("mode=backfill exige years")
            return tiny_bi.backfill_years(source, years)

        raise ValueError("Modo de sincronizacao invalido")
    finally:
        _TINY_SYNC_LOCK.release()


def run_tiny_incremental(*, source: str = "all", lookback_days: int | None = None) -> dict[str, Any]:
    return run_tiny_sync(source=source, mode="incremental", lookback_days=lookback_days)
