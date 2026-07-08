from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from pydantic import BaseModel

from app.models.schemas import ChatRequest, ChatResponse
from app.services.rag_pipeline import RAGPipeline

router = APIRouter()
pipeline = RAGPipeline()


class EmailSubscription(BaseModel):
    email: str


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_warehouse_id: Optional[str] = Header(None, alias="X-Warehouse-Id"),
):
    if not x_user_role:
        raise HTTPException(status_code=401, detail="Missing X-User-Role header")
    
    response_text = ""
    async for token in pipeline.process_query(
        query=request.message,
        user_role=x_user_role,
        warehouse_id=x_warehouse_id,
        conversation_history=request.conversation_history or [],
    ):
        response_text += token
    
    return ChatResponse(
        message=response_text,
        sources=[],
    )


@router.post("/subscribe")
async def subscribe_email(email: EmailSubscription):
    return {"status": "subscribed", "email": email.email}


@router.get("")
def rag_root():
    return {
        "service": "RAG Service",
        "version": "1.0.0",
        "endpoints": {
            "chat": "POST /chat",
            "subscribe": "POST /subscribe",
        },
    }