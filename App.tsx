
import React, { useState, useCallback, useEffect } from 'react';
import { 
  Memory, MemoryCategory, MemoryLayer, MemoryStatus, 
  InsightProposal, EvolutionRecord, AppSettings, ChatMode,
  KnowledgeItem, UploadRecord, ConversationSession, ExtractionMode,
  ThinkingSession, ThinkingNode
} from './types';
import Sidebar from './components/Sidebar';
import MemoryVault from './components/MemoryVault';
import InsightQueue from './components/InsightQueue';
import IntentCenter from './components/IntentCenter';
import EvolutionTimeline from './components/EvolutionTimeline';
import ChatInterface from './components/ChatInterface';
import ThinkingInterface from './components/ThinkingInterface';
import ImportHub from './components/ImportHub';
import ExportCenter from './components/ExportCenter';
import SettingsCenter from './components/SettingsCenter';
import KnowledgeBase from './components/KnowledgeBase';
import UploadHistory from './components/UploadHistory';
import SessionArchive from './components/SessionArchive';
import { extractInsightsFromChat, extractKnowledgeFromText } from './geminiService';
import { findSimilarMemories, calculateQualityScore, calculateMergedConfidence } from './memoryUtils';
import { calculateContentHash, retrieveRelevantKnowledge, formatKnowledgeContext } from './knowledgeUtils';
import { APP_VERSION } from './version';

// Safe JSON parse with error handling
const safeJSONParse = <T,>(json: string | null, defaultValue: T): T => {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json) as T;
  } catch (e) {
    console.error('Failed to parse JSON from localStorage:', e);
    console.error('Invalid JSON:', json);
    return defaultValue;
  }
};

// Safe localStorage setItem with quota handling
const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException) {
      if (e.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded for key:', key);
        // Try to clear old data or notify user
        alert('存储空间不足，请清理一些数据或联系支持。');
      } else {
        console.error('LocalStorage error:', e);
      }
    } else {
      console.error('Unexpected error setting localStorage:', e);
    }
    return false;
  }
};

// Helper function to extract relevant evidence from conversation history
const extractEvidenceContext = (
  content: string,
  history: { role: string; content: string }[],
  maxSnippets: number = 3
): string[] => {
  if (history.length === 0) return [];
  
  // Extract keywords from the memory content (simple approach: use first few words)
  const contentWords = content.toLowerCase().split(/\s+/).filter(w => w.length > 2).slice(0, 5);
  
  // Find messages that contain relevant keywords
  const relevantMessages = history
    .filter(msg => {
      const msgLower = msg.content.toLowerCase();
      return contentWords.some(word => msgLower.includes(word));
    })
    .slice(-maxSnippets)
    .map(msg => msg.content);
  
  // If no relevant messages found, use recent messages
  if (relevantMessages.length === 0) {
    return history.slice(-maxSnippets).map(msg => msg.content);
  }
  
  return relevantMessages;
};

