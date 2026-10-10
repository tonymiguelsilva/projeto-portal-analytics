from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.services.data_source import DataSource, create_data_source


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    application.state.data_source = create_data_source(get_settings())
    yield


def get_data_source(request: Request) -> DataSource:
    return request.app.state.data_source


app = FastAPI(
    title="Portal Web Analítico API",
    description="API para o Portal Web Analítico com modo demo e integração opcional com BigQuery",
    version="0.1.0",
    lifespan=lifespan,
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