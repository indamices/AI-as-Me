
import React, { useState, useCallback, useEffect } from 'react';
import { 
  Memory, MemoryCategory, MemoryLayer, MemoryStatus, 
  InsightProposal, EvolutionRecord, AppSettings, ChatMode 
} from './types';
import Sidebar from './components/Sidebar';
import MemoryVault from './components/MemoryVault';
import InsightQueue from './components/InsightQueue';
import IntentCenter from './components/IntentCenter';
import EvolutionTimeline from './components/EvolutionTimeline';
import ChatInterface from './components/ChatInterface';
import ImportHub from './components/ImportHub';
import ExportCenter from './components/ExportCenter';
import SettingsCenter from './components/SettingsCenter';
import { extractInsightsFromChat } from './geminiService';
import { findSimilarMemories, calculateQualityScore, calculateMergedConfidence } from './memoryUtils';

const STORAGE_KEYS = {
  MEMORIES: 'pe_memories',
  HISTORY: 'pe_history',
  PROPOSALS: 'pe_proposals',
  SETTINGS: 'pe_settings',
  MESSAGES: 'pe_messages'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vault' | 'queue' | 'intents' | 'evolution' | 'chat' | 'import' | 'export' | 'settings'>('chat');
  
  // Initialize and load from localStorage
  const [memories, setMemories] = useState<Memory[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.MEMORIES) || '[]'));
  const [history, setHistory] = useState<EvolutionRecord[]>(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]'));
  const [proposals, setProposals] = useState<InsightProposal[]>(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROPOSALS) || '[]');
    // Ensure old data has new fields
    return saved.map((p: any) => ({
      ...p,
      confidence: p.confidence ?? 0.7,
      qualityScore: p.qualityScore ?? 0.6,
      evidenceStrength: p.evidenceStrength ?? 0.6,
      similarityMatches: p.similarityMatches || [],
      extractionMetadata: p.extractionMetadata || undefined
    }));
  });
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return saved ? JSON.parse(saved) : [{ role: 'assistant', content: "认知核已挂载。正在执行人格多维扫描协议。我们可以从任何维度开始，我也将尝试探测你的认知边界。" }];
  });
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const defaultSettings = {
      deepseekKey: '',
      activeProvider: 'GEMINI' as const,
      deepseekModel: 'deepseek-chat',
      minConfidenceThreshold: 0.6,
      autoMergeThreshold: 0.85,
      qualityFilterEnabled: true
    };
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure new fields exist
      return { ...defaultSettings, ...parsed };
    }
    return defaultSettings;
  });

  const [chatMode, setChatMode] = useState<ChatMode>('PROBE');
  const [isExtractingInsights, setIsExtractingInsights] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // Auto-save logic
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(memories)); }, [memories]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PROPOSALS, JSON.stringify(proposals)); }, [proposals]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(chatMessages)); }, [chatMessages]);

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
    if (isExtractingInsights) return;
    setIsExtractingInsights(true);
    try {
      const insights = await extractInsightsFromChat(hist, settings);
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
          
          // Check for similar memories (for UI display)
          const similarMatches = findSimilarMemories(
            {
              id: '',
              type: 'NEW',
              summary: i.content,
              reasoning: i.reasoning,
              proposedMemory: i,
              evidenceContext: [hist[hist.length-1].content],
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
            reasoning: i.reasoning,
            evidenceContext: [hist[hist.length-1].content],
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
              model: settings.activeProvider === 'GEMINI' ? 'gemini-3-pro-preview' : settings.deepseekModel,
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
      }
    } catch (e) {
      console.error("Harvesting failed:", e);
    } finally {
      setIsExtractingInsights(false);
    }
  };

  const pendingCount = proposals.filter(p => p.status === 'PENDING').length;

  return (
    <div className="flex h-screen w-full bg-[#050505] text-gray-200 overflow-hidden font-sans antialiased">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab as any} 
        pendingCount={pendingCount} 
      />
      
      <main className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
        <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'chat' ? '' : 'hidden'}`}>
          <ChatInterface 
            memories={memories} 
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
          <ImportHub onImport={(p) => {
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
          }} />
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
          <ExportCenter memories={memories} />
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
