"""
Vector database service using ChromaDB with Google Gemini embeddings.
No local model download required — uses Google's embedding API.
"""
import logging
from typing import Optional

import google.generativeai as genai
from chromadb.api.types import EmbeddingFunction, Documents, Embeddings

from app.config import settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "knowledge_base"


class GeminiEmbeddingFunction(EmbeddingFunction):
    """Custom ChromaDB embedding function using Google Gemini API."""

    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)

    def __call__(self, input: Documents) -> Embeddings:
        results = []
        # Process in batches of 20
        for i in range(0, len(input), 20):
            batch = input[i:i + 20]
            for text in batch:
                result = genai.embed_content(
                    model="models/gemini-embedding-001",
                    content=text,
                )
                results.append(result['embedding'])
        return results


class VectorDBService:
    def __init__(self):
        self._client = None
        self._collection = None
        self._embedding_fn = None

    def _get_client(self):
        if self._client is None:
            import chromadb
            self._client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
            logger.info(f"ChromaDB initialised at {settings.chroma_persist_dir}")
        return self._client

    def _get_embedding_function(self):
        if self._embedding_fn is None:
            if settings.gemini_api_key:
                self._embedding_fn = GeminiEmbeddingFunction(api_key=settings.gemini_api_key)
                logger.info("Using Google Gemini embeddings (embedding-001)")
            else:
                raise ValueError("GEMINI_API_KEY required for embeddings")
        return self._embedding_fn

    def _get_collection(self):
        if self._collection is None:
            client = self._get_client()
            self._collection = client.get_or_create_collection(
                name=COLLECTION_NAME,
                embedding_function=self._get_embedding_function(),
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def add_chunks(self, document_id: int, filename: str, chunks: list[str]) -> int:
        if not chunks:
            return 0
        collection = self._get_collection()
        ids = [f"doc_{document_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {"document_id": document_id, "filename": filename, "chunk_index": i}
            for i in range(len(chunks))
        ]
        batch_size = 20
        for start in range(0, len(chunks), batch_size):
            end = min(start + batch_size, len(chunks))
            collection.add(
                ids=ids[start:end],
                documents=chunks[start:end],
                metadatas=metadatas[start:end],
            )
        logger.info(f"Stored {len(chunks)} chunks for document {document_id}")
        return len(chunks)

    def search(self, query: str, top_k: int = 5, document_ids: Optional[list[int]] = None) -> list[dict]:
        try:
            collection = self._get_collection()
            count = collection.count()
            if count == 0:
                return []
            
            where_clause = None
            if document_ids:
                if len(document_ids) == 1:
                    where_clause = {"document_id": document_ids[0]}
                else:
                    where_clause = {"document_id": {"$in": document_ids}}

            results = collection.query(
                query_texts=[query],
                n_results=min(top_k, count),
                where=where_clause
            )
        except Exception as e:
            logger.error(f"ChromaDB query failed: {e}")
            return []

        hits = []
        if results and results.get("documents"):
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            distances = results.get("distances", [[]])[0]
            for doc, meta, dist in zip(docs, metas, distances):
                hits.append({
                    "text": doc,
                    "document_id": meta.get("document_id"),
                    "filename": meta.get("filename"),
                    "chunk_index": meta.get("chunk_index", 0),
                    "score": round(1 - dist, 4),
                })
        return hits

    def delete_document(self, document_id: int):
        try:
            collection = self._get_collection()
            collection.delete(where={"document_id": document_id})
            logger.info(f"Deleted ChromaDB chunks for document {document_id}")
        except Exception as e:
            logger.error(f"Failed to delete ChromaDB chunks for {document_id}: {e}")

    def get_stats(self) -> dict:
        try:
            collection = self._get_collection()
            return {"total_chunks": collection.count(), "status": "connected"}
        except Exception as e:
            return {"total_chunks": 0, "status": f"error: {e}"}


vector_db = VectorDBService()
