#!/usr/bin/env python3
"""Sync GA4 data into ga4_daily_metrics.

Usage:
    python sync_ga4_hist.py                    # yesterday (daily cron)
    python sync_ga4_hist.py 2026-03            # full month
    python sync_ga4_hist.py 2026-01-01 2026-02-28  # explicit range
"""
import sys
import json
import os
from pathlib import Path
from datetime import date, timedelta
import calendar

# Load .env
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

import tiny_bi


def run(start: str, end: str) -> None:
    tiny_bi.ensure_database()
    print(f"Sincronizando GA4: {start} → {end} ...")
    result = tiny_bi.sync_ga4_range(start, end)
    print(json.dumps(result, indent=2, ensure_ascii=False))


def parse_args() -> tuple[str, str]:
    args = sys.argv[1:]

    if not args:
        # Default: yesterday
        yesterday = date.today() - timedelta(days=1)
        d = yesterday.isoformat()
        return d, d

    if len(args) == 1 and len(args[0]) == 7 and "-" in args[0]:
        # Month shorthand: "2026-03"
        year, month = map(int, args[0].split("-"))
        last_day = calendar.monthrange(year, month)[1]
        return f"{year}-{month:02d}-01", f"{year}-{month:02d}-{last_day:02d}"

    if len(args) == 2:
        return args[0], args[1]

    print(__doc__)
    sys.exit(1)


if __name__ == "__main__":
    start, end = parse_args()
    run(start, end)
