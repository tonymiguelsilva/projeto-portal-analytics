from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(
    title="Portal Web Analítico API",
    description="API para o Portal Web Analítico com modo demo e integração opcional com BigQuery",
    version="0.1.0"
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