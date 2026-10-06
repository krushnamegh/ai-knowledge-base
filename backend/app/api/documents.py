"""
Document API routes.
"""
import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.document import Document, ProcessingStatus
from app.schemas import DocumentListResponse, DocumentResponse
from app.services.ai_service import ai_service
from app.services.document_processor import process_document
from app.services.s3_service import s3_service
from app.services.vector_db import vector_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def _get_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    ext = _get_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 50 MB limit.")

    content_type = file.content_type or "application/octet-stream"

    # Upload to S3 / local
    storage_result = s3_service.upload_file(file_bytes, file.filename, content_type)

    # Persist metadata
    doc = Document(
        filename=file.filename,
        original_filename=file.filename,
        file_type=ext,
        file_size=len(file_bytes),
        s3_key=storage_result.get("s3_key"),
        local_path=storage_result.get("local_path"),
        status=ProcessingStatus.pending,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Process asynchronously in background
    asyncio.create_task(_process_document_task(doc.id, file_bytes, ext))

    return doc


async def _process_document_task(doc_id: int, file_bytes: bytes, file_type: str):
    """Background task: extract text → chunk → embed → store in ChromaDB."""
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        # Fetch document
        result = await db.execute(select(Document).where(Document.id == doc_id))
        doc = result.scalar_one_or_none()
        if not doc:
            return

        try:
            doc.status = ProcessingStatus.processing
            await db.commit()

            # Run CPU-bound processing in thread pool
            loop = asyncio.get_event_loop()
            _, chunks = await loop.run_in_executor(
                None, process_document, file_bytes, file_type
            )

            if not chunks:
                raise ValueError("No text could be extracted from the document.")

            # Store embeddings
            count = await loop.run_in_executor(
                None, vector_db.add_chunks, doc_id, doc.filename, chunks
            )

            doc.chunk_count = count
            doc.status = ProcessingStatus.completed
            doc.processed_at = datetime.now(timezone.utc)
            await db.commit()
            logger.info(f"Document {doc_id} processed: {count} chunks.")

        except Exception as e:
            logger.error(f"Document {doc_id} processing failed: {e}")
            doc.status = ProcessingStatus.failed
            doc.error_message = str(e)
            await db.commit()


@router.get("", response_model=DocumentListResponse)
async def list_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Document).order_by(Document.uploaded_at.desc())
    )
    documents = result.scalars().all()
    return {"documents": documents, "total": len(documents)}


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


@router.delete("/{doc_id}")
async def delete_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Delete from storage
    s3_service.delete_file(doc.s3_key, doc.local_path)

    # Delete from vector DB
    vector_db.delete_document(doc_id)

    # Delete from SQLite
    await db.delete(doc)
    await db.commit()

    return {"message": f"Document '{doc.original_filename}' deleted successfully."}
