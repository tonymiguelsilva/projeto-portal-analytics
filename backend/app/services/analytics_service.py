from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from pydantic import ValidationError

from app.schemas.analytics import AnalyticsFilters, OrderRecord
from app.services.data_source import DataSource


DATA_RESOURCE = "orders.csv"
ZERO = Decimal("0")
MONEY_QUANTUM = Decimal("0.01")
PERCENT_QUANTUM = Decimal("0.01")


class AnalyticsDataUnavailableError(Exception):
    pass


class AnalyticsDataInvalidError(Exception):
    pass


class AnalyticsService:
    def __init__(self, data_source: DataSource) -> None:
        self.data_source = data_source

    def load_orders(self) -> list[OrderRecord]:
        try:
            raw_orders = self.data_source.load(DATA_RESOURCE)
        except FileNotFoundError as error:
            raise AnalyticsDataUnavailableError from error
        except (OSError, ValueError) as error:
            raise AnalyticsDataInvalidError from error

        if not isinstance(raw_orders, list) or not raw_orders or any(
            not isinstance(raw_order, dict) for raw_order in raw_orders
        ):
            raise AnalyticsDataInvalidError

        try:
            orders = [OrderRecord.model_validate(raw_order) for raw_order in raw_orders]
        except ValidationError as error:
            raise AnalyticsDataInvalidError from error

        order_ids = [order.order_id for order in orders]
        if len(order_ids) != len(set(order_ids)):
            raise AnalyticsDataInvalidError
        return orders

    @staticmethod
    def _period_bounds(
        orders: list[OrderRecord], filters: AnalyticsFilters
    ) -> tuple[date | None, date | None]:
        dates = [order.order_date for order in orders]
        start_date = filters.start_date or (min(dates) if dates else None)
        end_date = filters.end_date or (max(dates) if dates else None)
        return start_date, end_date

    @staticmethod
    def _select_orders(
        orders: list[OrderRecord],
        filters: AnalyticsFilters,
        start_date: date | None,
        end_date: date | None,
    ) -> list[OrderRecord]:
        selected = orders
        if start_date is not None:
            selected = [order for order in selected if order.order_date >= start_date]
        if end_date is not None:
            selected = [order for order in selected if order.order_date <= end_date]
        if filters.region is not None:
            selected = [order for order in selected if order.region == filters.region]
        if filters.channel is not None:
            selected = [
                order for order in selected if order.sales_channel == filters.channel
            ]
        if filters.category is not None:
            selected = [
                order
                for order in selected
                if order.product_category == filters.category
            ]
        if filters.status is not None:
            selected = [order for order in selected if order.status == filters.status]
        return selected

    @staticmethod
    def _percentage(numerator: int | Decimal, denominator: int | Decimal) -> Decimal | None:
        if denominator == 0:
            return None
        return (Decimal(numerator) / Decimal(denominator) * Decimal("100")).quantize(
            PERCENT_QUANTUM, rounding=ROUND_HALF_UP
        )

    @classmethod
    def _metrics(cls, orders: list[OrderRecord]) -> dict[str, Any]:
        valid_orders = [order for order in orders if order.status != "cancelled"]
        delivered_orders = [order for order in orders if order.status == "delivered"]
        on_time_orders = [
            order
            for order in delivered_orders
            if order.delivered_at is not None
            and order.delivered_at <= order.promised_delivery_date
        ]
        net_revenue = sum((order.net_revenue for order in valid_orders), ZERO)
        gross_profit = sum(
            (order.net_revenue - order.cost_amount for order in valid_orders), ZERO
        )
        valid_count = len(valid_orders)
        delivery_days = [
            (order.delivered_at - order.order_date).days
            for order in delivered_orders
            if order.delivered_at is not None
        ]

        return {
            "total_order_count": len(orders),
            "valid_order_count": valid_count,
            "cancelled_order_count": sum(
                order.status == "cancelled" for order in orders
            ),
            "units_sold": sum(order.units for order in valid_orders),
            "net_revenue": net_revenue,
            "average_ticket": (
                (net_revenue / valid_count).quantize(
                    MONEY_QUANTUM, rounding=ROUND_HALF_UP
                )
                if valid_count
                else None
            ),
            "gross_profit": gross_profit,
            "gross_margin_pct": cls._percentage(gross_profit, net_revenue),
            "cancellation_rate_pct": cls._percentage(
                len(orders) - valid_count, len(orders)
            ),
            "on_time_delivery_rate_pct": cls._percentage(
                len(on_time_orders), len(delivered_orders)
            ),
            "average_delivery_days": (
                (Decimal(sum(delivery_days)) / len(delivery_days)).quantize(
                    PERCENT_QUANTUM, rounding=ROUND_HALF_UP
                )
                if delivery_days
                else None
            ),
            "open_order_count": sum(
                order.status in {"pending", "shipped"} for order in orders
            ),
        }

    @staticmethod
    def _variation_pct(current: Decimal | int, previous: Decimal | int) -> Decimal | None:
        if previous == 0:
            return None
        return (
            (Decimal(current) - Decimal(previous))
            / Decimal(previous)
            * Decimal("100")
        ).quantize(PERCENT_QUANTUM, rounding=ROUND_HALF_UP)

    @staticmethod
    def _period_payload(
        start_date: date | None, end_date: date | None
    ) -> dict[str, str | None]:
        return {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
        }

    def overview(self, filters: AnalyticsFilters) -> dict[str, Any]:
        orders = self.load_orders()
        start_date, end_date = self._period_bounds(orders, filters)
        current_orders = self._select_orders(orders, filters, start_date, end_date)
        current_metrics = self._metrics(current_orders)

        previous_orders: list[OrderRecord] = []
        if start_date is not None and end_date is not None:
            period_days = (end_date - start_date).days + 1
            previous_end = start_date - timedelta(days=1)
            previous_start = previous_end - timedelta(days=period_days - 1)
            previous_orders = self._select_orders(
                orders, filters, previous_start, previous_end
            )
        previous_metrics = self._metrics(previous_orders)

        return {
            "period": self._period_payload(start_date, end_date),
            "metrics": current_metrics,
            "variation_pct": {
                key: self._variation_pct(current_metrics[key], previous_metrics[key])
                for key in ("net_revenue", "valid_order_count", "gross_profit")
            },
        }

    def trends(self, filters: AnalyticsFilters) -> dict[str, Any]:
        orders = self.load_orders()
        start_date, end_date = self._period_bounds(orders, filters)
        selected = self._select_orders(orders, filters, start_date, end_date)
        monthly_orders: dict[str, list[OrderRecord]] = {}
        for order in selected:
            month = order.order_date.strftime("%Y-%m")
            monthly_orders.setdefault(month, []).append(order)

        months: list[dict[str, Any]] = []
        if start_date is not None and end_date is not None:
            year, month = start_date.year, start_date.month
            final_month = (end_date.year, end_date.month)
            while (year, month) <= final_month:
                key = f"{year:04d}-{month:02d}"
                months.append({"month": key, **self._metrics(monthly_orders.get(key, []))})
                if month == 12:
                    year, month = year + 1, 1
                else:
                    month += 1

        return {"period": self._period_payload(start_date, end_date), "items": months}

    def sales(self, filters: AnalyticsFilters, dimension: str) -> dict[str, Any]:
        dimension_fields = {
            "region": "region",
            "channel": "sales_channel",
            "category": "product_category",
        }
        if dimension not in dimension_fields:
            raise ValueError("dimension deve ser region, channel ou category")

        orders = self.load_orders()
        start_date, end_date = self._period_bounds(orders, filters)
        selected = self._select_orders(orders, filters, start_date, end_date)
        field = dimension_fields[dimension]
        groups: dict[str, list[OrderRecord]] = {}
        for order in selected:
            groups.setdefault(getattr(order, field), []).append(order)

        return {
            "period": self._period_payload(start_date, end_date),
            "dimension": dimension,
            "items": [
                {"value": value, **self._metrics(group_orders)}
                for value, group_orders in sorted(groups.items())
            ],
        }

    def operations(self, filters: AnalyticsFilters) -> dict[str, Any]:
        orders = self.load_orders()
        start_date, end_date = self._period_bounds(orders, filters)
        selected = self._select_orders(orders, filters, start_date, end_date)
        metrics = self._metrics(selected)
        return {
            "period": self._period_payload(start_date, end_date),
            "metrics": {
                "total_order_count": metrics["total_order_count"],
                "cancelled_order_count": metrics["cancelled_order_count"],
                "cancellation_rate_pct": metrics["cancellation_rate_pct"],
                "delivered_order_count": sum(
                    order.status == "delivered" for order in selected
                ),
                "on_time_delivery_rate_pct": metrics["on_time_delivery_rate_pct"],
                "average_delivery_days": metrics["average_delivery_days"],
                "open_order_count": metrics["open_order_count"],
            },
        }

    def filter_options(self) -> dict[str, Any]:
        orders = self.load_orders()
        start_date, end_date = self._period_bounds(orders, AnalyticsFilters())
        return {
            "period": self._period_payload(start_date, end_date),
            "regions": sorted({order.region for order in orders}),
            "channels": sorted({order.sales_channel for order in orders}),
            "categories": sorted({order.product_category for order in orders}),
            "statuses": sorted({order.status for order in orders}),
        }

    def order_detail(self, order_id: str) -> dict[str, Any] | None:
        for order in self.load_orders():
            if order.order_id == order_id:
                result = order.model_dump()
                result["net_revenue"] = order.net_revenue
                result["gross_profit"] = order.net_revenue - order.cost_amount
                return result
        return None