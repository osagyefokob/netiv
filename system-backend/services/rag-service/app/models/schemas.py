from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User question for RAG assistant")
    company_id: Optional[str] = Field(default=None, description="Company identifier")
    conversation_history: list[dict] = Field(default_factory=list, description="Chat history")


class ChatResponse(BaseModel):
    message: str
    sources: list[str] = []
    model: str = "llama-3.3-70b-versatile"


class NormalizedDocument(BaseModel):
    content: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RetrievedDocument(BaseModel):
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    event_type: Optional[str] = None
    entity_id: Optional[str] = None
    created_at: datetime
    similarity: float

