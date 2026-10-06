from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "AI Knowledge Base"
    debug: bool = False

    # AWS S3
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "us-east-1"
    aws_s3_bucket: Optional[str] = None

    # LLM
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None # Keep for fallback if needed
    llm_model: str = "models/gemini-3.5-flash"
    embedding_model: str = "models/gemini-embedding-001"

    # ChromaDB
    chroma_persist_dir: str = "./chroma_db"

    # SQLite
    database_url: str = "sqlite+aiosqlite:///./knowledge_base.db"

    # Chunking
    chunk_size: int = 1000
    chunk_overlap: int = 200

    # CORS — set to * to allow Render frontend or any origin. Override via env var.
    allowed_origins: str = "*"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def use_s3(self) -> bool:
        return bool(
            self.aws_access_key_id
            and self.aws_secret_access_key
            and self.aws_s3_bucket
        )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
