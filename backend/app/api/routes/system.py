from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.api.dependencies import get_analytics_service, require_technical_identity
from app.services.analytics_service import AnalyticsService
from app.services.demo_sessions import DemoIdentity

router = APIRouter(prefix="/api/v1/system", tags=["system"])


@router.get("/status")
def status(
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    _: Annotated[DemoIdentity, Depends(require_technical_identity)],
) -> dict[str, Any]:
    return service.system_status()
