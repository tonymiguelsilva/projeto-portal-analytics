import os
import unittest
from unittest.mock import patch

from app.core.config import Settings, get_settings


class SettingsTests(unittest.TestCase):
    @patch("app.core.config.load_dotenv")
    def test_defaults(self, _load_dotenv: object) -> None:
        with patch.dict(os.environ, {}, clear=True):
            settings = get_settings()

        self.assertEqual(settings.data_source, "demo")
        self.assertEqual(settings.environment, "dev")

    @patch("app.core.config.load_dotenv")
    def test_data_source_and_environment_are_independent(
        self, _load_dotenv: object
    ) -> None:
        with patch.dict(os.environ, {"DATA_SOURCE": "bigquery"}, clear=True):
            settings = get_settings()
        self.assertEqual(settings.data_source, "bigquery")
        self.assertEqual(settings.environment, "dev")

        with patch.dict(os.environ, {"ENVIRONMENT": "prod"}, clear=True):
            settings = get_settings()
        self.assertEqual(settings.data_source, "demo")
        self.assertEqual(settings.environment, "prod")

    def test_normalizes_allowed_values(self) -> None:
        settings = Settings(data_source=" BIGQUERY ", environment=" PROD ")

        self.assertEqual(settings.data_source, "bigquery")
        self.assertEqual(settings.environment, "prod")

    def test_rejects_unsupported_data_source(self) -> None:
        with self.assertRaisesRegex(ValueError, "DATA_SOURCE"):
            Settings(data_source="warehouse")

    def test_rejects_unsupported_environment(self) -> None:
        with self.assertRaisesRegex(ValueError, "ENVIRONMENT"):
            Settings(environment="test")


if __name__ == "__main__":
    unittest.main()