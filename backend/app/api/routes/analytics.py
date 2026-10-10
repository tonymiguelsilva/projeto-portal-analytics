from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import get_analytics_filters, get_analytics_service
from app.schemas.analytics import AnalyticsFilters
from app.services.analytics_service import AnalyticsService


router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])
@router.get("/overview")
def overview(
    filters: Annotated[AnalyticsFilters, Depends(get_analytics_filters)],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> dict[str, Any]:
    return service.overview(filters)


@router.get("/trends")
def trends(
    filters: Annotated[AnalyticsFilters, Depends(get_analytics_filters)],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> dict[str, Any]:
    return service.trends(filters)


@router.get("/sales")
def sales(
    filters: Annotated[AnalyticsFilters, Depends(get_analytics_filters)],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    dimension: Literal["region", "channel", "category"] = Query(default="category"),
) -> dict[str, Any]:
    return service.sales(filters, dimension)


@router.get("/operations")
def operations(
    filters: Annotated[AnalyticsFilters, Depends(get_analytics_filters)],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> dict[str, Any]:
    return service.operations(filters)


@router.get("/filters")
def filter_options(
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> dict[str, Any]:
    return service.filter_options()


@router.get("/orders/{order_id}")
def order_detail(
    order_id: str,
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> dict[str, Any]:
    order = service.order_detail(order_id)
    if order is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "order_not_found", "message": "Pedido não encontrado."},
        )
    return order