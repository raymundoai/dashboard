from __future__ import annotations

import argparse
import json
from datetime import date, datetime
from pathlib import Path

from tiny_bi import (
    DEFAULT_BREW_HISTORY_FILE,
    DB_PATH,
    backfill_years,
    build_dataset,
    ensure_database,
    get_sync_status,
    import_brew_monthly_history_workbook,
    import_revenue_targets_workbook,
    list_sources,
    load_default_ecommerce_targets,
    sync_date_range,
    sync_incremental,
)


def _parse_date(value: str) -> date:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"Data invalida: {value}. Use YYYY-MM-DD") from exc


def _parse_years(value: str) -> list[int]:
    years = []
    for chunk in value.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" in chunk:
            start_str, end_str = chunk.split("-", 1)
            start = int(start_str)
            end = int(end_str)
            if end < start:
                raise argparse.ArgumentTypeError(f"Intervalo de anos invalido: {chunk}")
            years.extend(range(start, end + 1))
        else:
            years.append(int(chunk))
    if not years:
        raise argparse.ArgumentTypeError("Informe ao menos um ano")
    return sorted(set(years))


def _reset_db(preserve_backup: bool) -> dict[str, str]:
    db_path = Path(DB_PATH)
    backup_path = None

    if db_path.exists() and preserve_backup:
        checkpoints_dir = db_path.parent.parent / "checkpoints"
        checkpoints_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = checkpoints_dir / f"tiny_bi_before_reset_{stamp}.sqlite"
        db_path.replace(backup_path)
    elif db_path.exists():
        db_path.unlink()

    ensure_database()

    payload = {
        "status": "ok",
        "message": "Banco resetado e schema recriado",
        "dbPath": str(db_path),
    }
    if backup_path:
        payload["backupPath"] = str(backup_path)
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Gerenciador de BI local Tiny")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init-db", help="Cria/atualiza schema do banco local")

    reset_parser = subparsers.add_parser("reset-db", help="Zera o banco local e recria o schema")
    reset_parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Nao salva checkpoint antes de zerar",
    )

    sync_parser = subparsers.add_parser("sync", help="Sincroniza dados da API Tiny")
    sync_parser.add_argument("--source", default="all", help="Fonte (brew|grow|brewnh|brewpoa|bigb|grow_fisica|all)")
    sync_parser.add_argument(
        "--mode",
        default="incremental",
        choices=["incremental", "range", "backfill"],
        help="Modo de sincronizacao",
    )
    sync_parser.add_argument("--lookback-days", type=int, default=7, help="Janela para incremental")
    sync_parser.add_argument("--start", type=_parse_date, help="Data inicial para modo range (YYYY-MM-DD)")
    sync_parser.add_argument("--end", type=_parse_date, help="Data final para modo range (YYYY-MM-DD)")
    sync_parser.add_argument(
        "--years",
        type=_parse_years,
        help="Anos para backfill, ex: 2024,2025,2026 ou 2024-2026",
    )

    status_parser = subparsers.add_parser("status", help="Exibe status de sincronizacao")
    status_parser.add_argument("--source", default="all", help="Fonte para status")

    dataset_parser = subparsers.add_parser("dataset", help="Preview do payload /api/data")
    dataset_parser.add_argument("--source", default="brew")
    dataset_parser.add_argument("--start-year", type=int, default=2024)
    dataset_parser.add_argument("--end-year", type=int, default=date.today().year)

    subparsers.add_parser("sources", help="Lista fontes disponiveis")

    load_targets_parser = subparsers.add_parser(
        "load-ecom-targets",
        help="Importa metas/realizado dos e-commerces a partir das planilhas padrão",
    )
    load_targets_parser.add_argument(
        "--sheet",
        default="Metas_e_Realizado",
        help="Nome da aba da planilha (padrao: Metas_e_Realizado)",
    )

    load_targets_file_parser = subparsers.add_parser(
        "load-targets-file",
        help="Importa metas/realizado de um arquivo XLSX para uma fonte especifica",
    )
    load_targets_file_parser.add_argument("--source", required=True, choices=["brew", "grow"])
    load_targets_file_parser.add_argument("--file", required=True, type=Path)
    load_targets_file_parser.add_argument("--sheet", default="Metas_e_Realizado")

    load_brew_history_parser = subparsers.add_parser(
        "load-brew-history-file",
        help="Importa faturamento historico mensal do e-commerce Brew a partir da planilha horizontal",
    )
    load_brew_history_parser.add_argument("--file", type=Path, default=DEFAULT_BREW_HISTORY_FILE)
    load_brew_history_parser.add_argument("--start-year", type=int, default=2021)
    load_brew_history_parser.add_argument("--end-year", type=int, default=2024)

    args = parser.parse_args()

    if args.command == "init-db":
        ensure_database()
        print(json.dumps({"status": "ok", "message": "Banco inicializado"}, ensure_ascii=False, indent=2))
        return

    if args.command == "reset-db":
        result = _reset_db(preserve_backup=not args.no_backup)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    if args.command == "sync":
        ensure_database()
        if args.mode == "incremental":
            result = sync_incremental(source=args.source, lookback_days=args.lookback_days)
        elif args.mode == "range":
            if not args.start or not args.end:
                parser.error("Modo range exige --start e --end")
            result = sync_date_range(args.source, args.start, args.end)
        else:
            if not args.years:
                parser.error("Modo backfill exige --years")
            result = backfill_years(args.source, args.years)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    if args.command == "status":
        ensure_database()
        source = args.source if args.source != "all" else None
        result = get_sync_status(source)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    if args.command == "dataset":
        ensure_database()
        result = build_dataset(args.source, args.start_year, args.end_year)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    if args.command == "sources":
        print(json.dumps({"sources": list_sources()}, ensure_ascii=False, indent=2))
        return

    if args.command == "load-ecom-targets":
        ensure_database()
        result = load_default_ecommerce_targets(sheet_name=args.sheet)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    if args.command == "load-targets-file":
        ensure_database()
        result = import_revenue_targets_workbook(args.file, args.source, sheet_name=args.sheet)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    if args.command == "load-brew-history-file":
        ensure_database()
        result = import_brew_monthly_history_workbook(
            args.file,
            start_year=args.start_year,
            end_year=args.end_year,
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return


if __name__ == "__main__":
    main()
