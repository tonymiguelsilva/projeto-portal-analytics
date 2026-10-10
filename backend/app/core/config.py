import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    data_source: str = "demo"
    environment: str = "dev"

    def __post_init__(self) -> None:
        data_source = self.data_source.strip().lower()
        environment = self.environment.strip().lower()

        if data_source not in {"demo", "bigquery"}:
            raise ValueError(
                "DATA_SOURCE deve ser 'demo' ou 'bigquery'; "
                f"valor recebido: {self.data_source!r}."
            )
        if environment not in {"dev", "prod"}:
            raise ValueError(
                "ENVIRONMENT deve ser 'dev' ou 'prod'; "
                f"valor recebido: {self.environment!r}."
            )

        object.__setattr__(self, "data_source", data_source)
        object.__setattr__(self, "environment", environment)


def get_settings() -> Settings:
    load_dotenv()
    return Settings(
        data_source=os.getenv("DATA_SOURCE", "demo"),
        environment=os.getenv("ENVIRONMENT", "dev"),
    )