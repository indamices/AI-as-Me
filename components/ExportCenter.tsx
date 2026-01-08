
import React, { useState } from 'react';
import { Memory } from '../types';

interface ExportCenterProps {
  memories: Memory[];
}

const ExportCenter: React.FC<ExportCenterProps> = ({ memories }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [lastPackage, setLastPackage] = useState<{ name: string; content: string } | null>(null);

  const activeMemories = memories.filter(m => m.status === 'ACTIVE');

  // 生成系统提示词
  const generatedPrompt = `你现在是我的个人数字孪生助理。基于我最新的记忆库，请在对话中遵循以下原则：
${activeMemories.map(m => `- [${m.category}] ${m.content}`).join('\n')}

请确保：
1. 优先阅读沟通偏好。
2. 对于人物关系，严格遵循已记录的条目。
3. 若请求冲突，请礼貌指出并询问是否更新档案。`;

  // 生成导出的文件内容 (Markdown 格式)
  const generateFileContent = () => {
    let content = `# 人格引擎个人记忆档案\n`;
    content += `生成时间: ${new Date().toLocaleString()}\n`;
    content += `活跃条目数: ${activeMemories.length}\n\n`;
    
    content += `## 1. 系统指令 (System Prompt)\n\n\`\`\`text\n${generatedPrompt}\n\`\`\`\n\n`;
    
    content += `## 2. 详细记忆库 (Active Memos)\n\n`;
    activeMemories.forEach(m => {
      content += `### [${m.category}] ${m.content}\n`;
      content += `- 稳定性: L${m.layer}\n`;
      content += `- 置信度: ${Math.round(m.confidence * 100)}%\n`;
      content += `- 更新时间: ${m.updatedAt}\n\n`;
    });
    
    return content;
  };

  const handleGeneratePackage = () => {
    setIsExporting(true);
    // 模拟构建过程
    setTimeout(() => {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `PersonaMemory_${timestamp}_Snapshot.md`;
      const content = generateFileContent();
      
      setLastPackage({ name: filename, content: content });
      setIsExporting(false);
    }, 1500);
  };

  const triggerDownload = () => {
    if (!lastPackage) return;
    
    const blob = new Blob([lastPackage.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = lastPackage.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    alert('系统提示词已复制到剪贴板');
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black/40">
      <header className="mb-12 max-w-2xl">
        <h2 className="text-3xl font-bold mb-4">导出引擎</h2>
        <p className="text-gray-400 text-lg">将你经过审核的认知状态打包导出，以便在 Gemini、ima 等外部 AI 产品中作为背景知识库调用。</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-10 max-w-6xl">
        <div className="space-y-8">
          {/* 记忆档案导出 */}
          <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6">
              <i className="fa-solid fa-shield-heart text-5xl text-blue-500/10"></i>
            </div>
            <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
              <i className="fa-solid fa-box-archive text-blue-500"></i>
              全量记忆快照
            </h3>
            
            <div className="space-y-4 mb-8">
               <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-sm text-gray-400">当前活跃 Memo 总数</span>
                  <span className="font-mono font-bold text-blue-400 text-lg">{activeMemories.length}</span>
               </div>
               <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-sm text-gray-400">元数据完整度</span>
                  <span className="font-mono font-bold text-green-400 text-lg">94%</span>
               </div>
            </div>

            <button 
              onClick={handleGeneratePackage}
              disabled={isExporting}
              className={`w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
                isExporting 
                ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-[0.98]'
              }`}
            >
              {isExporting ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  正在构建知识档案...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-bolt"></i>
                  生成导出数据包 (.md)
                </>
              )}
            </button>
            {lastPackage && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <i className="fa-solid fa-file-lines text-green-400"></i>
                  <span className="text-xs font-mono text-green-400 truncate">{lastPackage.name}</span>
                </div>
                <button 
                  onClick={triggerDownload}
                  className="text-xs font-bold text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-500 transition-all shrink-0 ml-2"
                >
                  下载文件
                </button>
              </div>
            )}
          </div>

          {/* 系统提示词预览 */}
          <div className="glass-panel p-8 rounded-3xl border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-xl flex items-center gap-3">
                <i className="fa-solid fa-comment-dots text-purple-400"></i>
                系统提示词 (System Prompt)
              </h3>
              <button 
                onClick={() => setShowPrompt(!showPrompt)}
                className="text-xs font-bold text-blue-400 hover:underline"
              >
                {showPrompt ? '隐藏预览' : '显示预览'}
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              一段经过优化的 Prompt，包含了你最新的目标、偏好和边界。将其复制到新对话中，让 AI 立刻进入角色。
            </p>

            {showPrompt && (
              <div className="bg-black/50 rounded-2xl p-5 border border-white/10 mb-6">
                <pre className="text-[11px] text-gray-400 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {generatedPrompt}
                </pre>
              </div>
            )}

            <button 
              onClick={copyToClipboard}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-3"
            >
              <i className="fa-solid fa-copy"></i>
              复制提示词到剪贴板
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-8 bg-blue-600/5 rounded-[2.5rem] border border-blue-500/10">
            <h4 className="font-bold text-sm mb-6 uppercase text-gray-500 tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-circle-info text-blue-500"></i>
              导出包内容详情
            </h4>
            <div className="space-y-6">
               <div className="flex gap-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center shrink-0">
                    <i className="fa-brands fa-markdown text-blue-400"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-200">persona_summary.md</p>
                    <p className="text-xs text-gray-500 leading-relaxed">人类可读的汇总。包含沟通偏好、核心价值观和近期项目的结构化概述。</p>
                  </div>
               </div>
               <div className="flex gap-5">
                  <div className="w-10 h-10 rounded-xl bg-green-400/10 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-terminal text-green-400"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-200">system_instructions.txt</p>
                    <p className="text-xs text-gray-500 leading-relaxed">AI 优化指令。告诉新模型如何根据你的记忆库进行决策与协助。</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5">
             <h4 className="font-bold text-sm mb-4 text-gray-300">使用建议</h4>
             <ul className="space-y-3">
                <li className="text-xs text-gray-500 flex gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  定期导出快照作为个人认知备份。
                </li>
                <li className="text-xs text-gray-500 flex gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  当外部助理的表现开始偏离你的偏好时，重新导入提示词。
                </li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportCenter;
