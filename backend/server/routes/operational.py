from __future__ import annotations
from fastapi import APIRouter, Depends
from server.deps import require_auth
import tiny_bi
import sqlite3

router = APIRouter()


@router.get("/operational")
async def get_operational(_: str = Depends(require_auth)):
    conn = tiny_bi._db_connect()
    try:
        return tiny_bi._operational_snapshot(conn)
    finally:
        conn.close()
