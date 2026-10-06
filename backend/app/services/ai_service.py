"""
AI service — RAG pipeline: retrieve → augment → generate using Google Gemini.
"""
import logging
from typing import Optional

from app.config import settings
from app.services.vector_db import vector_db

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a helpful AI assistant that answers questions based ONLY on the provided document excerpts.

Rules:
- Answer ONLY based on the provided context.
- If the context does not contain enough information to answer the question, say: "I could not find an answer to that question in the uploaded documents."
- Do NOT make up information or use external knowledge.
- Be concise and accurate.
- When quoting or referencing specific content, mention the source document.
"""

def _build_context(chunks: list[dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(
            f"[Source {i}: {chunk['filename']}, chunk {chunk['chunk_index']}]\n{chunk['text']}"
        )
    return "\n\n---\n\n".join(parts)


class AIService:
    def __init__(self):
        self._configured = False

    def _ensure_configured(self):
        if not self._configured:
            if not settings.gemini_api_key:
                raise ValueError("GEMINI_API_KEY not configured.")
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            self._configured = True

    def answer_question_stream(self, question: str, history: list, top_k: int = 5, document_ids: Optional[list[int]] = None):
        """Full RAG pipeline using Google Gemini. Yields answer chunks."""
        # 1. Retrieve relevant chunks
        chunks = vector_db.search(question, top_k=top_k, document_ids=document_ids)

        # 4. Format sources
        sources = [
            {
                "document_id": c["document_id"],
                "filename": c["filename"],
                "chunk_text": c["text"][:300] + ("..." if len(c["text"]) > 300 else ""),
                "chunk_index": c["chunk_index"],
            }
            for c in chunks
        ]

        if not chunks:
            yield {"type": "chunk", "content": "I could not find an answer to that question in the uploaded documents. Please make sure you have uploaded relevant documents and they have been processed successfully."}
            yield {"type": "sources", "sources": []}
            return

        # 2. Build context
        context = _build_context(chunks)

        # 3. Generate answer
        try:
            self._ensure_configured()
            import google.generativeai as genai
            
            model = genai.GenerativeModel(settings.llm_model)
            
            # Format history
            formatted_history = []
            for msg in history:
                role = "user" if msg.role == "user" else "model"
                formatted_history.append({"role": role, "parts": [msg.content]})
            
            chat = model.start_chat(history=formatted_history)
            
            # Combine system prompt with the query
            full_prompt = f"{SYSTEM_PROMPT}\n\nContext:\n{context}\n\nQuestion: {question}"
            
            response = chat.send_message(full_prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield {"type": "chunk", "content": chunk.text}

        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            yield {"type": "chunk", "content": f"AI generation failed: {str(e)}"}

        yield {"type": "sources", "sources": sources}

    @property
    def is_configured(self) -> bool:
        return bool(settings.gemini_api_key)

ai_service = AIService()
