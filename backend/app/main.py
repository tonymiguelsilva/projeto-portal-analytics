from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.dependencies import get_data_source
from app.api.routes.analytics import router as analytics_router
from app.core.config import get_settings
from app.services.analytics_service import (
    AnalyticsDataInvalidError,
    AnalyticsDataUnavailableError,
)
from app.services.data_source import create_data_source


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    application.state.data_source = create_data_source(get_settings())
    yield


app = FastAPI(
    title="Portal Web Analítico API",
    description="API para o Portal Web Analítico com modo demo e integração opcional com BigQuery",
    version="0.1.0",
    lifespan=lifespan,
)
app.include_router(analytics_router)


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

@app.get("/health", tags=["health"])
async def health_check():
    """Endpoint de verificação de saúde da API"""
    return JSONResponse(
        status_code=200,
        content={"status": "ok", "message": "API está funcionando"}
    )

@app.get("/", tags=["root"])
async def root():
    """Endpoint raiz com informações básicas"""
    return JSONResponse(
        status_code=200,
        content={
            "message": "Portal Web Analítico API",
            "version": "0.1.0",
            "docs": "/docs",
            "health": "/health"
        }
    )