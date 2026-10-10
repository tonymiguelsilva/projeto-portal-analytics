import unittest
from unittest.mock import patch

from fastapi import Request

from app.core.config import Settings
from app.main import app, get_data_source
from app.services.demo_data_source import DemoDataSource
from asgi_client import asgi_get


class MainApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.settings_patch = patch("app.main.get_settings", return_value=Settings())
        self.demo_load_patch = patch.object(
            DemoDataSource,
            "load",
            side_effect=AssertionError("A inicialização não deve carregar arquivos Demo."),
        )
        self.settings_patch.start()
        self.demo_load_mock = self.demo_load_patch.start()
        self.lifespan_context = app.router.lifespan_context(app)
        await self.lifespan_context.__aenter__()

    async def asyncTearDown(self) -> None:
        await self.lifespan_context.__aexit__(None, None, None)
        self.demo_load_patch.stop()
        self.settings_patch.stop()

    async def test_lifespan_initializes_demo_without_loading_files(self) -> None:
        self.assertIsInstance(app.state.data_source, DemoDataSource)
        self.demo_load_mock.assert_not_called()

    async def test_request_dependency_returns_lifespan_source(self) -> None:
        request = Request({"type": "http", "app": app})

        self.assertIs(get_data_source(request), app.state.data_source)

    async def test_root_endpoint_response_is_unchanged(self) -> None:
        status, payload = await asgi_get(app, "/")

        self.assertEqual(status, 200)
        self.assertEqual(
            payload,
            {
                "message": "Portal Web Analítico API",
                "version": "0.1.0",
                "docs": "/docs",
                "health": "/health",
            },
        )

    async def test_health_endpoint_response_is_unchanged(self) -> None:
        status, payload = await asgi_get(app, "/health")

        self.assertEqual(status, 200)
        self.assertEqual(
            payload,
            {"status": "ok", "message": "API está funcionando"},
        )


if __name__ == "__main__":
    unittest.main()
