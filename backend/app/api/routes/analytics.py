import csv
import io
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.api.dependencies import get_analytics_filters, get_analytics_service, require_technical_identity
from app.services.demo_sessions import DemoIdentity
from app.schemas.analytics import AnalyticsFilters, DataQualityResponse
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


@router.get("/data-quality")
def data_quality(
    filters: Annotated[AnalyticsFilters, Depends(get_analytics_filters)],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    _: Annotated[DemoIdentity, Depends(require_technical_identity)],
) -> DataQualityResponse:
    return service.data_quality(filters)


@router.get("/export.csv")
def export_csv(
    filters: Annotated[AnalyticsFilters, Depends(get_analytics_filters)],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> Response:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=service.export_fieldnames())
    writer.writeheader()
    for row in service.export_orders(filters):
        writer.writerow({key: service.csv_safe_value(value) for key, value in row.items()})
    return Response(
        content="\ufeff" + output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="dataclyra-orders.csv"'},
    )


@router.get("/assistant")
def assistant(
    question: Annotated[str, Query(min_length=1, max_length=500)],
    filters: Annotated[AnalyticsFilters, Depends(get_analytics_filters)],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> dict[str, Any]:
    return service.assistant_answer(question, filters)


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
