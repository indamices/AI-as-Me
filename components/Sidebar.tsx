
import React from 'react';

interface SidebarProps {
  activeTab: 'vault' | 'queue' | 'intents' | 'evolution' | 'chat' | 'import' | 'export' | 'settings' | 'knowledge' | 'uploads' | 'sessions';
  onTabChange: (tab: 'vault' | 'queue' | 'intents' | 'evolution' | 'chat' | 'import' | 'export' | 'settings' | 'knowledge' | 'uploads' | 'sessions') => void;
  pendingCount: number;
  processingUploadsCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, pendingCount, processingUploadsCount = 0 }) => {
  const menuItems = [
    { id: 'chat', label: '认知对话', icon: 'fa-message' },
    { id: 'import', label: '数据导入', icon: 'fa-file-import', badge: processingUploadsCount > 0 ? processingUploadsCount : undefined },
    { id: 'queue', label: '治理队列', icon: 'fa-list-check', badge: pendingCount },
    { id: 'vault', label: '长期记忆库', icon: 'fa-brain' },
    { id: 'knowledge', label: '知识库', icon: 'fa-book' },
    { id: 'uploads', label: '上传历史', icon: 'fa-file-upload' },
    { id: 'sessions', label: '会话存档', icon: 'fa-comments' },
    { id: 'intents', label: '核心意图', icon: 'fa-bullseye' },
    { id: 'evolution', label: '演进历史', icon: 'fa-timeline' },
    { id: 'export', label: '导出引擎', icon: 'fa-file-export' },
    { id: 'settings', label: '核心配置', icon: 'fa-gear' },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-white/10 flex flex-col h-full z-20">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <i className="fa-solid fa-dna text-xl text-white"></i>
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg tracking-tight">人格引擎</h1>
            <p className="text-[10px] text-gray-500 font-mono uppercase">Memory Governance OS</p>
            <p className="text-[9px] text-blue-400 font-mono font-bold mt-1">v{APP_VERSION}</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as any)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner' 
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <i className={`fa-solid ${item.icon} w-5`}></i>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  item.id === 'import' ? 'bg-blue-600 animate-pulse' : 'bg-red-600'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-white/5 space-y-4">
        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500 font-bold uppercase">隐私主权状态</span>
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
          </div>
          <p className="text-[11px] font-mono text-gray-400">本地存储全量加密中</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
