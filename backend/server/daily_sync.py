from __future__ import annotations

import asyncio
import contextlib
import logging
import os
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import tiny_bi
from server.sync_runner import run_tiny_sync


logger = logging.getLogger(__name__)

TRUE_VALUES = {"1", "true", "yes", "on", "sim"}


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in TRUE_VALUES


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or not value.strip():
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning("%s invalido (%r); usando %s", name, value, default)
        return default


def _env_date(name: str) -> date | None:
    value = os.getenv(name)
    if value is None or not value.strip():
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        logger.warning("%s invalido (%r); ignorando", name, value)
        return None


def _parse_time(value: str | None) -> tuple[int, int]:
    if not value:
        hour = _env_int("DAILY_SYNC_HOUR", 5)
        return max(0, min(23, hour)), 0

    try:
        hour_text, minute_text = value.split(":", 1)
        hour = int(hour_text)
        minute = int(minute_text)
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError
        return hour, minute
    except ValueError:
        logger.warning("DAILY_SYNC_TIME invalido (%r); usando 05:00", value)
        return 5, 0


class DailySyncScheduler:
    def __init__(self) -> None:
        self.enabled = _env_bool("DAILY_SYNC_ENABLED", False)
        self.run_on_start = _env_bool("DAILY_SYNC_RUN_ON_START", False)
        self.source = os.getenv("DAILY_SYNC_SOURCE", "all")
        self.mode = os.getenv("DAILY_SYNC_MODE", "incremental").strip().lower()
        self.lookback_days = _env_int("DAILY_SYNC_LOOKBACK_DAYS", 180)
        self.start_date = _env_date("DAILY_SYNC_START_DATE")
        self.end_date = _env_date("DAILY_SYNC_END_DATE")
        self.ga4_enabled = _env_bool("DAILY_SYNC_GA4_ENABLED", False)
        self.hour, self.minute = _parse_time(os.getenv("DAILY_SYNC_TIME"))
        self.timezone_name = os.getenv("DAILY_SYNC_TIMEZONE", "America/Sao_Paulo")
        self._task: asyncio.Task[None] | None = None
        self._stopping = asyncio.Event()

        try:
            self.timezone = ZoneInfo(self.timezone_name)
        except ZoneInfoNotFoundError:
            logger.warning(
                "DAILY_SYNC_TIMEZONE invalido (%r); usando America/Sao_Paulo",
                self.timezone_name,
            )
            self.timezone_name = "America/Sao_Paulo"
            self.timezone = ZoneInfo(self.timezone_name)

    def start(self) -> None:
        if not self.enabled:
            logger.info("Daily sync scheduler desativado")
            return
        if self._task is not None:
            return

        self._stopping.clear()
        self._task = asyncio.create_task(self._run_loop(), name="daily-sync-scheduler")
        logger.info(
            "Daily sync scheduler ativo: %02d:%02d %s, source=%s, mode=%s, lookback=%sd, start=%s, ga4=%s",
            self.hour,
            self.minute,
            self.timezone_name,
            self.source,
            self.mode,
            self.lookback_days,
            self.start_date.isoformat() if self.start_date else None,
            self.ga4_enabled,
        )

    async def stop(self) -> None:
        self._stopping.set()
        if self._task is None:
            return

        self._task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._task
        self._task = None

    async def _run_loop(self) -> None:
        if self.run_on_start:
            await self._execute("startup")

        while not self._stopping.is_set():
            next_run = self._next_run_at()
            wait_seconds = max(1.0, (next_run - datetime.now(self.timezone)).total_seconds())
            logger.info("Proxima sincronizacao diaria agendada para %s", next_run.isoformat())

            try:
                await asyncio.wait_for(self._stopping.wait(), timeout=wait_seconds)
                break
            except asyncio.TimeoutError:
                await self._execute("scheduled")

    def _next_run_at(self) -> datetime:
        now = datetime.now(self.timezone)
        scheduled = now.replace(hour=self.hour, minute=self.minute, second=0, microsecond=0)
        if scheduled <= now:
            scheduled += timedelta(days=1)
        return scheduled

    async def _execute(self, reason: str) -> None:
        logger.info("Iniciando sincronizacao diaria (%s)", reason)
        try:
            result = await asyncio.to_thread(self._run_syncs)
            logger.info("Sincronizacao diaria concluida: %s", result)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Sincronizacao diaria falhou: %s", exc)

    def _run_syncs(self) -> dict[str, Any]:
        result: dict[str, Any] = {"tiny": self._run_tiny_sync()}
        if self.ga4_enabled:
            result["ga4"] = tiny_bi.sync_ga4_daily()
        return result

    def _run_tiny_sync(self) -> dict[str, Any]:
        if self.mode == "range":
            if self.start_date is None:
                raise ValueError("DAILY_SYNC_MODE=range exige DAILY_SYNC_START_DATE")
            return run_tiny_sync(
                source=self.source,
                mode="range",
                start=self.start_date,
                end=self.end_date or datetime.now(self.timezone).date(),
            )

        if self.mode == "incremental":
            return run_tiny_sync(
                source=self.source,
                mode="incremental",
                lookback_days=self.lookback_days,
            )

        raise ValueError("DAILY_SYNC_MODE deve ser incremental ou range")
