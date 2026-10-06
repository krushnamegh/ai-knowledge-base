"""
Document processing: text extraction, cleaning, chunking.
Uses pypdf for PDF (pure Python, works on all platforms/Python versions).
Uses python-docx for DOCX.
"""
import io
import logging
import re
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


def extract_text(file_bytes: bytes, file_type: str) -> str:
    """Extract plain text from PDF, DOCX, or TXT."""
    ext = file_type.lower().lstrip(".")

    if ext == "pdf":
        return _extract_pdf(file_bytes)
    elif ext in ("docx", "doc"):
        return _extract_docx(file_bytes)
    elif ext == "txt":
        return file_bytes.decode("utf-8", errors="replace")
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


def _extract_pdf(file_bytes: bytes) -> str:
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(file_bytes))
        texts = []
        for page in reader.pages:
            text = page.extract_text()
            if text and text.strip():
                texts.append(text.strip())
        if not texts:
            raise ValueError("No readable text found in PDF. It may be a scanned image PDF.")
        return "\n\n".join(texts)
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise ValueError(f"Could not extract text from PDF: {e}")


def _extract_docx(file_bytes: bytes) -> str:
    try:
        from docx import Document

        doc = Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        if not paragraphs:
            raise ValueError("No readable text found in DOCX.")
        return "\n\n".join(paragraphs)
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        raise ValueError(f"Could not extract text from DOCX: {e}")


def clean_text(text: str) -> str:
    """Basic text cleaning."""
    # Collapse whitespace
    text = re.sub(r"[ \t]+", " ", text)
    # Collapse excessive newlines
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove null bytes
    text = text.replace("\x00", "")
    return text.strip()


def chunk_text(
    text: str,
    chunk_size: Optional[int] = None,
    overlap: Optional[int] = None,
) -> list[str]:
    """
    Sliding-window chunker based on word count.
    Returns list of text chunks.
    """
    chunk_size = chunk_size or settings.chunk_size
    overlap = overlap or settings.chunk_overlap

    words = text.split()
    if not words:
        return []

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        if end == len(words):
            break
        start += chunk_size - overlap

    return chunks


def process_document(file_bytes: bytes, file_type: str) -> tuple[str, list[str]]:
    """
    Full pipeline: extract → clean → chunk.
    Returns (full_text, chunks).
    """
    raw_text = extract_text(file_bytes, file_type)
    cleaned = clean_text(raw_text)
    if not cleaned:
        raise ValueError("Document appears to be empty after text extraction.")
    chunks = chunk_text(cleaned)
    return cleaned, chunks
