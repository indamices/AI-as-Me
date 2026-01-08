
import React, { useState } from 'react';
import { MemoryCategory, MemoryLayer, Memory } from '../types';
import { CATEGORY_METADATA } from '../constants';

interface IntentCenterProps {
  onAddIntent: (memo: Partial<Memory>) => void;
}

const IntentCenter: React.FC<IntentCenterProps> = ({ onAddIntent }) => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<MemoryCategory>(MemoryCategory.GOAL);
  const [isSensitive, setIsSensitive] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onAddIntent({
      content,
      category,
      layer: MemoryLayer.L4,
      isSensitive,
      evidence: ['用户手动直接输入'],
    });
    setContent('');
    alert('意图已锁定并同步至核心记忆层。');
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black/40">
      <header className="mb-10 max-w-2xl">
        <h2 className="text-3xl font-bold mb-2">核心意图中心</h2>
        <p className="text-gray-400">在此定义你与助理之间的契约。这些手动输入的指令具有最高稳定性，AI 无法在没有你明确授权的情况下修改它们。</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
            <div className="mb-8">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-widest">核心指令内容</label>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="例如：在 11 点前的深思时间，拒绝所有非紧急的 AI 通知..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xl min-h-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-gray-700"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-widest">指令分类</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(MemoryCategory).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                        category === cat 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {CATEGORY_METADATA[cat].icon}
                      {CATEGORY_METADATA[cat].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-widest">安全等级</label>
                <div 
                  onClick={() => setIsSensitive(!isSensitive)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSensitive ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSensitive ? 'bg-red-500/20 text-red-500' : 'bg-gray-500/20 text-gray-500'}`}>
                      <i className={`fa-solid ${isSensitive ? 'fa-lock' : 'fa-lock-open'}`}></i>
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isSensitive ? 'text-red-400' : 'text-gray-400'}`}>敏感数据</p>
                      <p className="text-[10px] text-gray-500">导出或迁移时需要二次验证</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg hover:from-blue-500 hover:to-indigo-500 transition-all shadow-xl shadow-blue-500/20">
              发布并更新认知指令
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-blue-500/20">
            <h4 className="font-bold mb-4 flex items-center gap-2">核心实践指导</h4>
            <ul className="space-y-4">
              <li className="text-xs leading-relaxed text-gray-400">
                <span className="text-blue-500 font-bold block mb-1">01 明确边界</span>
                使用“绝对不”、“禁止”等明确措辞来定义你的规则。
              </li>
              <li className="text-xs leading-relaxed text-gray-400">
                <span className="text-blue-500 font-bold block mb-1">02 分类隔离</span>
                将生活习惯与专业项目分开，以提高助理在不同场景下的响应准确度。
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntentCenter;
