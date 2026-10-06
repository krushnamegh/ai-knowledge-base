from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.document import ProcessingStatus


class DocumentBase(BaseModel):
    original_filename: str
    file_type: str
    file_size: int


class DocumentCreate(DocumentBase):
    filename: str
    s3_key: Optional[str] = None
    local_path: Optional[str] = None


class DocumentResponse(DocumentBase):
    id: int
    filename: str
    status: ProcessingStatus
    chunk_count: int
    uploaded_at: datetime
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    s3_key: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    top_k: int = 5
    history: list[Message] = []
    document_ids: Optional[list[int]] = None


class SourceChunk(BaseModel):
    document_id: int
    filename: str
    chunk_text: str
    chunk_index: int


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]
    question: str


class HealthResponse(BaseModel):
    status: str
    storage: str
    vector_db: str
    llm: str
