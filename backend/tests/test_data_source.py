import json
import tempfile
import unittest
from pathlib import Path

from app.core.config import Settings
from app.services.data_source import DataSource, create_data_source
from app.services.demo_data_source import DemoDataSource


class DataSourceTests(unittest.TestCase):
    def test_factory_selects_demo_source(self) -> None:
        data_source = create_data_source(Settings())

        self.assertIsInstance(data_source, DemoDataSource)
        self.assertIsInstance(data_source, DataSource)

    def test_factory_reports_unimplemented_bigquery(self) -> None:
        settings = Settings(data_source="bigquery")

        with self.assertRaisesRegex(
            NotImplementedError, "integração com BigQuery ainda não foi implementada"
        ):
            create_data_source(settings)

    def test_demo_source_loads_json_without_a_schema(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            data_dir = Path(temporary_directory)
            expected = {"arbitrary": [1, "value"]}
            (data_dir / "sample.json").write_text(
                json.dumps(expected), encoding="utf-8"
            )
            data_source = DemoDataSource(data_dir)

            self.assertEqual(data_source.load("sample.json"), expected)

    def test_demo_source_loads_csv_rows(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            data_dir = Path(temporary_directory)
            (data_dir / "sample.csv").write_text(
                "first,second\na,b\n", encoding="utf-8"
            )
            data_source = DemoDataSource(data_dir)

            self.assertEqual(
                data_source.load("sample.csv"), [{"first": "a", "second": "b"}]
            )

    def test_demo_source_rejects_paths_outside_data_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            data_source = DemoDataSource(Path(temporary_directory) / "demo")

            with self.assertRaisesRegex(ValueError, "dentro de data/demo"):
                data_source.load("../outside.json")


if __name__ == "__main__":
    unittest.main()