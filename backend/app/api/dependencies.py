from datetime import date
from typing import Annotated

from fastapi import Depends, HTTPException, Query, Request

from app.schemas.analytics import AnalyticsFilters, OrderStatus
from app.services.analytics_service import AnalyticsService
from app.services.data_source import DataSource


def get_data_source(request: Request) -> DataSource:
    return request.app.state.data_source


def get_analytics_service(
    data_source: Annotated[DataSource, Depends(get_data_source)],
) -> AnalyticsService:
    return AnalyticsService(data_source)


def get_analytics_filters(
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
    return AnalyticsFilters(
        start_date=start_date,
        end_date=end_date,
        region=region,
        channel=channel,
        category=category,
        status=status,
    )