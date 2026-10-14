import os
from pathlib import Path

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.dependencies import get_data_source
from app.api.routes.analytics import router as analytics_router
from app.api.routes.demo_auth import router as demo_auth_router
from app.api.routes.system import router as system_router
from app.core.config import get_settings
from app.services.analytics_service import (
    AnalyticsDataInvalidError,
    AnalyticsDataUnavailableError,
    RegionScopeConflictError,
)
from app.services.data_source import create_data_source
from app.services.demo_sessions import DemoSessionStore

FRONTEND_DIST = (
    Path(__file__).resolve().parents[2] / "frontend" / "dist"
)

@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    application.state.data_source = create_data_source(get_settings())
    application.state.demo_sessions = DemoSessionStore()
    yield


app = FastAPI(
    title="Portal Web Analítico API",
    description="API para o Portal Web Analítico com modo demo e integração opcional com BigQuery",
    version="0.1.0",
    lifespan=lifespan,
)
app.include_router(analytics_router)
app.include_router(demo_auth_router)
app.include_router(system_router)


@app.exception_handler(AnalyticsDataUnavailableError)
async def analytics_data_unavailable_handler(
    request: Request, error: AnalyticsDataUnavailableError
) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "detail": {
                "code": "analytics_data_unavailable",
                "message": "Os dados analíticos Demo não estão disponíveis.",
            }
        },
    )


@app.exception_handler(AnalyticsDataInvalidError)
async def analytics_data_invalid_handler(
    request: Request, error: AnalyticsDataInvalidError
) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "detail": {
                "code": "analytics_data_invalid",
                "message": "Os dados analíticos Demo estão inválidos.",
            }
        },
    )


@app.exception_handler(RegionScopeConflictError)
async def region_scope_conflict_handler(
    request: Request, error: RegionScopeConflictError
) -> JSONResponse:
    return JSONResponse(
        status_code=403,
        content={
            "detail": {
                "code": "region_scope_conflict",
                "message": "O perfil Demo não tem acesso à região solicitada.",
            }
        },
    )


@app.get("/health", tags=["health"])
async def health_check():
    """Endpoint de verificação de saúde da API"""
    return JSONResponse(
        status_code=200,
        content={"status": "ok", "message": "API está funcionando"}
    )



@app.get("/", tags=["root"])
async def root():
    """Entrega o portal em produção e informações da API localmente."""
    index_file = FRONTEND_DIST / "index.html"

    if (
        get_settings().environment == "prod"
        and index_file.is_file()
    ):
        return FileResponse(index_file)

    return JSONResponse(
        status_code=200,
        content={
            "message": "Portal Web Analítico API",
            "version": "0.1.0",
            "docs": "/docs",
            "health": "/health",
        },
    )


if (
    os.getenv("ENVIRONMENT", "dev").strip().lower() == "prod"
    and FRONTEND_DIST.is_dir()
):
    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_DIST, html=True),
        name="frontend",
    )
