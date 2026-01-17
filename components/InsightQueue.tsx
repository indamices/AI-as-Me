
import React, { useMemo, useCallback, useState } from 'react';
import { InsightProposal, MemoryCategory } from '../types';
import { CATEGORY_METADATA } from '../constants';

interface InsightQueueProps {
  proposals: InsightProposal[];
  onAccept: (proposal: InsightProposal) => void;
  onReject: (id: string) => void;
  onBatchAccept?: (ids: string[]) => void;
  onBatchReject?: (ids: string[]) => void;
}

const InsightQueue: React.FC<InsightQueueProps> = ({ 
  proposals, 
  onAccept, 
  onReject,
  onBatchAccept,
  onBatchReject
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterConfidence, setFilterConfidence] = useState<number | null>(null);
  
  // Memoize filtered proposals and counts
  const pending = useMemo(() => {
    let filtered = proposals.filter(p => p.status === 'PENDING');
    
    // Filter by confidence threshold if set
    if (filterConfidence !== null) {
      filtered = filtered.filter(p => (p.confidence || 0.7) >= filterConfidence);
    }
    
    return filtered;
  }, [proposals, filterConfidence]);
  
  const rejectedCount = useMemo(() => 
    proposals.filter(p => p.status === 'REJECTED').length,
    [proposals]
  );
  
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === pending.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pending.map(p => p.id)));
    }
  }, [pending, selectedIds.size]);
  
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  const handleBatchAccept = useCallback(() => {
    if (onBatchAccept && selectedIds.size > 0) {
      onBatchAccept(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [selectedIds, onBatchAccept]);
  
  const handleBatchReject = useCallback(() => {
    if (onBatchReject && selectedIds.size > 0) {
      onBatchReject(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [selectedIds, onBatchReject]);

  // Improved type safety for category metadata
  const getCategoryMeta = useCallback((cat: MemoryCategory | string | undefined) => {
    if (cat && cat in CATEGORY_METADATA) {
      return CATEGORY_METADATA[cat as MemoryCategory];
    }
    return CATEGORY_METADATA[MemoryCategory.GOAL];
  }, []);

  const allSelected = pending.length > 0 && selectedIds.size === pending.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < pending.length;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black/40">
      <header className="mb-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">治理队列</h2>
            <p className="text-gray-400">审核并授权从原始数据中提取出的潜在认知更新。</p>
          </div>
          <div className="text-xs font-mono text-gray-600 bg-white/5 px-3 py-1 rounded-full border border-white/5">
            已拒绝记录: {rejectedCount}
          </div>
        </div>
        
        {/* Batch Operations Bar */}
        {pending.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-bold"
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                />
                <span>{allSelected ? '取消全选' : '全选'}</span>
                {selectedIds.size > 0 && (
                  <span className="text-blue-400">({selectedIds.size}/{pending.length})</span>
                )}
              </button>
              
              <select
                value={filterConfidence === null ? '' : filterConfidence.toString()}
                onChange={(e) => setFilterConfidence(e.target.value ? parseFloat(e.target.value) : null)}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="">全部置信度</option>
                <option value="0.9">高置信度 (≥90%)</option>
                <option value="0.8">中高置信度 (≥80%)</option>
                <option value="0.7">中等置信度 (≥70%)</option>
                <option value="0.6">低置信度 (≥60%)</option>
              </select>
            </div>
            
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBatchReject}
                  className="px-6 py-2 rounded-lg border border-red-500/30 text-red-500/80 text-sm font-bold hover:bg-red-500/10 transition-all"
                >
                  批量拒绝 ({selectedIds.size})
                </button>
                <button
                  onClick={handleBatchAccept}
                  className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-check-double"></i>
                  批量通过 ({selectedIds.size})
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="space-y-6 max-w-4xl">
        {pending.map(proposal => {
          const isSelected = selectedIds.has(proposal.id);
          const meta = getCategoryMeta(proposal.proposedMemory.category);
          return (
            <div 
              key={proposal.id} 
              className={`glass-panel rounded-3xl p-8 border-l-4 ${isSelected ? 'border-l-green-500 bg-green-500/5' : 'border-l-blue-500'} animate-in fade-in slide-in-from-left duration-300 shadow-2xl transition-all`}
            >
              {/* Selection checkbox */}
              <div className="flex items-start gap-4 mb-4">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSelect(proposal.id)}
                  className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-500/10 text-blue-400`}>
                     <i className="fa-solid fa-microchip-ai text-xl animate-pulse"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        {proposal.type === 'NEW' ? '新增' : '更新'} 提案
                      </span>
                      <span className="text-gray-500 text-xs">来源: 对话分析提取</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-100 italic">"系统检测到潜在的认知模式..."</h3>
                  </div>
                </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-10 mb-10">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 relative group">
                  <div className="absolute -top-2 -left-2 px-2 py-1 bg-blue-600 rounded text-[9px] font-bold uppercase">拟定记忆条目</div>
                  <p className="text-lg text-gray-200 leading-snug">{proposal.proposedMemory.content}</p>
                  <div className="mt-6 flex items-center gap-3">
                     <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-white/5 border border-white/10 ${meta.color}`}>
                        {meta.icon}
                        {meta.label}
                     </div>
                     <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-400">
                        稳定性 L{proposal.proposedMemory.layer}
                     </div>
                  </div>
                  
                  {/* Confidence visualization */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">置信度</span>
                      <span className={`font-mono ${
                        (proposal.confidence || 0.7) > 0.8 ? 'text-green-400' :
                        (proposal.confidence || 0.7) > 0.6 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {Math.round((proposal.confidence || 0.7) * 100)}%
                      </span>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-full h-2">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          (proposal.confidence || 0.7) > 0.8 ? 'bg-green-500' :
                          (proposal.confidence || 0.7) > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(proposal.confidence || 0.7) * 100}%` }}
                      />
                    </div>
                    {proposal.qualityScore !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">质量评分</span>
                        <span className="font-mono text-gray-400">
                          {Math.round(proposal.qualityScore * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-2 tracking-widest">推理逻辑</label>
                    <p className="text-sm text-gray-400 italic leading-relaxed">
                      {proposal.reasoning || 'No reasoning provided'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-2 tracking-widest">证据摘要</label>
                    <div className="bg-black/40 rounded-xl p-4 border border-dashed border-white/10 max-h-32 overflow-y-auto">
                      {proposal.evidenceContext && proposal.evidenceContext.length > 0 ? (
                        <div className="space-y-2">
                          {proposal.evidenceContext.slice(0, 3).map((evidence, idx) => (
                            <p key={idx} className="text-[11px] text-gray-500 font-mono">
                              {evidence.length > 100 ? `...${evidence.slice(-100)}` : evidence}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-600 font-mono italic">No evidence available</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Similar memory warning */}
                  {proposal.similarityMatches && proposal.similarityMatches.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                      <p className="text-xs text-yellow-400 mb-2 flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        检测到 {proposal.similarityMatches.length} 条相似记忆
                      </p>
                      <div className="space-y-2">
                        {proposal.similarityMatches.slice(0, 2).map((match, idx) => (
                          <div key={idx} className="bg-black/20 rounded-lg p-2 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-gray-400">相似度</span>
                              <span className="text-yellow-400 font-mono">{Math.round(match.similarity * 100)}%</span>
                            </div>
                            <p className="text-gray-500 text-[10px] italic">{match.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/5">
                     <button 
                      onClick={() => onReject(proposal.id)}
                      className="px-8 py-3 rounded-2xl border border-red-500/30 text-red-500/80 text-sm font-bold hover:bg-red-500/10 transition-all"
                     >
                       拒绝
                     </button>
                     <button 
                      onClick={() => onAccept(proposal)}
                      className="px-10 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2"
                     >
                       <i className="fa-solid fa-check"></i>
                       通过并入库
                     </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {pending.length === 0 && (
          <div className="py-24 text-center glass-panel rounded-[40px] border-dashed border-2 border-white/10">
            <h3 className="text-3xl font-bold text-gray-300">治理队列已清空</h3>
            <p className="text-gray-500 mt-4 max-w-sm mx-auto">所有的认知更新已处理完毕。你的数字孪生状态处于同步中。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(InsightQueue);
