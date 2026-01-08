import React, { useState, useMemo } from 'react';
import { KnowledgeItem, KnowledgeType } from '../types';

interface KnowledgeBaseProps {
  knowledgeItems: KnowledgeItem[];
  onUpdate: (id: string, updates: Partial<KnowledgeItem>) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ 
  knowledgeItems, 
  onUpdate, 
  onDelete, 
  onArchive 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<KnowledgeType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);

  const filteredItems = useMemo(() => {
    return knowledgeItems.filter(item => {
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = filterType === 'ALL' || item.type === filterType;
      const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [knowledgeItems, searchQuery, filterType, filterStatus]);

  const getTypeColor = (type: KnowledgeType) => {
    switch (type) {
      case KnowledgeType.DOCUMENT: return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case KnowledgeType.REFERENCE: return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case KnowledgeType.CONTEXT: return 'text-green-400 bg-green-500/10 border-green-500/30';
      case KnowledgeType.FACT: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case KnowledgeType.NOTE: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black/40">
      <header className="mb-10">
        <h2 className="text-3xl font-bold mb-2">知识库</h2>
        <p className="text-gray-400 font-medium">管理你的知识、文档和上下文信息</p>
      </header>

      <div className="max-w-6xl space-y-6">
        {/* Search and Filters */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10">
          <div className="flex gap-4 items-center mb-4">
            <div className="flex-1 relative">
              <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索知识项..."
                className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as KnowledgeType | 'ALL')}
              className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="ALL">所有类型</option>
              <option value={KnowledgeType.DOCUMENT}>文档</option>
              <option value={KnowledgeType.REFERENCE}>参考资料</option>
              <option value={KnowledgeType.CONTEXT}>上下文</option>
              <option value={KnowledgeType.FACT}>事实</option>
              <option value={KnowledgeType.NOTE}>笔记</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'ACTIVE' | 'ARCHIVED' | 'ALL')}
              className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="ACTIVE">活跃</option>
              <option value="ARCHIVED">已归档</option>
              <option value="ALL">全部</option>
            </select>
          </div>
          <div className="text-xs text-gray-500">
            共 {filteredItems.length} 项知识
          </div>
        </div>

        {/* Knowledge Items List */}
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl border border-white/10 text-center">
              <i className="fa-solid fa-book text-4xl text-gray-600 mb-4"></i>
              <p className="text-gray-500">暂无知识项</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getTypeColor(item.type)}`}>
                        {item.type}
                      </span>
                      {item.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 rounded bg-white/5 text-xs text-gray-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {item.status === 'ACTIVE' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchive(item.id);
                        }}
                        className="px-3 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs hover:bg-yellow-500/20"
                      >
                        归档
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate(item.id, { status: 'ACTIVE' });
                        }}
                        className="px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs hover:bg-green-500/20"
                      >
                        恢复
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('确认删除此知识项？')) {
                          onDelete(item.id);
                        }
                      }}
                      className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/20"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2">{item.content}</p>
                <div className="mt-3 text-xs text-gray-600 flex items-center gap-4">
                  <span>来源: {item.source.type}</span>
                  {item.source.filename && <span>文件: {item.source.filename}</span>}
                  <span>创建: {new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="glass-panel max-w-3xl w-full p-8 rounded-3xl border border-white/20 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">{selectedItem.title}</h3>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getTypeColor(selectedItem.type)}`}>
                    {selectedItem.type}
                  </span>
                  {selectedItem.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 rounded bg-white/5 text-xs text-gray-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="prose prose-invert max-w-none mb-6">
              <p className="text-gray-300 whitespace-pre-wrap">{selectedItem.content}</p>
            </div>
            <div className="pt-6 border-t border-white/10 text-sm text-gray-500 space-y-2">
              <div>来源: {selectedItem.source.type}</div>
              {selectedItem.source.filename && <div>文件: {selectedItem.source.filename}</div>}
              <div>创建时间: {new Date(selectedItem.createdAt).toLocaleString()}</div>
              <div>更新时间: {new Date(selectedItem.updatedAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
