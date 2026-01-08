
import React, { useState } from 'react';
import { Memory, MemoryCategory, MemoryStatus } from '../types';
import { CATEGORY_METADATA, LAYER_METADATA } from '../constants';

interface MemoryVaultProps {
  memories: Memory[];
  onUpdate: (id: string, updates: Partial<Memory>) => void;
  onDelete: (id: string) => void;
}

const MemoryVault: React.FC<MemoryVaultProps> = ({ memories, onUpdate, onDelete }) => {
  const [filter, setFilter] = useState<MemoryCategory | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSecondConfirm, setIsSecondConfirm] = useState(false);

  const filteredMemories = (memories || []).filter(m => 
    (filter === 'ALL' || m.category === filter) &&
    (m.content && m.content.toLowerCase().includes(search.toLowerCase()))
  );

  const initiateDelete = (id: string) => {
    setDeletingId(id);
    setIsSecondConfirm(false);
  };

  const handleFinalDelete = () => {
    if (deletingId) {
      onDelete(deletingId);
      setDeletingId(null);
      setIsSecondConfirm(false);
    }
  };

  // 安全获取分类元数据
  const getCategoryMeta = (cat: MemoryCategory) => {
    return CATEGORY_METADATA[cat] || CATEGORY_METADATA[MemoryCategory.GOAL];
  };

  // 安全获取层级元数据
  const getLayerMeta = (layer: any) => {
    return LAYER_METADATA[layer] || { label: 'L?', stability: 'Unknown', description: 'Invalid data' };
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black/40 min-h-0 relative">
      {/* 删除确认浮层 */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="glass-panel max-w-md w-full p-8 rounded-[2rem] border-red-500/20 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
              <i className="fa-solid fa-triangle-exclamation text-2xl text-red-500"></i>
            </div>
            <h3 className="text-xl font-bold text-center mb-2">确认抹除该认知资产？</h3>
            <p className="text-gray-400 text-sm text-center mb-8">
              {isSecondConfirm 
                ? "警告：这是最后一次验证。此操作不可逆，AI 对该规则的记忆将被永久清除。"
                : "正在尝试删除长期记忆条目。删除后，助理将失去对此规则的对齐依据。"}
            </p>

            <div className="flex flex-col gap-3">
              {!isSecondConfirm ? (
                <button 
                  onClick={() => setIsSecondConfirm(true)}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20"
                >
                  继续（第一次验证）
                </button>
              ) : (
                <button 
                  onClick={handleFinalDelete}
                  className="w-full py-4 bg-red-700 hover:bg-red-600 text-white font-bold rounded-2xl transition-all animate-pulse shadow-lg shadow-red-600/30"
                >
                  确认永久抹除（第二次验证）
                </button>
              )}
              <button 
                onClick={() => setDeletingId(null)}
                className="w-full py-4 bg-white/5 border border-white/10 text-gray-400 font-bold rounded-2xl hover:bg-white/10 transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">记忆宝库</h2>
          <p className="text-gray-400 font-medium">管理长期认知资产。这些规则指导着你数字孪生的决策偏好。</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
            <input 
              type="text" 
              placeholder="搜索记忆概念..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-64"
            />
          </div>
          <select 
            className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm focus:outline-none text-gray-300"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="ALL">所有分类</option>
            {Object.values(MemoryCategory).map(cat => (
              <option key={cat} value={cat}>{CATEGORY_METADATA[cat].label}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredMemories.map(memory => {
          const meta = getCategoryMeta(memory.category);
          const layerMeta = getLayerMeta(memory.layer);
          return (
            <div key={memory.id} className="glass-panel rounded-3xl p-6 hover:border-blue-500/30 transition-all group relative overflow-hidden flex flex-col h-full border-white/10">
              <div className={`absolute top-0 right-0 w-1.5 h-full opacity-30 ${meta.color.replace('text', 'bg')}`}></div>
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${meta.color} border border-white/5 shadow-inner`}>
                    {meta.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      {meta.label} • 稳定性 {layerMeta.stability}
                    </span>
                    <h3 className="font-bold text-gray-100">
                      {layerMeta.label} 认知层
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-mono text-gray-500">
                     {Math.round(memory.confidence * 100)}% 确信
                  </div>
                  <button 
                    onClick={() => initiateDelete(memory.id)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center transition-all border border-white/5 text-gray-600 hover:text-red-500"
                    title="抹除条目"
                  >
                    <i className="fa-solid fa-trash-can text-[10px]"></i>
                  </button>
                </div>
              </div>

              <p className="text-gray-200 text-lg mb-6 leading-relaxed flex-1 font-medium">
                {memory.content}
              </p>

              <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-[10px] text-gray-500 uppercase tracking-tighter">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar-day scale-90"></i>
                    {new Date(memory.updatedAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                    <i className={`fa-solid ${memory.metadata?.sourceTrack === 'ACTIVE' ? 'fa-user' : 'fa-dna'} scale-75`}></i>
                    {memory.metadata?.sourceTrack === 'ACTIVE' ? '手动意图' : '算法演进'}
                  </span>
                </div>
                
                <button 
                  onClick={() => onUpdate(memory.id, { status: memory.status === MemoryStatus.ACTIVE ? MemoryStatus.ARCHIVED : MemoryStatus.ACTIVE })}
                  className={`px-3 py-1 rounded-full font-bold transition-all border ${
                    memory.status === MemoryStatus.ACTIVE 
                    ? 'border-blue-500/20 text-blue-400 hover:bg-blue-500/10' 
                    : 'border-gray-500/20 text-gray-500 hover:bg-white/5'
                  }`}
                >
                  {memory.status === MemoryStatus.ACTIVE ? '当前激活' : '已归档'}
                </button>
              </div>
            </div>
          );
        })}

        {filteredMemories.length === 0 && (
          <div className="col-span-full py-32 text-center glass-panel rounded-[3rem] border-dashed border-2 border-white/10">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 mx-auto">
               <i className="fa-solid fa-brain text-4xl text-gray-700"></i>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-400">认知荒原</h3>
            <p className="text-gray-600 max-w-xs mx-auto text-sm">当前分类下未检索到长期记忆。通过对话或手动输入来构建你的认知模型。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryVault;