const STORAGE_KEYS = {
  MEMORIES: 'pe_memories',
  HISTORY: 'pe_history',
  PROPOSALS: 'pe_proposals',
  SETTINGS: 'pe_settings',
  MESSAGES: 'pe_messages',
  KNOWLEDGE: 'pe_knowledge',
  UPLOADS: 'pe_uploads',
  SESSIONS: 'pe_sessions',
  CONTENT_HASHES: 'pe_content_hashes'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vault' | 'queue' | 'intents' | 'evolution' | 'chat' | 'import' | 'export' | 'settings' | 'knowledge' | 'uploads' | 'sessions'>('chat');
  
  // Initialize and load from localStorage with safe parsing
  const [memories, setMemories] = useState<Memory[]>(() => 
    safeJSONParse(localStorage.getItem(STORAGE_KEYS.MEMORIES), [])
  );
  const [history, setHistory] = useState<EvolutionRecord[]>(() => 
    safeJSONParse(localStorage.getItem(STORAGE_KEYS.HISTORY), [])
  );
  const [proposals, setProposals] = useState<InsightProposal[]>(() => {
    const saved = safeJSONParse<InsightProposal[]>(localStorage.getItem(STORAGE_KEYS.PROPOSALS), []);
    // Ensure old data has new fields, including summary
    return saved.map((p: any) => {
      // Auto-generate summary if missing (for backward compatibility)
      const summary = p.summary || 
                     p.reasoning || 
                     p.proposedMemory?.content || 
                     `Proposal ${p.id || 'unknown'}`;
      
      return {
        ...p,
        summary, // Ensure summary always exists
        confidence: p.confidence ?? 0.7,
        qualityScore: p.qualityScore ?? 0.6,
        evidenceStrength: p.evidenceStrength ?? 0.6,
        similarityMatches: p.similarityMatches || [],
        extractionMetadata: p.extractionMetadata || undefined
      };
    });
  });
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return saved ? safeJSONParse(saved, [{ role: 'assistant', content: "认知核已挂载。正在执行人格多维扫描协议。我们可以从任何维度开始，我也将尝试探测你的认知边界。" }]) 
                 : [{ role: 'assistant', content: "认知核已挂载。正在执行人格多维扫描协议。我们可以从任何维度开始，我也将尝试探测你的认知边界。" }];
  });
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaultSettings = {
      geminiApiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
      geminiModel: 'gemini-3-pro-preview',
      deepseekKey: '',
      activeProvider: 'GEMINI' as const,
      deepseekModel: 'deepseek-chat',
      minConfidenceThreshold: 0.6,
      autoMergeThreshold: 0.85,
      qualityFilterEnabled: true
    };
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      const parsed = safeJSONParse<AppSettings>(saved, defaultSettings);
      // Merge with defaults to ensure new fields exist
      return { ...defaultSettings, ...parsed };
    }
    return defaultSettings;
  });

  const [chatMode, setChatMode] = useState<ChatMode>('PROBE');
  const [isExtractingInsights, setIsExtractingInsights] = useState(false);
  const [chatInput, setChatInput] = useState('');
  
  // Use ref to track extraction state and prevent race conditions
  const extractionInProgressRef = React.useRef(false);
  
  // Knowledge Base state
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>(() => 
    safeJSONParse(localStorage.getItem(STORAGE_KEYS.KNOWLEDGE), [])
  );
  const [uploadRecords, setUploadRecords] = useState<UploadRecord[]>(() => 
    safeJSONParse(localStorage.getItem(STORAGE_KEYS.UPLOADS), [])
  );
  const [sessions, setSessions] = useState<ConversationSession[]>(() => 
    safeJSONParse(localStorage.getItem(STORAGE_KEYS.SESSIONS), [])
  );

  // Auto-save logic with safe storage
  useEffect(() => { 
    safeLocalStorageSet(STORAGE_KEYS.MEMORIES, JSON.stringify(memories)); 
  }, [memories]);
  useEffect(() => { 
    safeLocalStorageSet(STORAGE_KEYS.HISTORY, JSON.stringify(history)); 
  }, [history]);
  useEffect(() => { 
    safeLocalStorageSet(STORAGE_KEYS.PROPOSALS, JSON.stringify(proposals)); 
  }, [proposals]);
  useEffect(() => { 
    safeLocalStorageSet(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)); 
  }, [settings]);
  useEffect(() => { 
    safeLocalStorageSet(STORAGE_KEYS.MESSAGES, JSON.stringify(chatMessages)); 
  }, [chatMessages]);
  useEffect(() => { 
    safeLocalStorageSet(STORAGE_KEYS.KNOWLEDGE, JSON.stringify(knowledgeItems)); 
  }, [knowledgeItems]);
  useEffect(() => { 
    safeLocalStorageSet(STORAGE_KEYS.UPLOADS, JSON.stringify(uploadRecords)); 
  }, [uploadRecords]);
  useEffect(() => { 
    safeLocalStorageSet(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions)); 
  }, [sessions]);

  const handleClearAllData = useCallback(() => {
    localStorage.clear();
    window.location.reload();
  }, []);

  const handleAddMemory = useCallback((newMemory: Memory) => {
    setMemories(prev => [...prev, newMemory]);
    setHistory(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        changeDescription: `核心意图手动录入：${newMemory.content.slice(0, 30)}...`,
        affectedMemoryIds: [newMemory.id],
        type: 'MANUAL_OVERRIDE'
      }
    ]);
  }, []);

  const handleUpdateMemory = useCallback((id: string, updates: Partial<Memory>) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m));
  }, []);

  const handleDeleteMemory = useCallback((id: string) => {
    setMemories(prev => {
      const memoryToDelete = prev.find(m => m.id === id);
      if (!memoryToDelete) return prev;
      
      // Use functional update for history to avoid race conditions
      setHistory(h => [...h, {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        changeDescription: `人工抹除记忆：${memoryToDelete.content.slice(0, 30)}...`,
        affectedMemoryIds: [id],
        type: 'MANUAL_OVERRIDE'
      }]);
      
      return prev.filter(m => m.id !== id);
    });
  }, []);

  const handleAcceptProposal = useCallback((proposal: InsightProposal) => {
    if (!proposal.proposedMemory || !proposal.proposedMemory.content) return;

    const rawCategory = proposal.proposedMemory.category;
    const validatedCategory = Object.values(MemoryCategory).includes(rawCategory as any) 
      ? (rawCategory as MemoryCategory) 
      : MemoryCategory.GOAL;

    const rawLayer = proposal.proposedMemory.layer ?? 1;
    const validatedLayer = (rawLayer >= 0 && rawLayer <= 4) ? (rawLayer as MemoryLayer) : MemoryLayer.L1;

    setMemories(prev => {
      // Use intelligent similarity algorithm to find similar memories
      const similarMatches = findSimilarMemories(proposal, prev, 0.7);
      const existingSimilar = similarMatches.length > 0 ? similarMatches[0].memory : null;

      if (existingSimilar) {
        // Improved merge logic
        const mergedEvidence = [...new Set([...existingSimilar.evidence, ...proposal.evidenceContext])].slice(-8);
        const evidenceCount = mergedEvidence.length;
        const mergedConfidence = calculateMergedConfidence(existingSimilar, proposal, evidenceCount);
        
        // Choose better content (longer one, or one with higher confidence)
        const betterContent = proposal.confidence > existingSimilar.confidence 
          ? (proposal.proposedMemory.content || existingSimilar.content)
          : existingSimilar.content;
        
        const updatedMemory = {
          ...existingSimilar,
          content: betterContent,
          layer: Math.max(existingSimilar.layer, validatedLayer),
          evidence: mergedEvidence,
          confidence: mergedConfidence,
          updatedAt: new Date().toISOString()
        };
        
        setHistory(h => [...h, {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          changeDescription: `演进整合：${updatedMemory.content.slice(0, 25)}...`,
          affectedMemoryIds: [existingSimilar.id],
          type: 'CONSOLIDATION'
        }]);
        
        return prev.map(m => m.id === existingSimilar.id ? updatedMemory : m);
      } else {
        // New memory: use proposal confidence, or default if not available
        const newMemory: Memory = {
          id: crypto.randomUUID(),
          content: proposal.proposedMemory.content || '',
          category: validatedCategory,
          layer: validatedLayer,
          confidence: proposal.confidence || 0.8,
          evidence: proposal.evidenceContext,
          status: MemoryStatus.ACTIVE,
          isSensitive: proposal.proposedMemory.isSensitive || false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          confirmedByHuman: true,
          metadata: { sourceTrack: 'PASSIVE' }
        };
        
        setHistory(h => [...h, {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          changeDescription: `规律沉淀：${newMemory.content.slice(0, 25)}...`,
          affectedMemoryIds: [newMemory.id],
          type: 'IMPORT_SYNC'
        }]);
        
        return [...prev, newMemory];
      }
    });

    setProposals(prev => prev.map(p => p.id === proposal.id ? { ...p, status: 'ACCEPTED' } : p));
  }, []);

  const handleChatComplete = async (hist: { role: string; content: string }[]) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a52ab336-3bf8-4a2f-91ab-801e07b06386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:307',message:'handleChatComplete called',data:{histLength:hist.length,extractionInProgress:extractionInProgressRef.current,isExtracting:isExtractingInsights,activeProvider:settings.activeProvider,hasGeminiKey:!!settings.geminiApiKey,hasDeepseekKey:!!settings.deepseekKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Prevent concurrent extractions
    if (extractionInProgressRef.current || isExtractingInsights) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a52ab336-3bf8-4a2f-91ab-801e07b06386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:310',message:'Extraction blocked by race condition',data:{extractionInProgress:extractionInProgressRef.current,isExtracting:isExtractingInsights},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.warn('Extraction already in progress, skipping...');
      return;
    }
    
    extractionInProgressRef.current = true;
    setIsExtractingInsights(true);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a52ab336-3bf8-4a2f-91ab-801e07b06386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:315',message:'Starting extraction',data:{activeProvider:settings.activeProvider,geminiModel:settings.geminiModel,deepseekModel:settings.deepseekModel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    try {
      console.log('[handleChatComplete] Starting extraction', {
        historyLength: hist.length,
        provider: settings.activeProvider,
        hasApiKey: settings.activeProvider === 'GEMINI' ? !!settings.geminiApiKey : !!settings.deepseekKey
      });
      const insights = await extractInsightsFromChat(hist, settings);
      console.log('[handleChatComplete] Extraction completed', { insightsCount: insights?.length || 0 });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a52ab336-3bf8-4a2f-91ab-801e07b06386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:318',message:'extractInsightsFromChat returned',data:{insightsCount:insights?.length||0,insights:insights?.slice(0,2)||[]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a52ab336-3bf8-4a2f-91ab-801e07b06386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:319',message:'Checking insights result',data:{hasInsights:!!insights,insightsLength:insights?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      if (insights && insights.length > 0) {
        // Pre-filtering mechanism
        const filteredInsights = insights.filter((insight: any) => {
          // 1. Confidence threshold filtering
          const confidence = insight.confidence ?? 0.7;
          if (settings.qualityFilterEnabled && confidence < settings.minConfidenceThreshold) {
            return false;
          }
          
          // 2. Quality score filtering
          const qualityScore = calculateQualityScore({
            confidence,
            evidenceStrength: insight.evidenceStrength ?? 0.6,
            qualityIndicators: insight.qualityIndicators
          });
          if (settings.qualityFilterEnabled && qualityScore < 0.5) {
            return false;
          }
          
          // 3. Check if highly similar to existing memories (auto-merge)
          const similar = findSimilarMemories(
            {
              id: '',
              type: 'NEW',
              summary: insight.content,
              reasoning: insight.reasoning,
              proposedMemory: insight,
              evidenceContext: [hist[hist.length-1].content],
              status: 'PENDING',
              confidence,
              qualityScore,
              evidenceStrength: insight.evidenceStrength ?? 0.6
            },
            memories,
            settings.autoMergeThreshold
          );
          
          if (similar.length > 0 && similar[0].similarity >= settings.autoMergeThreshold) {
            // Auto-merge logic
            const existingMemory = similar[0].memory;
            const mergedEvidence = [...new Set([...existingMemory.evidence, hist[hist.length-1].content])].slice(-8);
            const evidenceCount = mergedEvidence.length;
            const mergedConfidence = calculateMergedConfidence(
              existingMemory,
              {
                id: '',
                type: 'NEW',
                summary: insight.content,
                reasoning: insight.reasoning,
                proposedMemory: insight,
                evidenceContext: [hist[hist.length-1].content],
                status: 'PENDING',
                confidence,
                qualityScore,
                evidenceStrength: insight.evidenceStrength ?? 0.6
              },
              evidenceCount
            );
            
            setMemories(prev => prev.map(m => 
              m.id === existingMemory.id 
                ? {
                    ...m,
                    confidence: mergedConfidence,
                    evidence: mergedEvidence,
                    updatedAt: new Date().toISOString()
                  }
                : m
            ));
            
            setHistory(h => [...h, {
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              changeDescription: `自动合并：${insight.content.slice(0, 25)}...`,
              affectedMemoryIds: [existingMemory.id],
              type: 'CONSOLIDATION'
            }]);
            
            return false;  // Don't add to queue
          }
          
          return true;
        });
        
        // Create proposals with all quality metrics
        const props: InsightProposal[] = filteredInsights.map((i: any) => {
          const confidence = i.confidence ?? 0.7;
          const evidenceStrength = i.evidenceStrength ?? 0.6;
          const qualityScore = calculateQualityScore({
            confidence,
            evidenceStrength,
            qualityIndicators: i.qualityIndicators
          });
          
          // Extract relevant evidence context for this specific insight
          const evidenceContext = extractEvidenceContext(i.content || '', hist, 3);
          
          // Check for similar memories (for UI display)
          const similarMatches = findSimilarMemories(
            {
              id: '',
              type: 'NEW',
              summary: i.content,
              reasoning: i.reasoning || 'No reasoning provided',
              proposedMemory: i,
              evidenceContext,
              status: 'PENDING',
              confidence,
              qualityScore,
              evidenceStrength
            },
            memories,
            0.7
          );
          
          return {
            id: crypto.randomUUID(),
            type: similarMatches.length > 0 ? 'UPDATE' : 'NEW',
            summary: i.content,
            reasoning: i.reasoning || 'No reasoning provided by AI',
            evidenceContext,
            status: 'PENDING',
            proposedMemory: { ...i },
            confidence,
            qualityScore,
            evidenceStrength,
            similarityMatches: similarMatches.map(m => ({
              memoryId: m.memory.id,
              similarity: m.similarity,
              reason: m.reason
            })),
            extractionMetadata: {
              model: settings.activeProvider === 'GEMINI' ? (settings.geminiModel || 'gemini-3-pro-preview') : settings.deepseekModel,
              timestamp: new Date().toISOString(),
              extractionMethod: 'CHAT'
            }
          };
        });
        
        setProposals(prev => {
          const existingContents = new Set(prev.filter(p => p.status === 'PENDING').map(p => p.summary));
          const newUniqueProps = props.filter(p => !existingContents.has(p.summary));
          return [...newUniqueProps, ...prev];
        });
        
        // Save conversation session
        if (hist.length > 2) { // Only save if there are actual exchanges
          const sessionId = crypto.randomUUID();
          const session: ConversationSession = {
            id: sessionId,
            title: hist.find(m => m.role === 'user')?.content.slice(0, 50) || '未命名会话',
            messages: hist,
            startedAt: new Date(Date.now() - hist.length * 60000).toISOString(), // Estimate start time
            lastMessageAt: new Date().toISOString(),
            extractedMemories: props.map(p => p.id)
          };
          setSessions(prev => [session, ...prev.slice(0, 99)]); // Keep last 100 sessions
        }
      }
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a52ab336-3bf8-4a2f-91ab-801e07b06386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:478',message:'Harvesting failed with error',data:{error: e instanceof Error ? e.message : String(e),errorStack: e instanceof Error ? e.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error("[handleChatComplete] Harvesting failed:", e);
      // Show error to user (could add a toast notification here)
      alert(`认知收割失败：${e instanceof Error ? e.message : '未知错误'}。请检查 API 配置或网络连接。`);
    } finally {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a52ab336-3bf8-4a2f-91ab-801e07b06386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:480',message:'Extraction cleanup',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setIsExtractingInsights(false);
      extractionInProgressRef.current = false;
    }
  };

  const pendingCount = proposals.filter(p => p.status === 'PENDING').length;
  const processingUploadsCount = uploadRecords.filter(u => 
    u.status === 'PENDING' && u.processingState
  ).length;

  return (
    <div className="flex h-screen w-full bg-[#050505] text-gray-200 overflow-hidden font-sans antialiased">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab as any} 
        pendingCount={pendingCount}
        processingUploadsCount={processingUploadsCount}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
        <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'chat' ? '' : 'hidden'}`}>
          <ChatInterface 
            memories={memories}
            knowledgeItems={knowledgeItems}
            messages={chatMessages}
            setMessages={setChatMessages}
            input={chatInput}
            setInput={setChatInput}
            onChatComplete={handleChatComplete}
            isExtracting={isExtractingInsights}
            mode={chatMode}
            onModeToggle={setChatMode}
            settings={settings}
          />
        </div>

        {activeTab === 'vault' && (
          <MemoryVault memories={memories} onUpdate={handleUpdateMemory} onDelete={handleDeleteMemory} />
        )}
        {activeTab === 'queue' && (
          <InsightQueue 
            proposals={proposals} 
            onAccept={handleAcceptProposal} 
            onReject={(id) => setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'REJECTED' } : p))} 
          />
        )}
        {activeTab === 'import' && (
          <ImportHub 
            settings={settings}
            existingHashes={new Set(uploadRecords.map(u => u.hash))}
            uploadRecords={uploadRecords}
            currentData={{
              memories,
              knowledge: knowledgeItems,
              sessions,
              uploads: uploadRecords,
              proposals,
              history
            }}
            onImportDataPackage={(data) => {
              setMemories(data.memories);
              setKnowledgeItems(data.knowledge);
              setSessions(data.sessions);
              setUploadRecords(data.uploads);
              setProposals(data.proposals);
              setHistory(data.history);
              alert('数据包导入成功！');
            }}
            onImport={(p) => {
              // Check for similar memories for imported proposals
              const proposalsWithSimilarity = p.map(proposal => {
                const similarMatches = findSimilarMemories(proposal, memories, 0.7);
                return {
                  ...proposal,
                  type: similarMatches.length > 0 ? 'UPDATE' : 'NEW' as const,
                  similarityMatches: similarMatches.map(m => ({
                    memoryId: m.memory.id,
                    similarity: m.similarity,
                    reason: m.reason
                  }))
                };
              });
              setProposals(prev => [...proposalsWithSimilarity, ...prev]);
              setActiveTab('queue');
            }}
            onImportKnowledge={(knowledge) => {
              setKnowledgeItems(prev => [...prev, ...knowledge]);
            }}
            onImportUpload={(upload) => {
              setUploadRecords(prev => {
                const existing = prev.find(u => u.id === upload.id);
                if (existing) {
                  return prev.map(u => u.id === upload.id ? upload : u);
                }
                return [...prev, upload];
              });
              // Force re-render to update processing state
            }}
          />
        )}
        {activeTab === 'knowledge' && (
          <KnowledgeBase
            knowledgeItems={knowledgeItems}
            onUpdate={(id, updates) => {
              setKnowledgeItems(prev => prev.map(k => k.id === id ? { ...k, ...updates, updatedAt: new Date().toISOString() } : k));
            }}
            onDelete={(id) => {
              setKnowledgeItems(prev => prev.filter(k => k.id !== id));
            }}
            onArchive={(id) => {
              setKnowledgeItems(prev => prev.map(k => k.id === id ? { ...k, status: 'ARCHIVED', updatedAt: new Date().toISOString() } : k));
            }}
          />
        )}
        {activeTab === 'uploads' && (
          <UploadHistory
            uploadRecords={uploadRecords}
            onDelete={(id) => {
              setUploadRecords(prev => prev.filter(u => u.id !== id));
            }}
          />
        )}
        {activeTab === 'sessions' && (
          <SessionArchive
            sessions={sessions}
            onDelete={(id) => {
              setSessions(prev => prev.filter(s => s.id !== id));
            }}
            onView={(session) => {
              // View session in chat interface
              setChatMessages(session.messages);
              setActiveTab('chat');
            }}
          />
        )}
        {activeTab === 'intents' && (
          <IntentCenter onAddIntent={(memo) => {
            const m: Memory = {
              id: crypto.randomUUID(),
              content: memo.content || '',
              category: memo.category || MemoryCategory.GOAL,
              layer: MemoryLayer.L4,
              status: MemoryStatus.ACTIVE,
              confirmedByHuman: true,
              confidence: 1.0,
              isSensitive: !!memo.isSensitive,
              evidence: ['核心契约手动录入'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: { sourceTrack: 'ACTIVE' }
            };
            handleAddMemory(m);
          }} />
        )}
        {activeTab === 'evolution' && (
          <EvolutionTimeline records={history} />
        )}
        {activeTab === 'export' && (
          <ExportCenter 
            memories={memories}
            knowledge={knowledgeItems}
            sessions={sessions}
            uploads={uploadRecords}
            proposals={proposals}
            history={history}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsCenter 
            settings={settings} 
            onUpdate={(u) => setSettings(s => ({ ...s, ...u }))} 
            onClearData={handleClearAllData} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
