import unittest

from app.services.demo_sessions import DEMO_PROFILES, DemoSessionStore


class DemoSessionStoreTests(unittest.TestCase):
    def test_profiles_match_approved_region_scopes(self) -> None:
        self.assertEqual(
            DEMO_PROFILES["analyst_south"].allowed_regions,
            ("Sul",),
        )
        self.assertEqual(
            DEMO_PROFILES["manager_south"].allowed_regions,
            ("Sul",),
        )
        self.assertEqual(
            DEMO_PROFILES["manager_southeast"].allowed_regions,
            ("Sudeste",),
        )
        self.assertIsNone(DEMO_PROFILES["director_all"].allowed_regions)

    def test_session_identifier_is_opaque_and_resolves_profile(self) -> None:
        store = DemoSessionStore()

        session_id, identity = store.create("analyst_south")

        self.assertGreaterEqual(len(session_id), 40)
        self.assertNotIn("analyst_south", session_id)
        self.assertEqual(store.resolve(session_id), identity)

    def test_missing_unknown_expired_and_revoked_sessions_do_not_resolve(self) -> None:
        now = [10.0]
        store = DemoSessionStore(ttl_seconds=5, clock=lambda: now[0])
        session_id, _ = store.create("manager_southeast")

        self.assertIsNone(store.resolve(None))
        self.assertIsNone(store.resolve("unknown-session"))
        self.assertTrue(store.revoke(session_id))
        self.assertIsNone(store.resolve(session_id))

        expiring_id, _ = store.create("manager_south")
        now[0] += 5
        self.assertIsNone(store.resolve(expiring_id))
        self.assertFalse(store.revoke(expiring_id))

    def test_session_ttl_must_be_positive(self) -> None:
        with self.assertRaises(ValueError):
            DemoSessionStore(ttl_seconds=0)


if __name__ == "__main__":
    unittest.main()