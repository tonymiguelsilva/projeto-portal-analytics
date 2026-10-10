from datetime import date
from typing import Annotated

from fastapi import Depends, HTTPException, Query, Request

from app.api.demo_security import get_demo_identity
from app.schemas.analytics import AnalyticsFilters, OrderStatus
from app.services.analytics_service import AnalyticsService
from app.services.data_source import DataSource
from app.services.demo_sessions import DemoIdentity


def get_data_source(request: Request) -> DataSource:
    return request.app.state.data_source


def get_analytics_service(
    data_source: Annotated[DataSource, Depends(get_data_source)],
    identity: Annotated[DemoIdentity, Depends(get_demo_identity)],
) -> AnalyticsService:
    return AnalyticsService(data_source, allowed_regions=identity.allowed_regions)


def get_analytics_filters(
    identity: Annotated[DemoIdentity, Depends(get_demo_identity)],
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    region: str | None = Query(default=None),
    channel: str | None = Query(default=None),
    category: str | None = Query(default=None),
    status: OrderStatus | None = Query(default=None),
) -> AnalyticsFilters:
    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "invalid_date_range",
                "message": "start_date deve ser anterior ou igual a end_date.",
            },
        )
    if identity.allowed_regions is not None:
        if region is not None and region not in identity.allowed_regions:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "region_scope_conflict",
                    "message": "O perfil Demo não tem acesso à região solicitada.",
                },
            )
        if region is None and len(identity.allowed_regions) == 1:
            region = identity.allowed_regions[0]
    return AnalyticsFilters(
        start_date=start_date,
        end_date=end_date,
        region=region,
        channel=channel,
        category=category,
        status=status,
    )