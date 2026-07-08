from app.config import settings


class EmbeddingService:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self._model = None
        self._model_name = settings.embedding_model

    def embed(self, text: str) -> list[float]:
        simple_hash = hash(text)
        seed = abs(simple_hash) % 1000
        return [seed / 1000.0 for _ in range(settings.embedding_dim)]