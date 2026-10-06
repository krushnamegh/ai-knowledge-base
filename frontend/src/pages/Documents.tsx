import React, { useEffect, useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../api/client';
import type { Document } from '../api/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

export function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      const res = await api.documents.list();
      setDocuments(res.documents);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch documents', err);
      setError('Backend server is not running. Could not fetch documents.');
    }
  };

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      await api.documents.upload(file);
      await fetchDocuments();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload document. Backend might be unavailable.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document? This will remove it from S3 and ChromaDB.')) return;
    try {
      await api.documents.delete(id);
      await fetchDocuments();
    } catch (err) {
      console.error('Failed to delete', err);
      setError('Failed to delete document.');
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Knowledge Base Documents</h1>
          <p className="text-muted-foreground">Manage your uploaded files and see indexing status.</p>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      {/* Upload Area */}
      <div 
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 group cursor-pointer",
          dragActive ? "border-primary bg-primary/10 scale-[1.01]" : "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleUpload(e.target.files[0]);
            }
          }}
        />
        
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
          {isUploading ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : (
            <UploadCloud className="w-10 h-10" />
          )}
        </div>
        <h3 className="text-2xl font-bold mb-2 text-foreground">Drop your documents here</h3>
        <p className="text-sm text-muted-foreground font-medium bg-muted inline-block px-4 py-1.5 rounded-full">PDF • DOCX • TXT</p>
      </div>

      {/* Documents List */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-5 font-semibold">Document</th>
                <th className="px-6 py-5 font-semibold hidden md:table-cell">Type / Size</th>
                <th className="px-6 py-5 font-semibold hidden sm:table-cell">Uploaded</th>
                <th className="px-6 py-5 font-semibold">Status</th>
                <th className="px-6 py-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    No documents indexed yet. Upload one to get started.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border/50">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs block">{doc.original_filename}</span>
                          <span className="text-xs text-muted-foreground block mt-0.5">ID: {doc.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground hidden md:table-cell uppercase font-medium">
                      {doc.file_type} <span className="opacity-50 mx-1">•</span> {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                    </td>
                    <td className="px-6 py-4 text-muted-foreground hidden sm:table-cell">
                      {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {doc.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {doc.status === 'failed' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        {(doc.status === 'pending' || doc.status === 'processing') && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                        
                        <div className="flex flex-col">
                          <span className={cn(
                            "font-bold capitalize",
                            doc.status === 'completed' ? "text-emerald-500" :
                            doc.status === 'failed' ? "text-red-500" : "text-blue-500"
                          )}>
                            {doc.status === 'completed' ? '✓ Indexed' : 
                             doc.status === 'failed' ? '⚠ Failed' : '⟳ Processing'}
                          </span>
                          {doc.chunk_count > 0 && <span className="text-xs text-muted-foreground">{doc.chunk_count} chunks</span>}
                        </div>
                      </div>
                      {doc.error_message && (
                        <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={doc.error_message}>
                          {doc.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(doc.id)}
                        className="text-muted-foreground hover:text-red-500 p-2.5 rounded-xl hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 border border-transparent hover:border-red-500/20"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
