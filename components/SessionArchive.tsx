import React, { useState } from 'react';
import { ConversationSession } from '../types';

interface SessionArchiveProps {
  sessions: ConversationSession[];
  onDelete: (id: string) => void;
  onView: (session: ConversationSession) => void;
}

const SessionArchive: React.FC<SessionArchiveProps> = ({ 
  sessions, 
  onDelete,
  onView 
}) => {
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black/40">
      <header className="mb-10">
        <h2 className="text-3xl font-bold mb-2">对话会话存档</h2>
        <p className="text-gray-400 font-medium">查看和管理所有对话会话记录</p>
      </header>

      <div className="max-w-6xl space-y-4">
        {sessions.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-white/10 text-center">
            <i className="fa-solid fa-comments text-4xl text-gray-600 mb-4"></i>
            <p className="text-gray-500">暂无会话记录</p>
          </div>
        ) : (
          sessions
            .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
            .map(session => (
              <div
                key={session.id}
                className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2">{session.title}</h3>
                    <div className="text-sm text-gray-400 space-y-1">
                      <div>开始时间: {new Date(session.startedAt).toLocaleString()}</div>
                      <div>最后消息: {new Date(session.lastMessageAt).toLocaleString()}</div>
                      <div>消息数: {session.messages.length}</div>
                      {session.harvestedAt && (
                        <div className="text-green-400">
                          已收割: {new Date(session.harvestedAt).toLocaleString()}
                        </div>
                      )}
                      {session.extractedMemories && session.extractedMemories.length > 0 && (
                        <div>提取记忆: {session.extractedMemories.length} 条</div>
                      )}
                      {session.extractedKnowledge && session.extractedKnowledge.length > 0 && (
                        <div>提取知识: {session.extractedKnowledge.length} 条</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onView(session)}
                      className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/20"
                    >
                      查看
                    </button>
                    <button
                      onClick={() => setSelectedSession(session)}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10"
                    >
                      详情
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('确认删除此会话？')) {
                          onDelete(session.id);
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/20"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedSession && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setSelectedSession(null)}
        >
          <div 
            className="glass-panel max-w-4xl w-full p-8 rounded-3xl border border-white/20 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">{selectedSession.title}</h3>
                <div className="text-sm text-gray-400">
                  {new Date(selectedSession.startedAt).toLocaleString()} - {new Date(selectedSession.lastMessageAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="space-y-4">
              {selectedSession.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl ${
                    msg.role === 'user' 
                      ? 'bg-blue-500/10 border border-blue-500/30' 
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-1 font-bold">
                    {msg.role === 'user' ? '用户' : '助手'}
                  </div>
                  <div className="text-gray-300 whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionArchive;
