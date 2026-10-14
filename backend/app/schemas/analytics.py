from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


OrderStatus = Literal["delivered", "shipped", "pending", "cancelled"]


class OrderRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    order_id: str = Field(min_length=1)
    order_date: date
    region: str = Field(min_length=1)
    sales_channel: str = Field(min_length=1)
    product_category: str = Field(min_length=1)
    customer_segment: str = Field(min_length=1)
    units: int = Field(gt=0)
    gross_revenue: Decimal = Field(ge=Decimal("0"))
    discount_amount: Decimal = Field(ge=Decimal("0"))
    cost_amount: Decimal = Field(ge=Decimal("0"))
    status: OrderStatus
    promised_delivery_date: date
    shipped_at: date | None = None
    delivered_at: date | None = None

    @field_validator("shipped_at", "delivered_at", mode="before")
    @classmethod
    def empty_date_is_none(cls, value: object) -> object:
        return None if value == "" else value

    @model_validator(mode="after")
    def validate_business_rules(self) -> "OrderRecord":
        if self.discount_amount > self.gross_revenue:
            raise ValueError("discount_amount não pode superar gross_revenue")
        if self.promised_delivery_date < self.order_date:
            raise ValueError("promised_delivery_date não pode preceder order_date")

        if self.status == "delivered":
            if self.shipped_at is None or self.delivered_at is None:
                raise ValueError("Pedidos entregues exigem shipped_at e delivered_at")
        elif self.status == "shipped":
            if self.shipped_at is None or self.delivered_at is not None:
                raise ValueError("Pedidos enviados exigem shipped_at e não têm delivered_at")
        elif self.shipped_at is not None or self.delivered_at is not None:
            raise ValueError("Pedidos pendentes ou cancelados não têm datas de envio")

        if self.shipped_at is not None and self.shipped_at < self.order_date:
            raise ValueError("shipped_at não pode preceder order_date")
        if self.delivered_at is not None:
            if self.shipped_at is None or self.delivered_at < self.shipped_at:
                raise ValueError("delivered_at não pode preceder shipped_at")

        return self

    @property
    def net_revenue(self) -> Decimal:
        return self.gross_revenue - self.discount_amount


class AnalyticsFilters(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    region: str | None = None
    channel: str | None = None
    category: str | None = None
    status: OrderStatus | None = None

    @model_validator(mode="after")
    def validate_date_range(self) -> "AnalyticsFilters":
        if (
            self.start_date is not None
            and self.end_date is not None
            and self.start_date > self.end_date
        ):
            raise ValueError("start_date deve ser anterior ou igual a end_date")
        return self


class AnalyticsPeriodResponse(BaseModel):
    start_date: str | None
    end_date: str | None


class QualityRuleResponse(BaseModel):
    valid_record_count: int
    invalid_record_count: int
    valid_pct: float | None


class RequiredFieldsQualityResponse(BaseModel):
    field_count: int
    values_populated: int
    values_expected: int
    completeness_pct: float | None


class StatusDistributionResponse(BaseModel):
    status: OrderStatus
    record_count: int
    percentage: float | None


class DataQualityResponse(BaseModel):
    period: AnalyticsPeriodResponse
    records_evaluated: int
    duplicate_order_ids: int
    duplicate_order_id_pct: float | None
    required_fields: RequiredFieldsQualityResponse
    units: QualityRuleResponse
    monetary_values: QualityRuleResponse
    temporal_consistency: QualityRuleResponse
    status_distribution: list[StatusDistributionResponse]
