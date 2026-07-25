import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Sparkles, Bot, User, ChevronDown, PlusCircle, FileText, X,
  Check, Copy, Globe, FileSearch, Clock, CloudSun, Brain, Loader2,
  AlertCircle, Upload, Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '@clerk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_BASE_URL } from '../utils/config';

// ---------------------------------------------------------------------------
// Code Block component with copy button
// ---------------------------------------------------------------------------
const CodeBlock = ({ inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  if (!inline && match) {
    return (
      <div className="relative group my-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0d1117] shadow-sm dark:shadow-lg">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/50">
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">{match[1]}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700/60"
            title="Copy code"
          >
            {copied ? (
              <><Check size={13} className="text-emerald-500 dark:text-emerald-400" /><span className="text-emerald-500 dark:text-emerald-400">Copied!</span></>
            ) : (
              <><Copy size={13} /><span>Copy</span></>
            )}
          </button>
        </div>
        <div className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-slate-800 dark:text-slate-50">
          <code className={className} {...props}>{children}</code>
        </div>
      </div>
    );
  }

  return (
    <code
      className={`${className || ''} bg-slate-200 dark:bg-slate-700/70 px-1.5 py-0.5 rounded-md text-[13px] font-mono text-slate-800 dark:text-slate-200`}
      {...props}
    >
      {children}
    </code>
  );
};

// ---------------------------------------------------------------------------
// Toast notification component
// ---------------------------------------------------------------------------
const Toast = ({ toasts, removeToast }) => (
  <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium max-w-xs animate-slide-in-right
          ${t.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
            : t.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}
      >
        {t.type === 'error' && <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-500" />}
        {t.type === 'success' && <Check size={16} className="mt-0.5 flex-shrink-0 text-emerald-500" />}
        <span className="flex-1">{t.message}</span>
        <button onClick={() => removeToast(t.id)} className="flex-shrink-0 opacity-60 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
    ))}
  </div>
);

function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  return { toasts, addToast, removeToast };
}

