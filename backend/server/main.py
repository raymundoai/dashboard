from __future__ import annotations
import os
from pathlib import Path
# Load .env before ANY other import that reads os.getenv at module level
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env", override=False)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.routes import data, products, customers, funnel, sync, management, kpis, ga4, admin, operational
from server.auth import router as auth_router
from server.daily_sync import DailySyncScheduler
import tiny_bi

@asynccontextmanager
async def lifespan(app: FastAPI):
    import warnings
    if os.getenv("AUTH_SECRET", "change-me") == "change-me":
        warnings.warn("AUTH_SECRET is not set — using insecure default", stacklevel=1)
    tiny_bi.ensure_database()
    scheduler = DailySyncScheduler()
    scheduler.start()
    try:
        yield
    finally:
        await scheduler.stop()

app = FastAPI(title="Dash Final API", lifespan=lifespan)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth")
app.include_router(data.router,       prefix="/api")
app.include_router(products.router,   prefix="/api")
app.include_router(customers.router,  prefix="/api")
app.include_router(funnel.router,     prefix="/api")
app.include_router(management.router, prefix="/api")
app.include_router(kpis.router,       prefix="/api")
app.include_router(sync.router,       prefix="/api")
app.include_router(ga4.router,        prefix="/api")
app.include_router(admin.router,       prefix="/api")
app.include_router(operational.router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}

# Serve React SPA (production — static/ dir exists when built via Dockerfile)
_STATIC = Path(__file__).parent.parent / "static"
if _STATIC.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=str(_STATIC / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(_: str = ""):
        return FileResponse(str(_STATIC / "index.html"))
