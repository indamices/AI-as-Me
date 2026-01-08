import React, { useState } from 'react';
import { UploadRecord } from '../types';

interface UploadHistoryProps {
  uploadRecords: UploadRecord[];
  onDelete: (id: string) => void;
  onReprocess?: (id: string) => void;
}

const UploadHistory: React.FC<UploadHistoryProps> = ({ 
  uploadRecords, 
  onDelete,
  onReprocess 
}) => {
  const [selectedRecord, setSelectedRecord] = useState<UploadRecord | null>(null);

  const getStatusColor = (status: UploadRecord['status']) => {
    switch (status) {
      case 'PROCESSED': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'PENDING': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'FAILED': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black/40">
      <header className="mb-10">
        <h2 className="text-3xl font-bold mb-2">上传历史</h2>
        <p className="text-gray-400 font-medium">查看和管理所有上传的文件记录</p>
      </header>

      <div className="max-w-6xl space-y-4">
        {uploadRecords.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-white/10 text-center">
            <i className="fa-solid fa-file-upload text-4xl text-gray-600 mb-4"></i>
            <p className="text-gray-500">暂无上传记录</p>
          </div>
        ) : (
          uploadRecords
            .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
            .map(record => (
              <div
                key={record.id}
                className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold">{record.filename}</h3>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getStatusColor(record.status)}`}>
                        {record.status === 'PROCESSED' ? '已处理' : 
                         record.status === 'PENDING' ? '待处理' : '失败'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                      <div>上传时间: {new Date(record.uploadedAt).toLocaleString()}</div>
                      {record.processedAt && (
                        <div>处理时间: {new Date(record.processedAt).toLocaleString()}</div>
                      )}
                      {record.extractedMemories && record.extractedMemories.length > 0 && (
                        <div>提取记忆: {record.extractedMemories.length} 条</div>
                      )}
                      {record.extractedKnowledge && record.extractedKnowledge.length > 0 && (
                        <div>提取知识: {record.extractedKnowledge.length} 条</div>
                      )}
                      {record.error && (
                        <div className="text-red-400">错误: {record.error}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedRecord(record)}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10"
                    >
                      查看
                    </button>
                    {record.status === 'FAILED' && onReprocess && (
                      <button
                        onClick={() => onReprocess(record.id)}
                        className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/20"
                      >
                        重新处理
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('确认删除此上传记录？')) {
                          onDelete(record.id);
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/20"
                    >
                      删除
                    </button>
                  </div>
                </div>
                {record.hash && (
                  <div className="text-xs text-gray-600 font-mono">
                    哈希: {record.hash.slice(0, 16)}...
                  </div>
                )}
              </div>
            ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setSelectedRecord(null)}
        >
          <div 
            className="glass-panel max-w-3xl w-full p-8 rounded-3xl border border-white/20 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">{selectedRecord.filename}</h3>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getStatusColor(selectedRecord.status)}`}>
                  {selectedRecord.status === 'PROCESSED' ? '已处理' : 
                   selectedRecord.status === 'PENDING' ? '待处理' : '失败'}
                </span>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">上传时间</div>
                <div className="text-gray-300">{new Date(selectedRecord.uploadedAt).toLocaleString()}</div>
              </div>
              {selectedRecord.processedAt && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">处理时间</div>
                  <div className="text-gray-300">{new Date(selectedRecord.processedAt).toLocaleString()}</div>
                </div>
              )}
              {selectedRecord.hash && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">内容哈希</div>
                  <div className="text-gray-300 font-mono text-xs break-all">{selectedRecord.hash}</div>
                </div>
              )}
              {selectedRecord.extractedMemories && selectedRecord.extractedMemories.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">提取的记忆 ID</div>
                  <div className="text-gray-300 text-xs space-y-1">
                    {selectedRecord.extractedMemories.map(id => (
                      <div key={id} className="font-mono">{id}</div>
                    ))}
                  </div>
                </div>
              )}
              {selectedRecord.extractedKnowledge && selectedRecord.extractedKnowledge.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">提取的知识 ID</div>
                  <div className="text-gray-300 text-xs space-y-1">
                    {selectedRecord.extractedKnowledge.map(id => (
                      <div key={id} className="font-mono">{id}</div>
                    ))}
                  </div>
                </div>
              )}
              {selectedRecord.error && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">错误信息</div>
                  <div className="text-red-400">{selectedRecord.error}</div>
                </div>
              )}
            </div>
            <div className="pt-6 border-t border-white/10">
              <div className="text-sm text-gray-500 mb-2">文件内容预览</div>
              <div className="bg-black/40 p-4 rounded-xl max-h-64 overflow-y-auto">
                <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                  {selectedRecord.content.slice(0, 2000)}
                  {selectedRecord.content.length > 2000 && '\n\n...(内容过长，已截断)'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadHistory;
