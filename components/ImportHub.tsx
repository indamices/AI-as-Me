
import React, { useState, useRef } from 'react';
import { parseImaConversationsBatch, extractKnowledgeFromText } from '../geminiService';
import { InsightProposal, AppSettings, ExtractionMode, KnowledgeItem } from '../types';
import { calculateQualityScore, findSimilarMemories } from '../memoryUtils';
import { calculateContentHash } from '../knowledgeUtils';

interface ImportHubProps {
  onImport: (proposals: InsightProposal[]) => void;
  onImportKnowledge?: (knowledge: KnowledgeItem[]) => void;
  onImportUpload?: (upload: any) => void;
  settings?: AppSettings;
  existingHashes?: Set<string>;
}

const ImportHub: React.FC<ImportHubProps> = ({ 
  onImport, 
  onImportKnowledge,
  onImportUpload,
  settings,
  existingHashes = new Set()
}) => {
  const [inputText, setInputText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState(0);
  const [extractionMode, setExtractionMode] = useState<ExtractionMode>('MIXED');
  const [uploadedFilename, setUploadedFilename] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    "初始化认知扫描引擎...",
    "正在通过语义层解析对话记录...",
    "提取高置信度认知碎片...",
    "Gemini 正在合成稳定 Memo...",
    "完成元数据标记与分类..."
  ];

  const handleProcessText = async () => {
    if (!inputText.trim() || !settings) {
      setErrorMessage('请输入内容或检查设置配置');
      return;
    }
    
    setIsSyncing(true);
    setErrorMessage(null);
    setSyncStep(0);
    
    let contentHash: string = '';
    let uploadRecord: any = null;
    
    try {
      // Check for duplicate content
      try {
        contentHash = await calculateContentHash(inputText);
        if (existingHashes.has(contentHash)) {
          setErrorMessage('检测到重复内容，已跳过处理。');
          setIsSyncing(false);
          return;
        }
      } catch (err) {
        throw new Error('内容哈希计算失败，请重试');
      }

      // Create upload record
      uploadRecord = {
        id: crypto.randomUUID(),
        filename: uploadedFilename || '手动输入',
        content: inputText,
        hash: contentHash,
        uploadedAt: new Date().toISOString(),
        status: 'PENDING' as const,
        extractedMemories: [] as string[],
        extractedKnowledge: [] as string[]
      };
      if (onImportUpload) {
        onImportUpload(uploadRecord);
      }

      // Simulate processing steps
      for (let i = 0; i < steps.length; i++) {
        setSyncStep(i);
        await new Promise(r => setTimeout(r, 1000));
      }

      const proposals: InsightProposal[] = [];
      const knowledgeItems: KnowledgeItem[] = [];

      // Validate settings before extraction
      if (!settings) {
        throw new Error('设置未配置');
      }
      if (settings.activeProvider === 'GEMINI' && !settings.geminiApiKey) {
        throw new Error('Gemini API Key 未配置，请在设置页面配置');
      }
      if (settings.activeProvider === 'DEEPSEEK' && !settings.deepseekKey) {
        throw new Error('DeepSeek API Key 未配置，请在设置页面配置');
      }

      console.log('[ImportHub] Starting extraction', {
        mode: extractionMode,
        provider: settings.activeProvider,
        hasApiKey: settings.activeProvider === 'GEMINI' ? !!settings.geminiApiKey : !!settings.deepseekKey
      });

      // Extract based on mode
      if (extractionMode === 'PERSONA' || extractionMode === 'MIXED') {
        console.log('[ImportHub] Starting persona extraction...');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a52ab336-3bf8-4a2f-91ab-801e07b06386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ImportHub.tsx:97',message:'Starting parseImaConversationsBatch',data:{extractionMode,textLength:inputText.length,activeProvider:settings?.activeProvider,hasGeminiKey:!!settings?.geminiApiKey,hasDeepseekKey:!!settings?.deepseekKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        const results = await parseImaConversationsBatch(inputText, settings);
        console.log('[ImportHub] Persona extraction completed', { resultsCount: results?.length || 0 });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a52ab336-3bf8-4a2f-91ab-801e07b06386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ImportHub.tsx:90',message:'parseImaConversationsBatch completed',data:{resultsCount:results?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        const newProposals = results.map((r: any) => {
          const confidence = r.confidence ?? 0.7;
          const evidenceStrength = r.evidenceStrength ?? 0.6;
          const qualityScore = calculateQualityScore({
            confidence,
            evidenceStrength,
            qualityIndicators: r.qualityIndicators
          });
          
          const evidenceSnippets = inputText
            .split('\n')
            .filter(line => {
              const contentLower = (r.content || '').toLowerCase();
              const lineLower = line.toLowerCase();
              return contentLower.split(/\s+/).some(word => 
                word.length > 2 && lineLower.includes(word)
              );
            })
            .slice(0, 3)
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          const evidenceContext = evidenceSnippets.length > 0 
            ? evidenceSnippets 
            : [inputText.slice(0, 100) + (inputText.length > 100 ? '...' : '')];
          
          return {
            id: crypto.randomUUID(),
            type: 'NEW' as const,
            summary: r.content,
            reasoning: r.reasoning || 'No reasoning provided by AI',
            evidenceContext,
            status: 'PENDING' as const,
            proposedMemory: { ...r },
            confidence,
            qualityScore,
            evidenceStrength,
            extractionMetadata: {
              model: settings?.geminiModel || 'gemini-3-pro-preview',
              timestamp: new Date().toISOString(),
              extractionMethod: 'BATCH_IMPORT' as const
            }
          };
        });
        proposals.push(...newProposals);
      }

      if (extractionMode === 'KNOWLEDGE' || extractionMode === 'MIXED') {
        console.log('[ImportHub] Starting knowledge extraction...');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a52ab336-3bf8-4a2f-91ab-801e07b06386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ImportHub.tsx:138',message:'Starting extractKnowledgeFromText',data:{extractionMode,textLength:inputText.length,activeProvider:settings?.activeProvider,hasGeminiKey:!!settings?.geminiApiKey,hasDeepseekKey:!!settings?.deepseekKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        const knowledgeResults = await extractKnowledgeFromText(inputText, settings);
        console.log('[ImportHub] Knowledge extraction completed', { resultsCount: knowledgeResults?.length || 0 });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a52ab336-3bf8-4a2f-91ab-801e07b06386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ImportHub.tsx:139',message:'extractKnowledgeFromText completed',data:{knowledgeResultsCount:knowledgeResults?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        const newKnowledge = knowledgeResults.map((k: any) => ({
          id: crypto.randomUUID(),
          title: k.title,
          content: k.content,
          type: k.type,
          tags: k.tags || [],
          source: {
            type: uploadedFilename ? 'UPLOAD' as const : 'MANUAL' as const,
            filename: uploadedFilename || undefined,
            uploadDate: new Date().toISOString()
          },
          hash: contentHash,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'ACTIVE' as const
        }));
        knowledgeItems.push(...newKnowledge);
      }

      // Update upload record
      if (onImportUpload) {
        onImportUpload({
          ...uploadRecord,
          status: 'PROCESSED',
          processedAt: new Date().toISOString(),
          extractedMemories: proposals.map(p => p.id),
          extractedKnowledge: knowledgeItems.map(k => k.id)
        });
      }

      console.log('[ImportHub] Extraction completed', {
        proposalsCount: proposals.length,
        knowledgeCount: knowledgeItems.length
      });

      if (proposals.length > 0) {
        onImport(proposals);
      }
      if (knowledgeItems.length > 0 && onImportKnowledge) {
        onImportKnowledge(knowledgeItems);
      }

      setIsSyncing(false);
      setInputText('');
      setUploadedFilename('');
      setErrorMessage(null);
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a52ab336-3bf8-4a2f-91ab-801e07b06386',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ImportHub.tsx:193',message:'Extraction failed with error',data:{error: error instanceof Error ? error.message : String(error),errorStack: error instanceof Error ? error.stack : undefined,errorName: error instanceof Error ? error.name : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('[ImportHub] Extraction failed:', error);
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      const errorDetails = error instanceof Error && error.stack ? `\n详情: ${error.stack.split('\n')[0]}` : '';
      setErrorMessage(`提取失败：${errorMsg}${errorDetails}。请检查 API 配置或网络连接。`);
      if (onImportUpload && uploadRecord) {
        onImportUpload({
          ...uploadRecord,
          status: 'FAILED',
          error: errorMsg
        });
      }
      setIsSyncing(false);
      setSyncStep(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFilename(file.name);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        setInputText(text);
        
        // Check for duplicate
        const hash = await calculateContentHash(text);
        if (existingHashes.has(hash)) {
          alert('检测到重复文件，已跳过加载。');
          setInputText('');
          setUploadedFilename('');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black/40">
      <header className="mb-12 max-w-2xl">
        <h2 className="text-3xl font-bold mb-4">数据导入中心</h2>
        <p className="text-gray-400 text-lg">将已有的对话历史或文件导入人格引擎，我们会通过 AI 提取并生成可治理的认知记忆条目。</p>
      </header>

      {errorMessage && (
        <div className="max-w-4xl mb-6 p-4 bg-red-600/20 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>{errorMessage}</span>
          <button 
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {!isSyncing ? (
        <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
          {/* 文件上传区 */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group glass-panel p-10 rounded-3xl border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload}
              accept=".txt,.json,.md"
            />
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-cloud-arrow-up text-3xl text-blue-500"></i>
            </div>
            <h3 className="text-xl font-bold mb-2">上传对话存档</h3>
            <p className="text-gray-500 text-sm">支持 .txt, .md, .json 格式。直接从 ima 或其他聊天工具导出的记录。</p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#050505] px-4 text-gray-600 font-bold tracking-widest">或者 直接粘贴文本</span>
            </div>
          </div>

          {/* Extraction Mode Selection */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
            <div className="mb-6">
              <label className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                提取模式
              </label>
              <div className="grid grid-cols-3 gap-4">
                {(['PERSONA', 'KNOWLEDGE', 'MIXED'] as ExtractionMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setExtractionMode(mode)}
                    className={`p-4 rounded-xl border transition-all ${
                      extractionMode === mode
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                        : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold mb-1">
                      {mode === 'PERSONA' ? '个人特质' : mode === 'KNOWLEDGE' ? '知识提取' : '混合模式'}
                    </div>
                    <div className="text-xs">
                      {mode === 'PERSONA' ? '仅提取个人特质记忆' : 
                       mode === 'KNOWLEDGE' ? '仅提取知识/上下文' : 
                       '同时提取特质和知识'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 文本粘贴区 */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="在此粘贴对话内容... (例如 ima 的分享记录或 Gemini 对话副本)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-lg min-h-[300px] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-mono"
            />
            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleProcessText}
                disabled={!inputText.trim()}
                className={`px-12 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl flex items-center gap-3 ${
                  inputText.trim() 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-[0.98]' 
                  : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                }`}
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                开始分析提取
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl flex flex-col items-center justify-center py-24 animate-in fade-in zoom-in duration-500 mx-auto">
          <div className="relative mb-12">
            <div className="w-40 h-40 rounded-full border-4 border-blue-500/10 border-t-blue-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <i className="fa-solid fa-brain text-4xl text-blue-400 animate-pulse"></i>
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-4">正在进行认知提取...</h3>
          <p className="text-blue-400 font-mono text-lg mb-10 h-8">{steps[syncStep]}</p>
          
          <div className="w-full max-w-lg bg-white/5 h-2 rounded-full overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(37,99,235,0.5)]" 
              style={{ width: `${((syncStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportHub;
