import csv
import json
from pathlib import Path

from app.services.data_source import DataSource


class DemoDataSource(DataSource):
    def __init__(self, data_dir: Path | None = None) -> None:
        project_root = Path(__file__).resolve().parents[3]
        self.data_dir = (data_dir or project_root / "data" / "demo").resolve()

    def load(self, resource_name: str) -> object:
        resource_path = (self.data_dir / resource_name).resolve()
        try:
            resource_path.relative_to(self.data_dir)
        except ValueError as error:
            raise ValueError("O recurso deve estar dentro de data/demo.") from error

        if not resource_path.is_file():
            raise FileNotFoundError(f"Recurso Demo não encontrado: {resource_name}")

        if resource_path.suffix.lower() == ".json":
            with resource_path.open(encoding="utf-8") as resource_file:
                return json.load(resource_file)

        if resource_path.suffix.lower() == ".csv":
            with resource_path.open(encoding="utf-8", newline="") as resource_file:
                return list(csv.DictReader(resource_file))

        raise ValueError("A fonte Demo aceita apenas arquivos JSON ou CSV.")