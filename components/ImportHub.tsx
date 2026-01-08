
import React, { useState, useRef } from 'react';
import { parseImaConversationsBatch } from '../geminiService';
import { InsightProposal } from '../types';
import { calculateQualityScore, findSimilarMemories } from '../memoryUtils';

interface ImportHubProps {
  onImport: (proposals: InsightProposal[]) => void;
}

const ImportHub: React.FC<ImportHubProps> = ({ onImport }) => {
  const [inputText, setInputText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    "初始化认知扫描引擎...",
    "正在通过语义层解析对话记录...",
    "提取高置信度认知碎片...",
    "Gemini 正在合成稳定 Memo...",
    "完成元数据标记与分类..."
  ];

  const handleProcessText = async () => {
    if (!inputText.trim()) return;
    setIsSyncing(true);
    
    // 模拟处理步骤
    for (let i = 0; i < steps.length; i++) {
      setSyncStep(i);
      await new Promise(r => setTimeout(r, 1000));
    }

    const results = await parseImaConversationsBatch(inputText);
    
    const proposals: InsightProposal[] = results.map((r: any) => {
      const confidence = r.confidence ?? 0.7;
      const evidenceStrength = r.evidenceStrength ?? 0.6;
      const qualityScore = calculateQualityScore({
        confidence,
        evidenceStrength,
        qualityIndicators: r.qualityIndicators
      });
      
      return {
        id: crypto.randomUUID(),
        type: 'NEW',
        summary: r.content,
        reasoning: r.reasoning,
        evidenceContext: ["手动导入数据: " + inputText.slice(0, 50) + "..."],
        status: 'PENDING',
        proposedMemory: { ...r },
        confidence,
        qualityScore,
        evidenceStrength,
        extractionMetadata: {
          model: 'gemini-3-pro-preview',
          timestamp: new Date().toISOString(),
          extractionMethod: 'BATCH_IMPORT'
        }
      };
    });

    onImport(proposals);
    setIsSyncing(false);
    setInputText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setInputText(text);
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
