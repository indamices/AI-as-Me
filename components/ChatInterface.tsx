
import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Memory, ChatMode, AppSettings, KnowledgeItem, MemoryStatus } from '../types';
import { generateAgentResponse } from '../geminiService';
import { retrieveRelevantKnowledge, formatKnowledgeContext } from '../knowledgeUtils';

// AbortController for cancelling in-flight requests
let currentAbortController: AbortController | null = null;

interface ChatInterfaceProps {
  memories: Memory[];
  knowledgeItems?: KnowledgeItem[];
  messages: { role: 'user' | 'assistant'; content: string }[];
  setMessages: React.Dispatch<React.SetStateAction<{ role: 'user' | 'assistant'; content: string }[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  onChatComplete: (history: { role: string; content: string }[]) => void;
  isExtracting?: boolean;
  mode: ChatMode;
  onModeToggle: (mode: ChatMode) => void;
  settings: AppSettings;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  memories,
  knowledgeItems = [],
  messages, 
  setMessages, 
  input, 
  setInput, 
  onChatComplete,
  isExtracting = false,
  mode,
  onModeToggle,
  settings
}) => {
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom(), 50);
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const messageToSend = customMsg || input.trim();
    if (!messageToSend || isTyping) return;

    // Cancel any in-flight request
    if (currentAbortController) {
      currentAbortController.abort();
    }
    
    // Create new AbortController for this request
    const abortController = new AbortController();
    currentAbortController = abortController;

    if (!customMsg) setInput('');
    
    const newMessages = [...messages, { role: 'user' as const, content: messageToSend }];
    setMessages(newMessages);
    setIsTyping(true);

    const contextStr = memories
      .filter(m => m.status === MemoryStatus.ACTIVE)
      .map(m => `[${m.category}] ${m.content}`)
      .join('\n');

    // Retrieve relevant knowledge
    const relevantKnowledge = retrieveRelevantKnowledge(messageToSend, knowledgeItems, 5);
    const knowledgeContext = formatKnowledgeContext(relevantKnowledge);

    try {
      setErrorMessage(null);
      const assistantResponse = await generateAgentResponse(messageToSend, newMessages, contextStr, mode, settings, knowledgeContext);
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }
      
      const finalMessages = [
        ...newMessages, 
        { role: 'assistant' as const, content: assistantResponse || "认知同步失败。" }
      ];
      setMessages(finalMessages);
    } catch (err) {
      // Ignore abort errors
      if (abortController.signal.aborted) {
        return;
      }
      
      const errorMsg = err instanceof Error ? err.message : '网络链路中断';
      setErrorMessage(errorMsg);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ 错误：${errorMsg}。请检查网络连接或 API 配置。` 
      }]);
    } finally {
      // Only clear typing state if this is still the current request
      if (currentAbortController === abortController) {
        setIsTyping(false);
        currentAbortController = null;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full bg-[#080808] relative overflow-hidden">
      {/* 顶部状态栏与模式切换 */}
      <div className="absolute top-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
        <div className="flex gap-4 pointer-events-auto">
          <div className="glass-panel flex p-1 rounded-full border border-white/10 shadow-2xl backdrop-blur-xl">
             <button 
               onClick={() => onModeToggle('STANDARD')}
               className={`px-6 py-2 rounded-full text-[10px] font-bold tracking-widest transition-all ${mode === 'STANDARD' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
             >
               STANDARD 陪伴
             </button>
             <button 
               onClick={() => onModeToggle('PROBE')}
               className={`px-6 py-2 rounded-full text-[10px] font-bold tracking-widest transition-all ${mode === 'PROBE' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
             >
               PROBE 探针
             </button>
          </div>
          {isExtracting && (
            <div className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-full text-[10px] font-bold text-purple-400 flex items-center gap-2 backdrop-blur-md">
               <i className="fa-solid fa-microchip animate-spin text-[8px]"></i>
               认知收割中...
            </div>
          )}
          {errorMessage && (
            <div className="px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-full text-[10px] font-bold text-red-400 flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
               <i className="fa-solid fa-triangle-exclamation text-[8px]"></i>
               错误：{errorMessage}
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-20 md:px-12 space-y-8 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-10 min-h-full flex flex-col">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] px-6 py-5 rounded-3xl shadow-lg ${
                msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-900/20 text-sm' 
                : 'glass-panel text-gray-200 border border-white/5 rounded-tl-none'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap font-medium leading-relaxed">{msg.content}</div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="glass-panel px-6 py-4 rounded-3xl border border-white/5 flex gap-1 items-center animate-pulse">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4 w-full shrink-0" />
        </div>
      </div>

      <div className="p-6 md:p-10 bg-gradient-to-t from-black via-[#080808] to-transparent shrink-0">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <div className="relative flex items-center bg-white/5 border border-white/10 rounded-[2rem] p-2 pr-4 shadow-2xl focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
            <textarea 
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === 'PROBE' ? "开启深度对话，探索认知边界..." : "随时吩咐，你的数字孪生在这里..."}
              className="flex-1 bg-transparent border-none py-4 px-6 text-base focus:outline-none resize-none overflow-hidden placeholder:text-gray-700 leading-relaxed min-h-[56px] flex items-center justify-center align-middle"
              style={{ paddingBottom: '16px', paddingTop: '16px' }}
            />
            <div className="flex items-center self-center h-full">
              <button 
                onClick={() => handleSubmit()}
                disabled={isTyping || !input.trim()}
                className="w-11 h-11 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                <i className="fa-solid fa-paper-plane text-white text-sm"></i>
              </button>
            </div>
          </div>
          
          <div className="flex justify-between items-center px-4">
             <div className="flex gap-3">
                <button onClick={() => {
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/a52ab336-3bf8-4a2f-91ab-801e07b06386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatInterface.tsx:232',message:'Cognitive harvest button clicked',data:{messagesLength:messages.length,isExtracting,isDisabled:messages.length < 2 || isExtracting},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                  // #endregion
                  onChatComplete(messages);
                }} disabled={messages.length < 2 || isExtracting} className="flex items-center gap-2 px-5 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-widest hover:bg-purple-500/20 transition-all disabled:opacity-30">
                  <i className="fa-solid fa-brain-circuit"></i>
                  认知收割
                </button>
             </div>
             <div className="text-[9px] font-mono text-gray-700 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-shield-halved"></i>
                Local Encryption Active
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
