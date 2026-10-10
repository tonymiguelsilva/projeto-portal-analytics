import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.api.dependencies import get_data_source
from app.core.config import Settings
from app.main import app
from app.services.data_source import DataSource
from app.services.demo_data_source import DemoDataSource
from asgi_client import asgi_get


class StaticDataSource(DataSource):
    def __init__(self, rows: object) -> None:
        self.rows = rows

    def load(self, resource_name: str) -> object:
        return self.rows


class AnalyticsApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.settings_patch = patch("app.main.get_settings", return_value=Settings())
        self.settings_patch.start()
        self.lifespan_context = app.router.lifespan_context(app)
        await self.lifespan_context.__aenter__()

    async def asyncTearDown(self) -> None:
        app.dependency_overrides.clear()
        await self.lifespan_context.__aexit__(None, None, None)
        self.settings_patch.stop()

    async def test_overview_and_filters_use_demo_dataset(self) -> None:
        status, overview = await asgi_get(app, "/api/v1/analytics/overview")
        filter_status, options = await asgi_get(app, "/api/v1/analytics/filters")

        self.assertEqual(status, 200)
        self.assertEqual(overview["metrics"]["total_order_count"], 36)
        self.assertEqual(filter_status, 200)
        self.assertIn("Sudeste", options["regions"])

    async def test_trends_sales_and_operations_accept_filters(self) -> None:
        query = {"start_date": "2026-01-01", "end_date": "2026-03-31"}
        trend_status, trends = await asgi_get(
            app, "/api/v1/analytics/trends", query
        )
        sales_status, sales = await asgi_get(
            app,
            "/api/v1/analytics/sales",
            {**query, "dimension": "region", "region": "Norte"},
        )
        operations_status, operations = await asgi_get(
            app, "/api/v1/analytics/operations", query
        )

        self.assertEqual(trend_status, 200)
        self.assertEqual(len(trends["items"]), 3)
        self.assertEqual(sales_status, 200)
        self.assertEqual([item["value"] for item in sales["items"]], ["Norte"])
        self.assertEqual(operations_status, 200)
        self.assertIn("cancellation_rate_pct", operations["metrics"])

    async def test_date_range_validation_returns_422(self) -> None:
        status, payload = await asgi_get(
            app,
            "/api/v1/analytics/overview",
            {"start_date": "2026-03-01", "end_date": "2026-02-01"},
        )

        self.assertEqual(status, 422)
        self.assertEqual(payload["detail"]["code"], "invalid_date_range")

    async def test_missing_demo_data_returns_consistent_503(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            app.dependency_overrides[get_data_source] = lambda: DemoDataSource(
                Path(temporary_directory)
            )
            status, payload = await asgi_get(app, "/api/v1/analytics/overview")

        self.assertEqual(status, 503)
        self.assertEqual(payload["detail"]["code"], "analytics_data_unavailable")

    async def test_invalid_demo_data_returns_consistent_500(self) -> None:
        app.dependency_overrides[get_data_source] = lambda: StaticDataSource(
            [{"order_id": "incomplete"}]
        )
        status, payload = await asgi_get(app, "/api/v1/analytics/overview")

        self.assertEqual(status, 500)
        self.assertEqual(payload["detail"]["code"], "analytics_data_invalid")

    async def test_order_detail_returns_404_for_unknown_id(self) -> None:
        status, payload = await asgi_get(
            app, "/api/v1/analytics/orders/not-a-real-order"
        )

        self.assertEqual(status, 404)
        self.assertEqual(payload["detail"]["code"], "order_not_found")


if __name__ == "__main__":
    unittest.main()