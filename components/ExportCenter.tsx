import React, { useState, useMemo } from 'react';
import { 
  Memory, 
  KnowledgeItem, 
  ConversationSession, 
  UploadRecord, 
  InsightProposal, 
  EvolutionRecord,
  MemoryStatus 
} from '../types';
import { exportData, downloadBlob, getEstimatedSize, ExportOptions } from '../utils/exportUtils';

interface ExportCenterProps {
  memories: Memory[];
  knowledge: KnowledgeItem[];
  sessions: ConversationSession[];
  uploads: UploadRecord[];
  proposals: InsightProposal[];
  history: EvolutionRecord[];
}

const ExportCenter: React.FC<ExportCenterProps> = ({
  memories,
  knowledge,
  sessions,
  uploads,
  proposals,
  history
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeArchived: true,
    includeRejected: true,
    compress: false,
    dataTypes: ['memories', 'knowledge', 'sessions', 'uploads', 'proposals', 'history']
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const activeMemories = memories.filter(m => m.status === MemoryStatus.ACTIVE);
    const archivedMemories = memories.filter(m => m.status === MemoryStatus.ARCHIVED);
    const rejectedProposals = proposals.filter(p => p.status === 'REJECTED');
    
    return {
      memories: {
        total: memories.length,
        active: activeMemories.length,
        archived: archivedMemories.length
      },
      knowledge: {
        total: knowledge.length,
        active: knowledge.filter(k => k.status === 'ACTIVE').length,
        archived: knowledge.filter(k => k.status === 'ARCHIVED').length
      },
      sessions: sessions.length,
      uploads: uploads.length,
      proposals: {
        total: proposals.length,
        pending: proposals.filter(p => p.status === 'PENDING').length,
        rejected: rejectedProposals.length
      },
      history: history.length,
      estimatedSize: getEstimatedSize({ memories, knowledge, sessions, uploads, proposals, history }, exportOptions)
    };
  }, [memories, knowledge, sessions, uploads, proposals, history, exportOptions]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportData(
        { memories, knowledge, sessions, uploads, proposals, history },
        exportOptions
      );
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `PersonaEngine_Export_${timestamp}.json`;
      downloadBlob(blob, filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`导出失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleDataType = (type: ExportOptions['dataTypes'][number]) => {
    setExportOptions(prev => {
      const currentTypes = prev.dataTypes || [];
      if (currentTypes.includes(type)) {
        return { ...prev, dataTypes: currentTypes.filter(t => t !== type) };
      } else {
        return { ...prev, dataTypes: [...currentTypes, type] };
      }
    });
  };

  const hasSelectedDataTypes = (exportOptions.dataTypes?.length || 0) > 0;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black/40">
      <header className="mb-12 max-w-2xl">
        <h2 className="text-3xl font-bold mb-4">数据导出中心</h2>
        <p className="text-gray-400 text-lg">将你的所有数据打包导出，用于备份、迁移或恢复。导出文件包含记忆、知识库、会话记录等完整数据。</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-10 max-w-6xl">
        <div className="space-y-8">
          {/* 数据统计 */}
          <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
              <i className="fa-solid fa-chart-bar text-blue-500"></i>
              数据统计
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-sm text-gray-400">记忆</span>
                <span className="font-mono font-bold text-blue-400 text-lg">
                  {stats.memories.total} 条
                  {stats.memories.archived > 0 && (
                    <span className="text-gray-500 text-sm ml-2">({stats.memories.active} 活跃, {stats.memories.archived} 已归档)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-sm text-gray-400">知识库</span>
                <span className="font-mono font-bold text-green-400 text-lg">
                  {stats.knowledge.total} 条
                  {stats.knowledge.archived > 0 && (
                    <span className="text-gray-500 text-sm ml-2">({stats.knowledge.active} 活跃, {stats.knowledge.archived} 已归档)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-sm text-gray-400">会话记录</span>
                <span className="font-mono font-bold text-purple-400 text-lg">{stats.sessions} 个</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-sm text-gray-400">上传历史</span>
                <span className="font-mono font-bold text-cyan-400 text-lg">{stats.uploads} 条</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-sm text-gray-400">提案</span>
                <span className="font-mono font-bold text-yellow-400 text-lg">
                  {stats.proposals.total} 条
                  {stats.proposals.rejected > 0 && (
                    <span className="text-gray-500 text-sm ml-2">({stats.proposals.pending} 待处理, {stats.proposals.rejected} 已拒绝)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-sm text-gray-400">演进记录</span>
                <span className="font-mono font-bold text-pink-400 text-lg">{stats.history} 条</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20">
                <span className="text-sm font-bold text-blue-400">预计大小</span>
                <span className="font-mono font-bold text-blue-400 text-lg">{stats.estimatedSize}</span>
              </div>
            </div>
          </div>

          {/* 导出选项 */}
          <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
            <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
              <i className="fa-solid fa-gear text-purple-500"></i>
              导出选项
            </h3>
            
            <div className="space-y-4 mb-6">
              <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="checkbox"
                  checked={exportOptions.includeArchived}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeArchived: e.target.checked }))}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">包含已归档数据</span>
              </label>
              <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="checkbox"
                  checked={exportOptions.includeRejected}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeRejected: e.target.checked }))}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">包含已拒绝提案</span>
              </label>
              <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                <input
                  type="checkbox"
                  checked={exportOptions.compress}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, compress: e.target.checked }))}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">压缩导出（推荐，适用于大文件）</span>
              </label>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">导出范围</h4>
              <div className="space-y-2">
                {(['memories', 'knowledge', 'sessions', 'uploads', 'proposals', 'history'] as const).map(type => {
                  const labels: Record<typeof type, string> = {
                    memories: '记忆 (Memories)',
                    knowledge: '知识库 (Knowledge)',
                    sessions: '会话记录 (Sessions)',
                    uploads: '上传历史 (Uploads)',
                    proposals: '提案 (Proposals)',
                    history: '演进记录 (History)'
                  };
                  return (
                    <label key={type} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                      <input
                        type="checkbox"
                        checked={exportOptions.dataTypes?.includes(type) || false}
                        onChange={() => toggleDataType(type)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300">{labels[type]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={handleExport}
              disabled={isExporting || !hasSelectedDataTypes}
              className={`w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
                isExporting || !hasSelectedDataTypes
                ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-[0.98]'
              }`}
            >
              {isExporting ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  正在导出...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-download"></i>
                  导出数据包
                </>
              )}
            </button>
            {!hasSelectedDataTypes && (
              <p className="text-xs text-red-400 mt-2 text-center">请至少选择一种数据类型</p>
            )}
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
                  <i className="fa-solid fa-file-code text-blue-400"></i>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-200">JSON 格式数据包</p>
                  <p className="text-xs text-gray-500 leading-relaxed">包含所有数据的完整 JSON 结构，包含元数据、校验和和版本信息。</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="w-10 h-10 rounded-xl bg-green-400/10 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-shield-halved text-green-400"></i>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-200">数据完整性</p>
                  <p className="text-xs text-gray-500 leading-relaxed">包含 SHA-256 校验和，确保数据未被篡改。导入时会自动验证。</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-key text-purple-400"></i>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-200">隐私保护</p>
                  <p className="text-xs text-gray-500 leading-relaxed">导出文件不包含 API 密钥等敏感信息。请妥善保管导出文件。</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5">
            <h4 className="font-bold text-sm mb-4 text-gray-300">使用建议</h4>
            <ul className="space-y-3">
              <li className="text-xs text-gray-500 flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                定期导出快照作为个人数据备份。
              </li>
              <li className="text-xs text-gray-500 flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                导出文件包含所有个人数据，请妥善保管，不要分享给他人。
              </li>
              <li className="text-xs text-gray-500 flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                大文件（&gt;5MB）建议启用压缩选项以减少文件大小。
              </li>
              <li className="text-xs text-gray-500 flex gap-2">
                <span className="text-blue-500 font-bold">•</span>
                导出文件可以在其他设备或新安装的应用中导入恢复数据。
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportCenter;
