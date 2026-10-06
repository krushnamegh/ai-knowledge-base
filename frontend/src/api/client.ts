import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Document {
  id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunk_count: number;
  uploaded_at: string;
  processed_at: string | null;
  error_message: string | null;
  s3_key: string | null;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
}

export interface SourceChunk {
  document_id: number;
  filename: string;
  chunk_text: string;
  chunk_index: number;
}

export interface ChatResponse {
  answer: string;
  sources: SourceChunk[];
  question: string;
}

export interface HealthResponse {
  status: string;
  storage: string;
  vector_db: string;
  llm: string;
}

export const api = {
  documents: {
    list: () => apiClient.get<DocumentListResponse>('/documents').then(res => res.data),
    get: (id: number) => apiClient.get<Document>(`/documents/${id}`).then(res => res.data),
    delete: (id: number) => apiClient.delete(`/documents/${id}`).then(res => res.data),
    upload: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post<Document>('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }).then(res => res.data);
    },
  },
  chat: {
    ask: (question: string, top_k: number = 5) => 
      apiClient.post<ChatResponse>('/chat', { question, top_k }).then(res => res.data),
  },
  health: {
    check: () => apiClient.get('/health').then(res => res.data),
  }
};
