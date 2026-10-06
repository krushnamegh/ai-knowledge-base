# AI Knowledge Base

A full-stack RAG (Retrieval-Augmented Generation) application that allows you to upload documents and chat with an AI assistant that answers questions based strictly on your document contents.

Powered by **Google Gemini**, built with **FastAPI + React**, and deployable to **Render** for free.

## 🚀 Features

* **Document Uploads**: Upload `.txt`, `.pdf`, `.docx` files.
* **Intelligent Document Processing**: Automatically extracts text, chunks it, and indexes it using Gemini embeddings.
* **Conversational RAG Chat**: Multi-turn chat with memory — the AI remembers follow-up questions within a session.
* **Streaming Responses**: Real-time token-by-token chat responses.
* **Targeted Document Chat**: Filter the AI's search to specific documents.
* **Source Citations**: AI responses include citations and excerpts from source documents.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion |
| Backend | FastAPI (Python) |
| Vector Database | ChromaDB (local persistent) |
| LLM & Embeddings | Google Gemini (`models/gemini-3.5-flash`, `models/gemini-embedding-001`) |
| File Storage | Local filesystem (or AWS S3 if configured) |

---

## ⚙️ Local Development Setup

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```env
GEMINI_API_KEY="your-google-gemini-api-key"
```

Start the backend:
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## ☁️ Cloud Deployment (Render — Free)

This project is pre-configured for **one-click deployment to Render** using the `render.yaml` file.

### Steps to Deploy

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Connect to Render:**
   - Go to [render.com](https://render.com) and sign in with GitHub.
   - Click **"New"** → **"Blueprint"**.
   - Select your repository. Render will auto-detect the `render.yaml` and create both services.

3. **Set Environment Variables on Render:**
   - On your **Backend** service dashboard, go to **Environment** and add:
     - `GEMINI_API_KEY` = `your-google-gemini-api-key`
   - After the backend deploys, copy its URL (e.g. `https://ai-knowledge-base-backend.onrender.com`).
   - On your **Frontend** service dashboard, go to **Environment** and add:
     - `VITE_API_URL` = `https://ai-knowledge-base-backend.onrender.com/api`
   - Trigger a **manual redeploy** of the frontend after adding the variable.

4. **Done!** Your app is live. 🎉

> [!NOTE]
> **Free tier caveat:** Render free services spin down after 15 minutes of inactivity. Uploaded documents and chat history will be cleared on restart since they are stored on the ephemeral disk. This is fine for a showcase/demo!

---

## 📁 Project Structure

```
ai-knowledge-base/
├── backend/               # FastAPI server
│   ├── app/
│   │   ├── api/           # Route handlers (chat, documents, health)
│   │   ├── models/        # SQLAlchemy models
│   │   ├── services/      # AI, Vector DB, S3, Document Processing
│   │   ├── config.py      # Settings from environment variables
│   │   └── schemas.py     # Pydantic request/response models
│   ├── main.py
│   └── requirements.txt
├── frontend/              # React + Vite app
│   ├── src/
│   │   ├── pages/         # Dashboard, Documents, Chat
│   │   ├── components/    # Layout
│   │   └── api/           # API client
│   └── package.json
├── render.yaml            # Render deployment config
└── README.md
```

## 📋 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Your Google Gemini API key from [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `VITE_API_URL` | ✅ Frontend | URL of the backend API (e.g. `https://your-backend.onrender.com/api`) |
| `ALLOWED_ORIGINS` | Optional | Comma-separated list of allowed CORS origins. Defaults to `*`. |
| `AWS_ACCESS_KEY_ID` | Optional | For S3 storage. Leave blank to use local filesystem. |
| `AWS_SECRET_ACCESS_KEY` | Optional | For S3 storage. |
| `AWS_REGION` | Optional | AWS region. Defaults to `us-east-1`. |
| `AWS_S3_BUCKET` | Optional | Your S3 bucket name. |
