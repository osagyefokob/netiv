from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    database_url: str = ""

    kafka_bootstrap_servers: str = ""
    kafka_group_id: str = "rag-service"
    kafka_topics: list[str] = [
        "inventory.stock.reserved",
        "inventory.stock.reservation_failed",
        "inventory.stock.released",
        "inventory.stock.adjusted",
        "inventory.stock.low_stock_alert",
        "inventory.product.created",
        "inventory.product.updated",
        "warehouse.goods.received",
        "warehouse.goods.dispatched",
        "warehouse.stock.moved",
        "warehouse.location.capacity_exceeded",
        "order.created",
        "order.status.changed",
        "order.cancelled",
        "order.assigned",
        "order.delayed",
        "procurement.purchase_order.created",
        "procurement.purchase_order.submitted",
        "procurement.purchase_order.received",
        "procurement.delivery.delayed",
        "identity.user.created",
        "identity.user.deactivated",
    ]

    groq_api_key: str = ""

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384

    retrieval_top_k: int = 8
    retrieval_min_score: float = 0.3

    max_context_tokens: int = 2048
    context_recency_weight: float = 0.3

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.groq_api_key = os.environ.get("GROQ_API_KEY", "")

    @property
    def async_database_url(self) -> str:
        url = self.database_url
        if url.startswith("jdbc:"):
            url = url[5:]
        return url

    @property
    def is_kafka_available(self) -> bool:
        return bool(self.kafka_bootstrap_servers)


settings = Settings()