
import React from 'react';
import { AppSettings, AIProvider } from '../types';

interface SettingsCenterProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onClearData: () => void;
}

const SettingsCenter: React.FC<SettingsCenterProps> = ({ settings, onUpdate, onClearData }) => {
  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black/40">
      <header className="mb-10">
        <h2 className="text-3xl font-bold mb-2">认知核心配置</h2>
        <p className="text-gray-400 font-medium">管理你的 AI 引擎入口与模型策略。DeepSeek API Key 仅保存在本地浏览器中，Gemini 核心已自动挂载。</p>
      </header>

      <div className="max-w-4xl space-y-8">
        <section className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
            <i className="fa-solid fa-key text-blue-400"></i>
            模型提供商选择
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            {(['GEMINI', 'DEEPSEEK'] as AIProvider[]).map(p => (
              <button
                key={p}
                onClick={() => onUpdate({ activeProvider: p })}
                className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                  settings.activeProvider === p 
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                  : 'bg-white/5 border-white/10 text-gray-500 grayscale hover:grayscale-0'
                }`}
              >
                <i className={`fa-solid ${p === 'GEMINI' ? 'fa-gem' : 'fa-robot'} text-3xl`}></i>
                <span className="font-bold tracking-widest">{p}</span>
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {/* Gemini configuration is handled via environment and task-specific logic as per guidelines */}
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl mb-4">
              <p className="text-xs text-blue-400 flex items-center gap-2 font-medium">
                <i className="fa-solid fa-circle-check"></i>
                Gemini 3 系列认知核心已启用 (由系统环境自动配置)
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">DeepSeek API Key</label>
              <input 
                type="password"
                value={settings.deepseekKey}
                onChange={(e) => onUpdate({ deepseekKey: e.target.value })}
                placeholder="在此粘贴你的 DeepSeek API Key..."
                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-mono"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-600 italic">官方网址: platform.deepseek.com</span>
                <input 
                  type="text"
                  value={settings.deepseekModel}
                  onChange={(e) => onUpdate({ deepseekModel: e.target.value })}
                  placeholder="模型名称 (如 deepseek-chat)"
                  className="bg-transparent border-b border-white/5 text-[10px] text-gray-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
            <i className="fa-solid fa-sliders text-purple-400"></i>
            质量过滤配置
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <div>
                <label className="text-sm font-bold text-gray-300 mb-1 block">启用质量过滤</label>
                <p className="text-xs text-gray-500">自动过滤低质量提案，减少审核工作量</p>
              </div>
              <button
                onClick={() => onUpdate({ qualityFilterEnabled: !settings.qualityFilterEnabled })}
                className={`relative w-14 h-8 rounded-full transition-all ${
                  settings.qualityFilterEnabled ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all ${
                  settings.qualityFilterEnabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                  最小置信度阈值: {Math.round((settings.minConfidenceThreshold || 0.6) * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.minConfidenceThreshold || 0.6}
                  onChange={(e) => onUpdate({ minConfidenceThreshold: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">低于此阈值的提案将被自动过滤</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                  自动合并相似度阈值: {Math.round((settings.autoMergeThreshold || 0.85) * 100)}%
                </label>
                <input
                  type="range"
                  min="0.7"
                  max="1"
                  step="0.05"
                  value={settings.autoMergeThreshold || 0.85}
                  onChange={(e) => onUpdate({ autoMergeThreshold: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  <span>70%</span>
                  <span>85%</span>
                  <span>100%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">相似度超过此阈值的提案将自动合并到现有记忆</p>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel p-8 rounded-3xl border border-red-500/20 shadow-2xl">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-3 text-red-400">
            <i className="fa-solid fa-triangle-exclamation"></i>
            数据主权
          </h3>
          <p className="text-sm text-gray-500 mb-6 italic">此操作将永久抹除本地浏览器存储的所有对话、记忆、配置与演进历史。请谨慎操作。</p>
          <button 
            onClick={() => { if(confirm('确认彻底销毁所有本地认知数据吗？此操作不可逆。')) onClearData(); }}
            className="px-8 py-3 bg-red-600/10 border border-red-500/30 text-red-500 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all text-sm"
          >
            强制清除所有本地资产
          </button>
        </section>
      </div>
    </div>
  );
};

export default SettingsCenter;
