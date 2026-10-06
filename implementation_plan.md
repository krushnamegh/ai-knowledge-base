# Implementation Plan

## Structure
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Python + FastAPI
- Storage: AWS S3 (with local fallback)
- Vector DB: ChromaDB
- DB: SQLite (via SQLAlchemy)
- AI: OpenAI API (env var configurable)

## Execution Order
1. Create project folder structure
2. Backend: models, services, API routes, main.py
3. Frontend: components, pages, API client
4. Config files: requirements.txt, package.json, .env.example, README
