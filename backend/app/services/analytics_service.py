from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from pydantic import ValidationError

from app.schemas.analytics import AnalyticsFilters, OrderRecord
from app.services.data_source import DataSource


DATA_RESOURCE = "orders.csv"
ZERO = Decimal("0")
MONEY_QUANTUM = Decimal("0.01")
PERCENT_QUANTUM = Decimal("0.01")
REQUIRED_ORDER_FIELDS = (
    "order_id",
    "order_date",
    "region",
    "sales_channel",
    "product_category",
    "customer_segment",
    "units",
    "gross_revenue",
    "discount_amount",
    "cost_amount",
    "status",
    "promised_delivery_date",
)


class AnalyticsDataUnavailableError(Exception):
    pass


class AnalyticsDataInvalidError(Exception):
    pass


class RegionScopeConflictError(Exception):
    pass


class AnalyticsService:
    def __init__(
        self,
        data_source: DataSource,
        allowed_regions: tuple[str, ...] | None = None,
    ) -> None:
        self.data_source = data_source
        self.allowed_regions = allowed_regions

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

    def _prepare_orders(
        self, orders: list[OrderRecord], filters: AnalyticsFilters
    ) -> tuple[list[OrderRecord], date | None, date | None]:
        if self.allowed_regions is None:
            scoped_orders = orders
        else:
            if filters.region is not None and filters.region not in self.allowed_regions:
                raise RegionScopeConflictError
            scoped_orders = [
                order for order in orders if order.region in self.allowed_regions
            ]

        start_date, end_date = self._period_bounds(scoped_orders, filters)
        return scoped_orders, start_date, end_date

    @staticmethod
    def _order_view(order: OrderRecord) -> dict[str, Any]:
        result = order.model_dump()
        result["net_revenue"] = order.net_revenue
        result["gross_profit"] = order.net_revenue - order.cost_amount
        return result

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
        scoped_orders, start_date, end_date = self._prepare_orders(orders, filters)
        current_orders = self._select_orders(
            scoped_orders, filters, start_date, end_date
        )
        current_metrics = self._metrics(current_orders)

        previous_orders: list[OrderRecord] = []
        if start_date is not None and end_date is not None:
            period_days = (end_date - start_date).days + 1
            previous_end = start_date - timedelta(days=1)
            previous_start = previous_end - timedelta(days=period_days - 1)
            previous_orders = self._select_orders(
                scoped_orders, filters, previous_start, previous_end
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
        scoped_orders, start_date, end_date = self._prepare_orders(orders, filters)
        selected = self._select_orders(
            scoped_orders, filters, start_date, end_date
        )
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
        scoped_orders, start_date, end_date = self._prepare_orders(orders, filters)
        selected = self._select_orders(
            scoped_orders, filters, start_date, end_date
        )
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
        scoped_orders, start_date, end_date = self._prepare_orders(orders, filters)
        selected = self._select_orders(
            scoped_orders, filters, start_date, end_date
        )
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

    def data_quality(self, filters: AnalyticsFilters) -> dict[str, Any]:
        """Reports rule-level quality results for the validated, authorized slice.

        Invalid, empty, unavailable or duplicate datasets are intentionally rejected by
        ``load_orders`` before this report is produced. Those conditions prevent an
        evaluation and remain distinct from record-level rule violations.
        """
        orders = self.load_orders()
        scoped_orders, start_date, end_date = self._prepare_orders(orders, filters)
        selected = self._select_orders(
            scoped_orders, filters, start_date, end_date
        )
        records_evaluated = len(selected)
        order_ids = [order.order_id for order in selected]
        duplicate_order_ids = len(order_ids) - len(set(order_ids))
        required_values_expected = records_evaluated * len(REQUIRED_ORDER_FIELDS)
        required_values_populated = sum(
            getattr(order, field) is not None
            for order in selected
            for field in REQUIRED_ORDER_FIELDS
        )
        valid_unit_records = sum(order.units > 0 for order in selected)
        valid_monetary_records = sum(
            order.gross_revenue >= ZERO
            and order.discount_amount >= ZERO
            and order.cost_amount >= ZERO
            and order.discount_amount <= order.gross_revenue
            for order in selected
        )
        valid_temporal_records = sum(
            order.promised_delivery_date >= order.order_date
            and (order.shipped_at is None or order.shipped_at >= order.order_date)
            and (
                order.delivered_at is None
                or (
                    order.shipped_at is not None
                    and order.delivered_at >= order.shipped_at
                )
            )
            and (
                (order.status == "delivered" and order.shipped_at is not None and order.delivered_at is not None)
                or (order.status == "shipped" and order.shipped_at is not None and order.delivered_at is None)
                or (order.status in {"pending", "cancelled"} and order.shipped_at is None and order.delivered_at is None)
            )
            for order in selected
        )
        status_distribution = [
            {
                "status": status,
                "record_count": sum(order.status == status for order in selected),
                "percentage": self._percentage(
                    sum(order.status == status for order in selected), records_evaluated
                ),
            }
            for status in ("delivered", "shipped", "pending", "cancelled")
        ]

        return {
            "period": self._period_payload(start_date, end_date),
            "records_evaluated": records_evaluated,
            "duplicate_order_ids": duplicate_order_ids,
            "duplicate_order_id_pct": self._percentage(
                duplicate_order_ids, records_evaluated
            ),
            "required_fields": {
                "field_count": len(REQUIRED_ORDER_FIELDS),
                "values_populated": required_values_populated,
                "values_expected": required_values_expected,
                "completeness_pct": self._percentage(
                    required_values_populated, required_values_expected
                ),
            },
            "units": {
                "valid_record_count": valid_unit_records,
                "invalid_record_count": records_evaluated - valid_unit_records,
                "valid_pct": self._percentage(valid_unit_records, records_evaluated),
            },
            "monetary_values": {
                "valid_record_count": valid_monetary_records,
                "invalid_record_count": records_evaluated - valid_monetary_records,
                "valid_pct": self._percentage(valid_monetary_records, records_evaluated),
            },
            "temporal_consistency": {
                "valid_record_count": valid_temporal_records,
                "invalid_record_count": records_evaluated - valid_temporal_records,
                "valid_pct": self._percentage(valid_temporal_records, records_evaluated),
            },
            "status_distribution": status_distribution,
        }

    def export_fieldnames(self) -> list[str]:
        return [
            "order_id", "order_date", "region", "sales_channel", "product_category",
            "customer_segment", "units", "gross_revenue", "discount_amount", "cost_amount",
            "status", "promised_delivery_date", "shipped_at", "delivered_at", "net_revenue", "gross_profit",
        ]

    @staticmethod
    def csv_safe_value(value: Any) -> Any:
        """Prevent spreadsheet formula evaluation while retaining the original value."""
        if isinstance(value, str) and value[:1] in ("=", "+", "-", "@"):
            return "'" + value
        return value

    def export_orders(self, filters: AnalyticsFilters) -> list[dict[str, Any]]:
        orders = self.load_orders()
        scoped, start_date, end_date = self._prepare_orders(orders, filters)
        return [self._order_view(order) for order in self._select_orders(scoped, filters, start_date, end_date)]

    def assistant_answer(self, question: str, filters: AnalyticsFilters) -> dict[str, Any]:
        """Deterministic demo assistant: intent matching only, never executes user input."""
        orders = self.load_orders()
        scoped, start_date, end_date = self._prepare_orders(orders, filters)
        selected = self._select_orders(scoped, filters, start_date, end_date)
        metrics = self._metrics(selected)
        normalized = question.casefold()
        period = self._period_payload(start_date, end_date)
        if not selected:
            return {"answer": "Não há dados para os filtros e escopo regional selecionados.", "period": period, "intent": "no_data"}
        if any(term in normalized for term in ("faturamento", "receita", "ticket", "lucro")):
            if "ticket" in normalized:
                answer = f"O ticket médio é {metrics['average_ticket']}. Métrica: receita líquida de pedidos não cancelados dividida pela quantidade de pedidos não cancelados."
                intent = "average_ticket"
            elif "lucro" in normalized:
                answer = f"O lucro bruto é {metrics['gross_profit']}. Métrica: receita líquida menos custo dos pedidos não cancelados."
                intent = "gross_profit"
            else:
                answer = f"O faturamento (receita líquida) é {metrics['net_revenue']}. Métrica: receita bruta menos desconto, excluindo pedidos cancelados."
                intent = "net_revenue"
        elif any(term in normalized for term in ("pedido", "pendente", "enviado", "entregue", "cancelado")):
            labels = {"pending": "pendentes", "shipped": "enviados", "delivered": "entregues", "cancelled": "cancelados"}
            requested = next((status for status, label in labels.items() if label[:-1] in normalized or label in normalized), None)
            count = sum(order.status == requested for order in selected) if requested else metrics["total_order_count"]
            answer = f"Há {count} pedido(s) {labels[requested] if requested else 'no recorte'}."
            intent = "order_status" if requested else "order_count"
        elif any(term in normalized for term in ("região", "regiao", "categoria", "produto", "evolução", "evolucao", "mensal", "variação", "variacao")):
            dimension = "region" if "regi" in normalized else "category"
            grouped = self.sales(filters, dimension)["items"]
            summary = ", ".join(f"{item['value']}: {item['net_revenue']}" for item in grouped)
            answer = f"Receita líquida por {'região' if dimension == 'region' else 'categoria'}: {summary}."
            intent = f"by_{dimension}"
        else:
            return {"answer": "Sou o assistente demonstrativo DataClyra AI. Posso responder sobre faturamento, pedidos, ticket médio, lucro, regiões, categorias e evolução mensal usando os filtros ativos.", "period": period, "intent": "unsupported"}
        return {"answer": answer, "period": period, "intent": intent}

    def system_status(self) -> dict[str, Any]:
        orders = self.load_orders()
        dates = [order.order_date for order in orders]
        source_path = getattr(self.data_source, "data_dir", None)
        file_path = source_path / DATA_RESOURCE if source_path is not None else None
        modified = datetime.fromtimestamp(file_path.stat().st_mtime, timezone.utc).isoformat() if file_path and file_path.is_file() else None
        return {"api_status": "ok", "data_source": type(self.data_source).__name__, "record_count": len(orders), "min_order_date": min(dates).isoformat(), "max_order_date": max(dates).isoformat(), "checked_at": datetime.now(timezone.utc).isoformat(), "source_modified_at": modified}

    def filter_options(self) -> dict[str, Any]:
        orders = self.load_orders()
        if self.allowed_regions is not None:
            orders = [order for order in orders if order.region in self.allowed_regions]
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
            if (
                order.order_id == order_id
                and (
                    self.allowed_regions is None
                    or order.region in self.allowed_regions
                )
            ):
                return self._order_view(order)
        return None
