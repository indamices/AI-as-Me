
import React from 'react';
import { EvolutionRecord } from '../types';

interface EvolutionTimelineProps { records: EvolutionRecord[]; }

const EvolutionTimeline: React.FC<EvolutionTimelineProps> = ({ records }) => {
  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black/40">
      <header className="mb-10">
        <h2 className="text-3xl font-bold mb-2">人格演进轨迹</h2>
        <p className="text-gray-400">溯源并见证你的数字孪生助理认知结构的每一次生长与重塑。</p>
      </header>

      <div className="relative pl-10 border-l border-white/10 ml-4 py-6 space-y-12">
        {records.length > 0 ? (
          records.slice().reverse().map((record, i) => (
            <div key={record.id} className="relative animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="absolute -left-[53px] top-0 w-6 h-6 rounded-full bg-blue-600 border-4 border-[#080808] z-10"></div>
              <div className="glass-panel p-6 rounded-2xl relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-600/10 px-2 py-1 rounded">
                      {record.type === 'IMPORT_SYNC' ? '同步导入' : '手动干预'}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(record.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-gray-100 mb-2">{record.changeDescription}</h4>
                <p className="text-sm text-gray-400">影响 ID: {record.affectedMemoryIds.join(', ')}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center text-gray-600 italic">暂无演进记录，开始导入对话以触发认知演变。</div>
        )}
      </div>
    </div>
  );
};

export default EvolutionTimeline;
