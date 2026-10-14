import json
import unittest
from unittest.mock import patch

from app.core.config import Settings
from app.main import app
from asgi_client import asgi_get, asgi_request


class DemoAuthApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.settings_patch = patch("app.main.get_settings", return_value=Settings())
        self.settings_patch.start()
        self.lifespan_context = app.router.lifespan_context(app)
        await self.lifespan_context.__aenter__()

    async def asyncTearDown(self) -> None:
        await self.lifespan_context.__aexit__(None, None, None)
        self.settings_patch.stop()

    async def test_profiles_endpoint_lists_the_five_approved_profiles(self) -> None:
        status, profiles = await asgi_get(app, "/api/v1/demo-auth/profiles")

        self.assertEqual(status, 200)
        self.assertEqual(
            [profile["profile_id"] for profile in profiles],
            [
                "analyst_south",
                "manager_south",
                "manager_southeast",
                "director_all",
                "data_engineer_all",
            ],
        )
        self.assertEqual(profiles[-1]["role"], "data_engineer")

    async def test_session_start_identity_logout_and_revocation(self) -> None:
        start_status, created, _ = await asgi_request(
            app,
            "POST",
            "/api/v1/demo-auth/session",
            json_body={"profile_id": "manager_southeast"},
        )

        created = json.loads(created)
        headers = {"X-Demo-Session": created["session_id"]}
        identity_status, identity = await asgi_get(
            app, "/api/v1/demo-auth/session", headers=headers
        )
        logout_status, logout_body, _ = await asgi_request(
            app, "DELETE", "/api/v1/demo-auth/session", headers=headers
        )
        after_logout_status, after_logout = await asgi_get(
            app, "/api/v1/demo-auth/session", headers=headers
        )

        self.assertEqual(start_status, 200)
        self.assertEqual(created["profile"]["profile_id"], "manager_southeast")
        self.assertEqual(created["profile"]["region_label"], "Sudeste")
        self.assertEqual(identity_status, 200)
        self.assertEqual(identity["role"], "manager")
        self.assertEqual(logout_status, 204)
        self.assertEqual(logout_body, b"")
        self.assertEqual(after_logout_status, 401)
        self.assertEqual(after_logout["detail"]["code"], "demo_session_invalid")

    async def test_missing_and_unknown_sessions_return_consistent_401(self) -> None:
        missing_status, missing = await asgi_get(app, "/api/v1/demo-auth/session")
        invalid_status, invalid = await asgi_get(
            app,
            "/api/v1/demo-auth/session",
            headers={"X-Demo-Session": "not-a-session"},
        )

        self.assertEqual(missing_status, 401)
        self.assertEqual(missing["detail"]["code"], "demo_session_required")
        self.assertEqual(invalid_status, 401)
        self.assertEqual(invalid["detail"]["code"], "demo_session_invalid")

    async def test_unknown_demo_profile_is_rejected(self) -> None:
        status, payload, _ = await asgi_request(
            app,
            "POST",
            "/api/v1/demo-auth/session",
            json_body={"profile_id": "root"},
        )

        payload = json.loads(payload)

        self.assertEqual(status, 422)
        self.assertIn("detail", payload)


if __name__ == "__main__":
    unittest.main()
