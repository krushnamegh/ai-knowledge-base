from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import HealthResponse
from app.services.s3_service import s3_service
from app.services.vector_db import vector_db
from app.services.ai_service import ai_service

router = APIRouter(prefix="/api/health", tags=["health"])

@router.get("", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    storage_status = s3_service.storage_type
    
    vector_stats = "error"
    try:
        stats = vector_db.get_stats()
        vector_stats = f"ok (chunks: {stats.get('total_chunks', 0)})"
    except Exception:
        pass
        
    ai_status = "configured" if ai_service.is_configured else "not_configured"

    status = "ok" if db_status == "ok" else "degraded"

    return {
        "status": status,
        "storage": storage_status,
        "vector_db": vector_stats,
        "llm": ai_status
    }
