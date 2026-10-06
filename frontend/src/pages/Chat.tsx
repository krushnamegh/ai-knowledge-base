import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Loader2, Sparkles, BrainCircuit, XCircle, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import type { ChatSource, Document } from '../api/client';
import { cn } from '../lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  isError?: boolean;
};

const SUGGESTIONS = [
  "What are the main topics in my documents?",
  "Summarize the uploaded document.",
  "What are the key findings?",
  "Extract the most important statistics."
];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load documents for targeted chat
    api.documents.list().then(res => setDocuments(res.documents)).catch(console.error);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const toggleDocSelection = (id: number) => {
    setSelectedDocs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleSubmit = async (e?: React.FormEvent, suggestionText?: string) => {
    e?.preventDefault();
    const text = suggestionText || input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    
    // Extract history
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]); // Placeholder for stream

      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: text, 
          history: history,
          document_ids: selectedDocs.length > 0 ? selectedDocs : null 
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantSources: ChatSource[] = [];

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'chunk') {
                  assistantContent += data.content;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: 'assistant',
                      content: assistantContent,
                      sources: assistantSources
                    };
                    return newMessages;
                  });
                } else if (data.type === 'sources') {
                  assistantSources = data.sources;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: 'assistant',
                      content: assistantContent,
                      sources: assistantSources
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error("Error parsing stream chunk", e, line);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Chat failed', err);
      const errorMsg = 'Failed to connect to AI Service. Make sure the backend is running and LLM is configured.';
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'assistant', content: errorMsg, isError: true };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-6xl mx-auto">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 backdrop-blur-md">
            <BrainCircuit className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Knowledge Assistant <Sparkles className="w-5 h-5 text-amber-400" />
            </h1>
            <p className="text-sm text-muted-foreground">Ask questions about your uploaded documents.</p>
          </div>
        </div>

        {/* Targeted Document Selection */}
        {documents.length > 0 && (
          <div className="flex items-center gap-2 bg-card border border-border p-2 rounded-xl text-sm shadow-sm overflow-x-auto max-w-[300px]">
            <Search className="w-4 h-4 text-muted-foreground ml-1" />
            <div className="flex gap-2">
              {documents.filter(d => d.status === 'completed').map(doc => (
                <button
                  key={doc.id}
                  onClick={() => toggleDocSelection(doc.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors",
                    selectedDocs.includes(doc.id) 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                  title={doc.filename}
                >
                  {doc.filename.length > 15 ? doc.filename.substring(0, 15) + '...' : doc.filename}
                </button>
              ))}
            </div>
            {selectedDocs.length === 0 && <span className="text-muted-foreground px-2 whitespace-nowrap">Search All Docs</span>}
          </div>
        )}
      </motion.header>
      
      <div className="flex-1 bg-card/60 backdrop-blur-xl border border-border rounded-3xl overflow-hidden flex flex-col shadow-xl ring-1 ring-black/5">
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-4"
              >
                <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mb-6 border border-primary/10 shadow-inner">
                  <Bot className="w-10 h-10 text-primary opacity-70" />
                </div>
                <h2 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">How can I help you today?</h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  I can analyze your indexed documents, extract key information, and answer specific questions.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {SUGGESTIONS.map((suggestion, i) => (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={i}
                      onClick={() => handleSubmit(undefined, suggestion)}
                      className="p-5 border border-border/50 rounded-2xl text-sm text-left bg-card hover:bg-primary/5 hover:border-primary/30 transition-all font-medium flex items-center gap-3 text-muted-foreground hover:text-foreground shadow-sm"
                    >
                      <Sparkles className="w-4 h-4 shrink-0 text-primary/50" />
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              messages.map((msg, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx} 
                  className={cn("flex gap-4", msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 mt-1 shadow-sm">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[85%] sm:max-w-[75%]",
                    msg.role === 'user' ? "order-1" : "order-2"
                  )}>
                    <div className={cn(
                      "px-6 py-4 rounded-3xl shadow-sm",
                      msg.role === 'user' 
                        ? "bg-primary text-primary-foreground font-medium rounded-br-sm bg-gradient-to-tr from-primary to-primary/80" 
                        : msg.isError 
                          ? "bg-red-500/10 border border-red-500/20 text-red-500 rounded-bl-sm"
                          : "bg-background/80 backdrop-blur-sm border border-border/50 text-foreground rounded-bl-sm prose prose-sm dark:prose-invert max-w-none"
                    )}>
                      {msg.isError && <XCircle className="w-5 h-5 inline-block mr-2 mb-1" />}
                      {msg.role === 'assistant' && !msg.isError ? (
                        <ReactMarkdown>{msg.content || ' '}</ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                      {msg.role === 'assistant' && isLoading && idx === messages.length - 1 && !msg.isError && (
                        <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle" />
                      )}
                    </div>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <FileText className="w-3 h-3" /> Sources
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((source, i) => (
                            <div key={i} className="bg-background/50 backdrop-blur border border-border/50 rounded-xl p-3 text-xs flex-1 min-w-[200px] max-w-sm hover:bg-card hover:border-primary/30 transition-colors shadow-sm">
                              <span className="font-semibold text-primary truncate block mb-1.5">{source.filename}</span>
                              <span className="text-muted-foreground line-clamp-3 leading-relaxed italic">"...{source.chunk_text}..."</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shrink-0 border border-border mt-1 order-2 shadow-sm">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-background/80 backdrop-blur-lg border-t border-border/50">
          <form onSubmit={handleSubmit} className="relative flex items-center max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedDocs.length > 0 ? `Ask about ${selectedDocs.length} selected document(s)...` : "Ask a question about your documents..."}
              className="w-full bg-card border border-border/50 text-foreground px-6 py-4 pr-16 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