// ---------------------------------------------------------------------------
// Thinking indicator (shows which tool is running)
// ---------------------------------------------------------------------------
const ThinkingIndicator = ({ status }) => {
  const toolIcons = {
    '🔍': <Globe size={13} />,
    '🌤️': <CloudSun size={13} />,
    '🕒': <Clock size={13} />,
    '📄': <FileSearch size={13} />,
    '💾': <Brain size={13} />,
    '🔧': <Sparkles size={13} />,
  };

  const emoji = status.match(/^(🔍|🌤️|🕒|📄|💾|🔧)/)?.[1];
  const icon = emoji ? toolIcons[emoji] : <Loader2 size={13} className="animate-spin" />;
  const label = status.replace(/^(🔍|🌤️|🕒|📄|💾|🔧)\s*/, '').replace(/\.\.\.$/, '');

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-full text-xs text-indigo-600 dark:text-indigo-400 w-fit">
      <span className="text-indigo-500 dark:text-indigo-400">{icon}</span>
      <span>{label || 'Working...'}</span>
      <span className="flex space-x-0.5">
        <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Model definitions
// ---------------------------------------------------------------------------
const MODELS = [
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', sublabel: 'Default · Smart & Fast', icon: '✦' },
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', sublabel: 'via Groq', icon: '🦙' },
];

// ---------------------------------------------------------------------------
// Main ChatArea component
// ---------------------------------------------------------------------------
const ChatArea = ({ messages, isGenerating, thinkingStatus, onSendMessage, selectedModel, setSelectedModel }) => {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);
  const textareaRef = useRef(null);
  const modelDropdownRef = useRef(null);
  const { getToken } = useAuth();
  const { toasts, addToast, removeToast } = useToast();

  const selectedModelInfo = MODELS.find((m) => m.value === selectedModel) || MODELS[0];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating, thinkingStatus]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [inputText]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFileSelect = (file) => {
    if (!file) return;
    const allowedTypes = ['text/plain', 'application/pdf', 'text/markdown', 'text/csv', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp'];
    const allowedExts = ['.txt', '.pdf', '.md', '.csv', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      addToast('Unsupported file type. Please upload documents or images.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast('File is too large. Maximum size is 10 MB.', 'error');
      return;
    }
    
    // If it's an image, we read it as base64 immediately for preview and chat payload
    if (file.type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedFile({ file, isImage: true, base64: reader.result });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachedFile({ file, isImage: false });
    }
  };

  const handleFileInputChange = (e) => handleFileSelect(e.target.files?.[0]);

  // Drag & drop
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files?.[0]);
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    let jobId = null;
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);
      
      addToast(`Uploading "${file.name}"...`, 'info');
      
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      
      if (!data.success) {
        addToast(`Upload failed: ${data.error || 'Unknown error'}`, 'error');
        return false;
      }

      jobId = data.jobId;
      addToast(`Processing document... Please wait.`, 'info');

      // Poll for job status
      return await new Promise((resolve) => {
        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch(`${API_BASE_URL}/api/upload/status/${jobId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const statusData = await statusRes.json();
            
            if (statusData.state === 'completed') {
              clearInterval(interval);
              addToast(`Document successfully processed!`, 'success');
              resolve(true);
            } else if (statusData.state === 'failed') {
              clearInterval(interval);
              addToast(`Processing failed: ${statusData.failedReason || 'Unknown error'}`, 'error');
              resolve(false);
            }
          } catch (err) {
            console.error('Polling error', err);
            clearInterval(interval);
            addToast('Error checking document status.', 'error');
            resolve(false);
          }
        }, 1500); // poll every 1.5s
      });

    } catch (err) {
      console.error('Upload error', err);
      addToast('Failed to upload file. Please check your connection.', 'error');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed && !attachedFile) return;
    if (isGenerating || isUploading) return;

    let uploadedFileName = null;
    let imageBase64Payload = null;

    if (attachedFile) {
      if (attachedFile.isImage) {
        imageBase64Payload = attachedFile.base64;
      } else {
        const success = await uploadFile(attachedFile.file);
        if (success) uploadedFileName = attachedFile.file.name;
      }
      setAttachedFile(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (docInputRef.current) docInputRef.current.value = '';
    }

    // Build the message text
    let messageText = trimmed;
    if (uploadedFileName && !trimmed) {
      messageText = `I've uploaded a document called "${uploadedFileName}". Please confirm it has been ingested.`;
    } else if (uploadedFileName && trimmed) {
      messageText = `[Uploaded: ${uploadedFileName}]\n\n${trimmed}`;
    }

    if (messageText || imageBase64Payload) {
      setInputText('');
      await onSendMessage(messageText, imageBase64Payload);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = (inputText.trim() || attachedFile) && !isGenerating && !isUploading;

  return (
    <div
      className="flex-1 flex flex-col h-full relative max-w-5xl mx-auto w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-500/10 dark:bg-indigo-900/20 border-2 border-dashed border-indigo-400 rounded-2xl m-4 pointer-events-none">
          <div className="text-center">
            <Upload size={40} className="mx-auto text-indigo-500 mb-3" />
            <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg">Drop file to upload</p>
            <p className="text-indigo-500/70 text-sm">.txt, .pdf, .md, .csv supported</p>
          </div>
        </div>
      )}

      {/* Model Selector */}
      <div className="absolute top-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
        <div className="pointer-events-auto" ref={modelDropdownRef}>
          <button
            onClick={() => setShowModelDropdown((v) => !v)}
            className="bg-white dark:bg-[#1e1f20] px-4 py-2 rounded-full border border-slate-200 dark:border-[#444746] shadow-sm flex items-center gap-2 transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md"
          >
            <span className="text-base">{selectedModelInfo.icon}</span>
            <span className="text-sm font-medium text-slate-800 dark:text-[#e3e3e3]">{selectedModelInfo.label}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">{selectedModelInfo.sublabel}</span>
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform duration-200 ${showModelDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {showModelDropdown && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-[#444746] rounded-2xl shadow-xl overflow-hidden min-w-[260px] z-50">
              {MODELS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => { setSelectedModel(m.value); setShowModelDropdown(false); }}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-[#2a2b2f] transition-colors ${
                    m.value === selectedModel ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                  }`}
                >
                  <span className="text-lg w-6 text-center">{m.icon}</span>
                  <div>
                    <div className={`text-sm font-medium ${m.value === selectedModel ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-[#e3e3e3]'}`}>
                      {m.label}
                    </div>
                    <div className="text-xs text-slate-400">{m.sublabel}</div>
                  </div>
                  {m.value === selectedModel && <Check size={14} className="ml-auto text-indigo-500" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 mt-16 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 select-none">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-2xl mb-6 overflow-hidden border border-slate-200 dark:border-slate-800">
              <img src="/logo.webp" alt="Zaheer's AI" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-[#e3e3e3] mb-3">
              Hello, I'm Zaheer's AI
            </h2>
            <p className="text-slate-500 dark:text-[#c4c7c5] text-base max-w-sm leading-relaxed">
              Ask me anything — I can search the web, check the weather, read your documents, and remember important details about you.
            </p>

            {/* Quick prompt suggestions */}
            <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-lg">
              {[
                { label: '🌤️ What\'s the weather in London?', text: "What's the weather like in London right now?" },
                { label: '🔍 Search for latest AI news', text: 'Search the internet for the latest news in AI' },
                { label: '⏰ What time is it?', text: 'What is the current date and time?' },
                { label: '📄 Search my documents', text: 'Search my uploaded documents for any relevant information' },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => { onSendMessage(s.text); }}
                  className="px-4 py-2 text-sm rounded-full bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-[#444746] text-slate-600 dark:text-[#c4c7c5] hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm hover:shadow"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id || Math.random()} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

              {/* AI avatar */}
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img src="/logo.webp" alt="AI" className="w-full h-full object-cover" />
                </div>
              )}

              <div className={`max-w-[85%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full`}>
                {(() => {
                  if (!msg.text) return (
                    <div className="bg-indigo-50 dark:bg-[#1e2a3a] border border-indigo-100 dark:border-indigo-900/30 px-5 py-3 rounded-3xl rounded-tr-sm text-slate-800 dark:text-[#e3e3e3] shadow-sm">
                      <div className="flex items-center gap-2 text-slate-400 h-6">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-sm">Thinking…</span>
                      </div>
                    </div>
                  );

                  let textToRender = msg.text;
                  let attachedDocument = null;

                  const uploadMatch = textToRender.match(/^\[Uploaded: (.*?)\]\n\n(.*)/s);
                  if (uploadMatch) {
                    attachedDocument = uploadMatch[1];
                    textToRender = uploadMatch[2];
                  } else {
                    const uploadMatchFallback = textToRender.match(/^\[Uploaded: (.*?)\]$/s);
                    if (uploadMatchFallback) {
                      attachedDocument = uploadMatchFallback[1];
                      textToRender = '';
                    }
                  }

                  let attachedImage = msg.image || null;

                  // Extract base64 image appended by the DB
                  if (!attachedImage) {
                    const imgMatch = textToRender.match(/\n\n!\[Attached Image\]\((data:image\/.*?)\)$/);
                    if (imgMatch) {
                      attachedImage = imgMatch[1];
                      textToRender = textToRender.replace(imgMatch[0], '').trim();
                    }
                  }

                  return (
                    <>
                      {/* Image Attachment Preview (Thumbnail Above Text) */}
                      {attachedImage && msg.role === 'user' && (
                        <div className="mb-1 w-full flex justify-end">
                          <img
                            src={attachedImage}
                            alt="Attached"
                            className="w-32 h-32 object-cover rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm cursor-zoom-in hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxImage(attachedImage)}
                          />
                        </div>
                      )}

                      {/* Document Attachment Preview */}
                      {attachedDocument && (
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-sm ${
                          msg.role === 'user' 
                            ? 'bg-white dark:bg-[#2a2b2f] border-indigo-100 dark:border-indigo-900/50' 
                            : 'bg-white dark:bg-[#2a2b2f] border-slate-200 dark:border-slate-700'
                        }`}>
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                            <FileText size={20} className="text-indigo-500 dark:text-indigo-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800 dark:text-[#e3e3e3] truncate max-w-[200px]">{attachedDocument}</div>
                            <div className="text-xs text-slate-400">Document</div>
                          </div>
                        </div>
                      )}

                      {/* Text Bubble */}
                      {textToRender && (
                        <div className={`${msg.role === 'user'
                          ? 'bg-indigo-50 dark:bg-[#1e2a3a] border border-indigo-100 dark:border-indigo-900/30 px-5 py-3 rounded-3xl rounded-tr-sm text-slate-800 dark:text-[#e3e3e3] shadow-sm w-fit max-w-full'
                          : 'text-slate-800 dark:text-[#e3e3e3] w-full px-1'
                        }`}>
                          <div className="leading-relaxed text-[15px] prose dark:prose-invert max-w-none prose-p:my-2 prose-headings:font-bold prose-a:text-indigo-500 dark:prose-a:text-indigo-400 prose-code:before:content-none prose-code:after:content-none">
                            <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: CodeBlock,
                        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h3>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-indigo-300 dark:border-indigo-700 pl-4 italic text-slate-600 dark:text-slate-400 my-3">
                            {children}
                          </blockquote>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-3">
                            <table className="min-w-full border-collapse text-sm">{children}</table>
                          </div>
                        ),
                        th: ({ children }) => <th className="border border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 font-semibold text-left">{children}</th>,
                        td: ({ children }) => <td className="border border-slate-300 dark:border-slate-700 px-3 py-1.5">{children}</td>,
                        hr: () => <hr className="border-slate-200 dark:border-slate-700 my-4" />,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">{children}</a>,
                        img: ({ src, alt }) => (
                          <div className="my-3">
                            <img 
                              src={src} 
                              alt={alt || 'Image'} 
                              onClick={() => setLightboxImage(src)}
                              className="rounded-xl border border-slate-200 dark:border-slate-700 max-h-72 object-cover cursor-zoom-in hover:opacity-90 transition-opacity shadow-sm" 
                            />
                          </div>
                        ),
                      }}
                    >
                      {textToRender}
                    </ReactMarkdown>
                  </div>
                </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* User avatar */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-[#444746] flex items-center justify-center flex-shrink-0 mt-1">
                  <User size={15} className="text-slate-600 dark:text-[#e3e3e3]" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Generating state */}
        {isGenerating && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
              <img src="/logo.webp" alt="AI" className="w-full h-full object-cover animate-pulse" />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              {thinkingStatus ? (
                <ThinkingIndicator status={thinkingStatus} />
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-[#c4c7c5]">
                  <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 bg-slate-50 dark:bg-[#0b0f19] relative z-10 w-full max-w-3xl mx-auto transition-colors">
        <form
          onSubmit={handleSubmit}
          className={`relative flex flex-col gap-2 bg-white dark:bg-[#1e1f20] rounded-3xl p-2 border transition-all shadow-sm ${
            isDragging
              ? 'border-indigo-400 shadow-indigo-200 dark:shadow-indigo-900/30'
              : 'border-slate-200 dark:border-transparent focus-within:border-indigo-400 dark:focus-within:border-[#444746]'
          }`}
        >
          {/* Attached file badge */}
          {attachedFile && !attachedFile.isImage && (
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 text-slate-700 dark:text-[#e3e3e3] px-3 py-1.5 rounded-full w-fit mx-2 mt-1">
              <FileText size={15} className="text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
              <span className="text-sm truncate max-w-[180px] sm:max-w-[260px]">{attachedFile.file.name}</span>
              <span className="text-xs text-slate-400 ml-1">({(attachedFile.file.size / 1024).toFixed(0)} KB)</span>
              <button
                type="button"
                onClick={() => { setAttachedFile(null); if (imageInputRef.current) imageInputRef.current.value = ''; if (docInputRef.current) docInputRef.current.value = ''; }}
                className="hover:text-red-500 transition-colors ml-0.5 flex-shrink-0"
                title="Remove file"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Attached image preview */}
          {attachedFile && attachedFile.isImage && (
            <div className="relative mx-2 mt-2 w-24 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm group">
              <img src={attachedFile.base64} alt="Attached preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setAttachedFile(null); if (imageInputRef.current) imageInputRef.current.value = ''; if (docInputRef.current) docInputRef.current.value = ''; }}
                className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
                title="Remove image"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <div className="flex items-end w-full gap-1">
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleFileInputChange}
              className="hidden"
              accept=".png,.jpg,.jpeg,.webp"
            />
            <input
              type="file"
              ref={docInputRef}
              onChange={handleFileInputChange}
              className="hidden"
              accept=".txt,.pdf,.md,.csv,.doc,.docx"
            />

            {/* Attach menu container */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                disabled={isUploading}
                className="p-2.5 text-slate-400 dark:text-[#c4c7c5] hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#2a2b2f] rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
                title="Attach file"
              >
                {isUploading ? <Loader2 size={19} className="animate-spin text-indigo-500" /> : <PlusCircle size={19} className={showAttachMenu ? 'text-indigo-500' : ''} />}
              </button>

              {showAttachMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)}></div>
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-[#444746] rounded-2xl shadow-xl overflow-hidden min-w-[160px] z-50 flex flex-col p-1 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => { setShowAttachMenu(false); imageInputRef.current?.click(); }}
                      className="flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-[#2a2b2f] rounded-xl transition-colors text-sm font-medium text-slate-700 dark:text-[#e3e3e3]"
                    >
                      <ImageIcon size={16} className="text-indigo-500 dark:text-indigo-400" />
                      Add Image
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAttachMenu(false); docInputRef.current?.click(); }}
                      className="flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-[#2a2b2f] rounded-xl transition-colors text-sm font-medium text-slate-700 dark:text-[#e3e3e3]"
                    >
                      <FileText size={16} className="text-emerald-500 dark:text-emerald-400" />
                      Add Files
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Zaheer's AI…"
              disabled={isGenerating}
              className="flex-1 max-h-48 min-h-[44px] bg-transparent resize-none outline-none text-slate-900 dark:text-[#e3e3e3] placeholder-slate-400 dark:placeholder-[#5f6368] py-2.5 text-[15px] custom-scrollbar disabled:opacity-60"
              rows={1}
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`p-2.5 rounded-full flex-shrink-0 transition-all ${
                canSubmit
                  ? 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white shadow-sm hover:shadow-md hover:scale-105 active:scale-95'
                  : 'text-slate-300 dark:text-[#444746] bg-transparent cursor-not-allowed'
              }`}
              title="Send message"
            >
              <Send size={17} className={canSubmit ? 'ml-0.5' : ''} />
            </button>
          </div>
        </form>

        <div className="text-center mt-2">
          <p className="text-[11px] text-slate-400 dark:text-[#5f6368]">
            Zaheer's AI can search the web, check weather, and read your documents. Responses may not always be accurate.
          </p>
        </div>
      </div>

      {/* Lightbox Overlay */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <img 
            src={lightboxImage} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
          />
        </div>
      )}
    </div>
  );
};

export default ChatArea;
