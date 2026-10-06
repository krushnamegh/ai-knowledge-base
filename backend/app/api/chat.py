"""
Chat API route — RAG question answering.
"""
import logging

from fastapi import APIRouter, HTTPException

from app.schemas import ChatRequest, ChatResponse
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


from fastapi.responses import StreamingResponse
import json

@router.post("")
async def chat(request: ChatRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not ai_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="LLM API key not configured. Set GEMINI_API_KEY in your .env file.",
        )

    def sync_generator():
        try:
            for chunk in ai_service.answer_question_stream(request.question, request.history, request.top_k, request.document_ids):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            logger.error(f"Error in chat stream: {e}")
            yield f"data: {json.dumps({'type': 'chunk', 'content': f'Error: {str(e)}'})}\n\n"

    return StreamingResponse(sync_generator(), media_type="text/event-stream")
