import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Activity, ArrowRight, CheckCircle2, Clock, XCircle, Database, Server, BrainCircuit, MessageSquareText } from 'lucide-react';
import { api } from '../api/client';
import type { Document, HealthResponse } from '../api/client';
import { formatDistanceToNow } from 'date-fns';

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalDocs: 0, processing: 0, failed: 0 });
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, healthRes] = await Promise.all([
          api.documents.list(),
          api.health.check()
        ]);
        
        setStats({
          totalDocs: docsRes.total,
          processing: docsRes.documents.filter(d => d.status === 'processing' || d.status === 'pending').length,
          failed: docsRes.documents.filter(d => d.status === 'failed').length
        });
        setRecentDocs(docsRes.documents.slice(0, 4));
        setHealth(healthRes);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch dashboard data', err);
        setError('Backend server is not running or unavailable. Please ensure the FastAPI backend is started.');
      }
    };
    fetchData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl flex items-center gap-3">
          <XCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-border p-8 sm:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
            Turn your documents into an <span className="text-primary">AI-powered</span> knowledge base.
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Upload your PDF, DOCX, and TXT files to our cloud storage. We'll automatically process, chunk, and index them so you can ask intelligent questions instantly.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={() => navigate('/documents')}
              className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-5 h-5" />
              Upload Document
            </button>
            <button 
              onClick={() => navigate('/chat')}
              className="w-full sm:w-auto px-8 py-4 bg-card border border-border text-foreground rounded-full font-semibold hover:bg-muted transition-all flex items-center justify-center gap-2"
            >
              <MessageSquareText className="w-5 h-5" />
              Ask AI
            </button>
          </div>
        </div>
      </div>

      {/* Architecture Flow Visualization */}
      <div className="bg-card border border-border rounded-3xl p-8">
        <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-8 text-center">System Architecture</h2>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
          
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-sm border border-blue-500/20">
              <FileText className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium mt-2">Documents</p>
            <span className="text-xs text-muted-foreground">{stats.totalDocs} Indexed</span>
          </div>

          <ArrowRight className="w-6 h-6 text-muted-foreground/50 hidden md:block rotate-90 md:rotate-0" />

          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-500/20">
              <Server className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium mt-2">Cloud Storage</p>
            <span className="text-xs text-muted-foreground">{health?.storage === 'AWS S3' ? 'AWS S3 Connected' : 'Local Fallback'}</span>
          </div>

          <ArrowRight className="w-6 h-6 text-muted-foreground/50 hidden md:block rotate-90 md:rotate-0" />

          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 shadow-sm border border-purple-500/20">
              <Database className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium mt-2">Vector DB</p>
            <span className="text-xs text-muted-foreground">{health?.vector_db ? 'ChromaDB Active' : 'Checking...'}</span>
          </div>

          <ArrowRight className="w-6 h-6 text-muted-foreground/50 hidden md:block rotate-90 md:rotate-0" />

          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm border border-amber-500/20">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium mt-2">AI Engine</p>
            <span className="text-xs text-muted-foreground">{health?.llm === 'configured' ? 'LLM Connected' : 'Missing API Key'}</span>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Documents */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Recent Uploads</h2>
            <button onClick={() => navigate('/documents')} className="text-sm text-primary hover:underline font-medium">
              View all
            </button>
          </div>
          
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            {recentDocs.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentDocs.map((doc: Document) => (
                  <div key={doc.id} className="p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border/50">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{doc.original_filename}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full border border-border">
                      {getStatusIcon(doc.status)}
                      <span className="text-xs font-semibold capitalize text-foreground">{doc.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Indexed</p>
                <p className="text-3xl font-bold">{stats.totalDocs}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Processing</p>
                <p className="text-3xl font-bold">{stats.processing}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Activity className="w-6 h-6" />
              </div>
            </div>
            {stats.failed > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 shadow-sm flex items-center justify-between text-red-500">
                <div>
                  <p className="text-sm font-medium mb-1 opacity-80">Failed Uploads</p>
                  <p className="text-3xl font-bold">{stats.failed}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
