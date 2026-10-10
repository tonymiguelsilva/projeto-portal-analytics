from abc import ABC, abstractmethod

from app.core.config import Settings, get_settings


class DataSource(ABC):
    @abstractmethod
    def load(self, resource_name: str) -> object:
        """Carrega um recurso identificado pelo nome, sem impor um schema."""


def create_data_source(settings: Settings | None = None) -> DataSource:
    selected_settings = settings or get_settings()

    if selected_settings.data_source == "demo":
        from app.services.demo_data_source import DemoDataSource

        return DemoDataSource()

    raise NotImplementedError(
        "DATA_SOURCE='bigquery' foi selecionado, mas a integração com "
        "BigQuery ainda não foi implementada."
    )