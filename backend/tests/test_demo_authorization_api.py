import json
import unittest
from unittest.mock import patch

from app.core.config import Settings
from app.main import app
from asgi_client import asgi_get, asgi_request


class DemoAuthorizationApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.settings_patch = patch("app.main.get_settings", return_value=Settings())
        self.settings_patch.start()
        self.lifespan_context = app.router.lifespan_context(app)
        await self.lifespan_context.__aenter__()

    async def asyncTearDown(self) -> None:
        await self.lifespan_context.__aexit__(None, None, None)
        self.settings_patch.stop()

    async def start_session(self, profile_id: str) -> dict[str, str]:
        status, body, _ = await asgi_request(
            app,
            "POST",
            "/api/v1/demo-auth/session",
            json_body={"profile_id": profile_id},
        )
        self.assertEqual(status, 200)
        payload = json.loads(body)
        return {"X-Demo-Session": payload["session_id"]}

    async def test_all_analytics_endpoints_require_a_valid_session(self) -> None:
        endpoints = [
            ("/api/v1/analytics/overview", None),
            ("/api/v1/analytics/trends", None),
            ("/api/v1/analytics/sales", {"dimension": "region"}),
            ("/api/v1/analytics/operations", None),
            ("/api/v1/analytics/filters", None),
            ("/api/v1/analytics/orders/ORD-2025-10-001", None),
        ]

        for path, query in endpoints:
            with self.subTest(path=path):
                status, payload = await asgi_get(app, path, query)
                self.assertEqual(status, 401)
                self.assertEqual(payload["detail"]["code"], "demo_session_required")

        invalid_status, invalid = await asgi_get(
            app,
            "/api/v1/analytics/overview",
            headers={"X-Demo-Session": "invalid-session"},
        )
        self.assertEqual(invalid_status, 401)
        self.assertEqual(invalid["detail"]["code"], "demo_session_invalid")

    async def test_each_profile_is_limited_to_its_approved_region(self) -> None:
        regional_profiles = [
            ("analyst_south", "Sul"),
            ("manager_south", "Sul"),
            ("manager_southeast", "Sudeste"),
        ]

        for profile_id, region in regional_profiles:
            with self.subTest(profile_id=profile_id):
                headers = await self.start_session(profile_id)
                options_status, options = await asgi_get(
                    app, "/api/v1/analytics/filters", headers=headers
                )
                sales_status, sales = await asgi_get(
                    app,
                    "/api/v1/analytics/sales",
                    {"dimension": "region"},
                    headers,
                )
                overview_status, overview = await asgi_get(
                    app, "/api/v1/analytics/overview", headers=headers
                )
                trends_status, trends = await asgi_get(
                    app, "/api/v1/analytics/trends", headers=headers
                )
                operations_status, operations = await asgi_get(
                    app, "/api/v1/analytics/operations", headers=headers
                )

                self.assertEqual(options_status, 200)
                self.assertEqual(options["regions"], [region])
                self.assertEqual(sales_status, 200)
                self.assertEqual([item["value"] for item in sales["items"]], [region])
                self.assertEqual(overview_status, 200)
                self.assertEqual(
                    overview["metrics"]["total_order_count"],
                    sales["items"][0]["total_order_count"],
                )
                self.assertEqual(trends_status, 200)
                self.assertEqual(
                    sum(item["total_order_count"] for item in trends["items"]),
                    overview["metrics"]["total_order_count"],
                )
                self.assertEqual(operations_status, 200)
                self.assertEqual(
                    operations["metrics"]["total_order_count"],
                    overview["metrics"]["total_order_count"],
                )

                own_order_id = (
                    "ORD-2025-10-002" if region == "Sul" else "ORD-2025-10-001"
                )
                own_status, own_detail = await asgi_get(
                    app,
                    f"/api/v1/analytics/orders/{own_order_id}",
                    headers=headers,
                )
                self.assertEqual(own_status, 200)
                self.assertEqual(own_detail["region"], region)

    async def test_regional_filter_conflicts_return_403_on_data_endpoints(self) -> None:
        for profile_id, forbidden_region in (
            ("analyst_south", "Sudeste"),
            ("manager_south", "Sudeste"),
            ("manager_southeast", "Sul"),
        ):
            headers = await self.start_session(profile_id)
            paths_and_queries = [
                ("/api/v1/analytics/overview", {}),
                ("/api/v1/analytics/trends", {}),
                ("/api/v1/analytics/sales", {"dimension": "region"}),
                ("/api/v1/analytics/operations", {}),
            ]
            for path, query in paths_and_queries:
                with self.subTest(profile_id=profile_id, path=path):
                    status, payload = await asgi_get(
                        app,
                        path,
                        {**query, "region": forbidden_region},
                        headers,
                    )
                    self.assertEqual(status, 403)
                    self.assertEqual(
                        payload["detail"]["code"], "region_scope_conflict"
                    )

    async def test_regional_profile_cannot_read_known_foreign_order(self) -> None:
        cases = [
            ("analyst_south", "ORD-2025-10-001"),
            ("manager_south", "ORD-2025-10-001"),
            ("manager_southeast", "ORD-2025-10-002"),
        ]
        for profile_id, foreign_order_id in cases:
            with self.subTest(profile_id=profile_id):
                headers = await self.start_session(profile_id)
                status, payload = await asgi_get(
                    app,
                    f"/api/v1/analytics/orders/{foreign_order_id}",
                    headers=headers,
                )
                self.assertEqual(status, 404)
                self.assertEqual(payload["detail"]["code"], "order_not_found")

    async def test_director_can_see_all_regions_and_choose_a_region(self) -> None:
        headers = await self.start_session("director_all")
        options_status, options = await asgi_get(
            app, "/api/v1/analytics/filters", headers=headers
        )
        overview_status, overview = await asgi_get(
            app, "/api/v1/analytics/overview", headers=headers
        )
        sales_status, sales = await asgi_get(
            app,
            "/api/v1/analytics/sales",
            {"dimension": "region"},
            headers,
        )
        filtered_status, filtered = await asgi_get(
            app,
            "/api/v1/analytics/overview",
            {"region": "Sul"},
            headers,
        )

        self.assertEqual(options_status, 200)
        self.assertEqual(
            options["regions"],
            ["Centro-Oeste", "Nordeste", "Norte", "Sudeste", "Sul"],
        )
        self.assertEqual(sales_status, 200)
        self.assertEqual(len(sales["items"]), 5)
        self.assertEqual(overview_status, 200)
        self.assertEqual(overview["metrics"]["total_order_count"], 36)
        self.assertEqual(filtered_status, 200)
        self.assertLess(filtered["metrics"]["total_order_count"], 36)


if __name__ == "__main__":
    unittest.main()