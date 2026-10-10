import unittest
from datetime import date
from decimal import Decimal

from app.schemas.analytics import AnalyticsFilters, OrderRecord
from app.services.analytics_service import (
    AnalyticsDataInvalidError,
    AnalyticsDataUnavailableError,
    AnalyticsService,
    RegionScopeConflictError,
)
from app.services.data_source import DataSource


def make_order(
    order_id: str,
    order_date: date,
    status: str,
    gross: str,
    discount: str,
    cost: str,
    category: str = "Equipamentos",
    promised: date | None = None,
    delivered: date | None = None,
) -> OrderRecord:
    shipped_at = (
        date.fromordinal(order_date.toordinal() + 1)
        if status in {"shipped", "delivered"}
        else None
    )
    return OrderRecord.model_validate(
        {
            "order_id": order_id,
            "order_date": order_date,
            "region": "Sudeste",
            "sales_channel": "online",
            "product_category": category,
            "customer_segment": "PME",
            "units": 2,
            "gross_revenue": Decimal(gross),
            "discount_amount": Decimal(discount),
            "cost_amount": Decimal(cost),
            "status": status,
            "promised_delivery_date": promised or date.fromordinal(order_date.toordinal() + 5),
            "shipped_at": shipped_at,
            "delivered_at": delivered,
        }
    )


class MemoryDataSource(DataSource):
    def __init__(self, rows: object) -> None:
        self.rows = rows

    def load(self, resource_name: str) -> object:
        return self.rows


class AnalyticsServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.orders = [
            make_order(
                "A-1",
                date(2026, 1, 10),
                "delivered",
                "100.00",
                "10.00",
                "60.00",
                promised=date(2026, 1, 15),
                delivered=date(2026, 1, 13),
            ),
            make_order(
                "A-2",
                date(2026, 1, 11),
                "pending",
                "50.00",
                "0.00",
                "30.00",
            ),
            make_order(
                "A-3",
                date(2026, 1, 11),
                "cancelled",
                "999.00",
                "0.00",
                "1.00",
                category="Casa",
            ),
        ]
        self.service = AnalyticsService(
            MemoryDataSource([order.model_dump(mode="json") for order in self.orders])
        )

    def test_financial_kpis_exclude_cancelled_orders(self) -> None:
        result = self.service.overview(
            AnalyticsFilters(start_date=date(2026, 1, 10), end_date=date(2026, 1, 11))
        )
        metrics = result["metrics"]

        self.assertEqual(metrics["net_revenue"], Decimal("140.00"))
        self.assertEqual(metrics["valid_order_count"], 2)
        self.assertEqual(metrics["average_ticket"], Decimal("70.00"))
        self.assertEqual(metrics["gross_profit"], Decimal("50.00"))
        self.assertEqual(metrics["gross_margin_pct"], Decimal("35.71"))
        self.assertEqual(metrics["units_sold"], 4)

    def test_operational_rate_denominators_are_explicit(self) -> None:
        metrics = self.service.operations(AnalyticsFilters())["metrics"]

        self.assertEqual(metrics["cancellation_rate_pct"], Decimal("33.33"))
        self.assertEqual(metrics["delivered_order_count"], 1)
        self.assertEqual(metrics["on_time_delivery_rate_pct"], Decimal("100.00"))
        self.assertEqual(metrics["average_delivery_days"], Decimal("3"))
        self.assertEqual(metrics["open_order_count"], 1)

    def test_variation_is_null_when_previous_period_has_no_base(self) -> None:
        result = self.service.overview(
            AnalyticsFilters(start_date=date(2026, 1, 10), end_date=date(2026, 1, 11))
        )

        self.assertEqual(
            result["variation_pct"],
            {"net_revenue": None, "valid_order_count": None, "gross_profit": None},
        )

    def test_variation_uses_equal_length_previous_period(self) -> None:
        previous_order_end = make_order(
            "PREVIOUS-END",
            date(2026, 1, 9),
            "delivered",
            "100.00",
            "0.00",
            "80.00",
            promised=date(2026, 1, 14),
            delivered=date(2026, 1, 12),
        )
        previous_order_start = make_order(
            "PREVIOUS-START",
            date(2026, 1, 8),
            "delivered",
            "100.00",
            "0.00",
            "80.00",
            promised=date(2026, 1, 13),
            delivered=date(2026, 1, 11),
        )
        service = AnalyticsService(
            MemoryDataSource(
                [
                    order.model_dump(mode="json")
                    for order in [
                        *self.orders,
                        previous_order_end,
                        previous_order_start,
                    ]
                ]
            )
        )
        result = service.overview(
            AnalyticsFilters(start_date=date(2026, 1, 10), end_date=date(2026, 1, 11))
        )

        self.assertEqual(
            result["variation_pct"],
            {
                "net_revenue": Decimal("-30.00"),
                "valid_order_count": Decimal("0.00"),
                "gross_profit": Decimal("25.00"),
            },
        )

    def test_variation_applies_dimension_filters_to_previous_period(self) -> None:
        excluded_by_region = make_order(
            "OTHER-REGION",
            date(2026, 1, 9),
            "delivered",
            "9000.00",
            "0.00",
            "0.00",
            promised=date(2026, 1, 14),
            delivered=date(2026, 1, 11),
        ).model_dump(mode="json")
        excluded_by_region["region"] = "Norte"

        excluded_by_channel = make_order(
            "OTHER-CHANNEL",
            date(2026, 1, 9),
            "delivered",
            "9000.00",
            "0.00",
            "0.00",
            promised=date(2026, 1, 14),
            delivered=date(2026, 1, 11),
        ).model_dump(mode="json")
        excluded_by_channel["sales_channel"] = "loja"

        excluded_by_category = make_order(
            "OTHER-CATEGORY",
            date(2026, 1, 9),
            "delivered",
            "9000.00",
            "0.00",
            "0.00",
            category="Casa",
            promised=date(2026, 1, 14),
            delivered=date(2026, 1, 11),
        ).model_dump(mode="json")

        service = AnalyticsService(
            MemoryDataSource(
                [
                    *[order.model_dump(mode="json") for order in self.orders],
                    excluded_by_region,
                    excluded_by_channel,
                    excluded_by_category,
                ]
            )
        )
        result = service.overview(
            AnalyticsFilters(
                start_date=date(2026, 1, 10),
                end_date=date(2026, 1, 11),
                region="Sudeste",
                channel="online",
                category="Equipamentos",
            )
        )

        self.assertEqual(
            result["variation_pct"],
            {"net_revenue": None, "valid_order_count": None, "gross_profit": None},
        )

    def test_filters_and_sales_grouping(self) -> None:
        result = self.service.sales(AnalyticsFilters(category="Casa"), "category")

        self.assertEqual(len(result["items"]), 1)
        self.assertEqual(result["items"][0]["value"], "Casa")
        self.assertEqual(result["items"][0]["net_revenue"], Decimal("0"))
        self.assertEqual(result["items"][0]["valid_order_count"], 0)

    def test_trends_include_empty_months_in_requested_range(self) -> None:
        result = self.service.trends(
            AnalyticsFilters(start_date=date(2026, 1, 1), end_date=date(2026, 3, 31))
        )

        self.assertEqual(
            [item["month"] for item in result["items"]],
            ["2026-01", "2026-02", "2026-03"],
        )
        self.assertEqual(result["items"][1]["total_order_count"], 0)

    def test_missing_and_invalid_data_have_distinct_errors(self) -> None:
        with self.assertRaises(AnalyticsDataUnavailableError):
            AnalyticsService(MemoryDataSourceMissing()).load_orders()
        with self.assertRaises(AnalyticsDataInvalidError):
            AnalyticsService(MemoryDataSource([])).load_orders()
        duplicate = self.orders[0].model_dump(mode="json")
        with self.assertRaises(AnalyticsDataInvalidError):
            AnalyticsService(MemoryDataSource([duplicate, duplicate])).load_orders()

    def test_regional_scope_applies_to_all_queries_and_detail(self) -> None:
        southern_order = self.orders[0].model_dump(mode="json")
        southern_order["order_id"] = "SOUTH-1"
        southern_order["region"] = "Sul"
        service = AnalyticsService(
            MemoryDataSource(
                [
                    *[order.model_dump(mode="json") for order in self.orders],
                    southern_order,
                ]
            ),
            allowed_regions=("Sul",),
        )

        overview = service.overview(AnalyticsFilters())
        trends = service.trends(AnalyticsFilters())
        sales = service.sales(AnalyticsFilters(), "region")
        operations = service.operations(AnalyticsFilters())
        filter_options = service.filter_options()

        self.assertEqual(overview["metrics"]["total_order_count"], 1)
        self.assertEqual(sum(item["total_order_count"] for item in trends["items"]), 1)
        self.assertEqual([item["value"] for item in sales["items"]], ["Sul"])
        self.assertEqual(operations["metrics"]["total_order_count"], 1)
        self.assertEqual(filter_options["regions"], ["Sul"])
        self.assertIsNotNone(service.order_detail("SOUTH-1"))
        self.assertIsNone(service.order_detail("A-1"))

        with self.assertRaises(RegionScopeConflictError):
            service.overview(AnalyticsFilters(region="Sudeste"))


class MemoryDataSourceMissing(DataSource):
    def load(self, resource_name: str) -> object:
        raise FileNotFoundError(resource_name)


if __name__ == "__main__":
    unittest.main()