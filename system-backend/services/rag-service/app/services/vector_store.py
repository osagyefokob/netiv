import asyncpg
from app.config import settings


class VectorStoreReader:
    def __init__(self):
        self._pool = None

    def _build_async_url(self) -> str:
        url = settings.database_url
        if url.startswith("jdbc:"):
            url = url[5:]
        return url

    async def _get_pool(self):
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                self._build_async_url(),
                min_size=2,
                max_size=10,
            )
        return self._pool

    async def similarity_search(
        self,
        query_embedding: list[float],
        top_k: int = 8,
        entity_type: str | None = None,
        warehouse_id: str | None = None,
        min_score: float = 0.0,
    ) -> list[dict]:
        pool = await self._get_pool()
        
        params = [query_embedding, top_k]
        param_idx = 3
        
        conditions = ["1=1"]
        
        if entity_type:
            conditions.append(f"entity_type = ${param_idx}")
            params.append(entity_type)
            param_idx += 1
        
        if warehouse_id:
            conditions.append(f"(warehouse_id = ${param_idx} OR warehouse_id IS NULL)")
            params.append(warehouse_id)
        
        where_clause = " AND ".join(conditions)
        
        query = f"""
            SELECT id, entity_type, entity_id, content, event_type, 
                   warehouse_id, created_at, embedding <=> $1 as similarity
            FROM event_embeddings
            WHERE {where_clause}
            ORDER BY embedding <=> $1
            LIMIT $2
        """
        
        rows = await pool.fetch(query, *params)
        
        docs = []
        for row in rows:
            if row["similarity"] >= min_score:
                docs.append({
                    "id": row["id"],
                    "entity_type": row["entity_type"],
                    "entity_id": row["entity_id"],
                    "content": row["content"],
                    "event_type": row["event_type"],
                    "warehouse_id": row["warehouse_id"],
                    "created_at": row["created_at"],
                    "score": row["similarity"],
                })
        
        return docs

    async def get_by_entity(self, entity_type: str, entity_id: str) -> list[dict]:
        pool = await self._get_pool()
        
        rows = await pool.fetch(
            """
            SELECT * FROM event_embeddings
            WHERE entity_type = $1 AND entity_id = $2
            ORDER BY created_at DESC
            """,
            entity_type,
            entity_id,
        )
        
        return [
            {
                "id": row["id"],
                "content": row["content"],
                "event_type": row["event_type"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]