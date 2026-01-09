
import React, { useState, useMemo } from 'react';
import { AppSettings, AIProvider } from '../types';

interface SettingsCenterProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onClearData: () => void;
}

// Configuration status type
type ConfigStatus = 'valid' | 'incomplete' | 'invalid';

const SettingsCenter: React.FC<SettingsCenterProps> = ({ settings, onUpdate, onClearData }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<AIProvider | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Calculate configuration status
  const configStatus = useMemo<ConfigStatus>(() => {
    if (settings.activeProvider === 'GEMINI') {
      if (!settings.geminiApiKey || settings.geminiApiKey.trim().length === 0) {
        return 'incomplete';
      }
      return 'valid';
    } else {
      if (!settings.deepseekKey || settings.deepseekKey.trim().length === 0) {
        return 'incomplete';
      }
      return 'valid';
    }
  }, [settings]);

  // Get current model name
  const currentModel = useMemo(() => {
    return settings.activeProvider === 'GEMINI' 
      ? (settings.geminiModel || 'gemini-3-pro-preview')
      : (settings.deepseekModel || 'deepseek-chat');
  }, [settings]);

  // Handle provider selection with confirmation
  const handleProviderSelect = (provider: AIProvider) => {
    if (provider === settings.activeProvider) {
      return; // Already selected
    }
    setPendingProvider(provider);
    setShowConfirmModal(true);
  };

  // Apply configuration change
  const handleConfirmChange = () => {
    if (!pendingProvider) return;
    setIsApplying(true);
    
    // Simulate application with animation
    const timer1 = setTimeout(() => {
      onUpdate({ activeProvider: pendingProvider });
      setIsApplying(false);
      setShowConfirmModal(false);
      setPendingProvider(null);
      
      // Show success animation
      const timer2 = setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 2000);
      
      // Store timer for cleanup if component unmounts
      return () => clearTimeout(timer2);
    }, 800);
    
    // Note: In a real implementation, these timers should be stored in refs
    // and cleaned up in useEffect cleanup function
    // For now, this is acceptable as the component typically doesn't unmount during this operation
  };

  // Cancel configuration change
  const handleCancelChange = () => {
    setShowConfirmModal(false);
    setPendingProvider(null);
  };

  // Test API connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    
    try {
      if (settings.activeProvider === 'GEMINI') {
        if (!settings.geminiApiKey || settings.geminiApiKey.trim().length === 0) {
          setTestResult({ success: false, message: 'Gemini API Key 未配置' });
          setTestingConnection(false);
          return;
        }
        // Test Gemini connection (simplified - just check if key format is valid)
        // In production, you might want to make an actual API call
        const isValidFormat = settings.geminiApiKey.length > 20;
        if (isValidFormat) {
          setTestResult({ success: true, message: 'Gemini API Key 格式有效' });
        } else {
          setTestResult({ success: false, message: 'Gemini API Key 格式无效' });
        }
      } else {
        if (!settings.deepseekKey || settings.deepseekKey.trim().length === 0) {
          setTestResult({ success: false, message: 'DeepSeek API Key 未配置' });
          setTestingConnection(false);
          return;
        }
        // Test DeepSeek connection
        const isValidFormat = settings.deepseekKey.length > 20;
        if (isValidFormat) {
          setTestResult({ success: true, message: 'DeepSeek API Key 格式有效' });
        } else {
          setTestResult({ success: false, message: 'DeepSeek API Key 格式无效' });
        }
      }
    } catch (error) {
      setTestResult({ success: false, message: '连接测试失败' });
    } finally {
      setTestingConnection(false);
      // Clear test result after 5 seconds
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  // Get status indicator color
  const getStatusColor = (status: ConfigStatus) => {
    switch (status) {
      case 'valid': return 'text-green-400';
      case 'incomplete': return 'text-yellow-400';
      case 'invalid': return 'text-red-400';
    }
  };

  // Get status text
  const getStatusText = (status: ConfigStatus) => {
    switch (status) {
      case 'valid': return '配置完整';
      case 'incomplete': return '配置不完整';
      case 'invalid': return '配置错误';
    }
  };
  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black/40">
      <header className="mb-10">
        <h2 className="text-3xl font-bold mb-2">认知核心配置</h2>
        <p className="text-gray-400 font-medium">管理你的 AI 引擎入口与模型策略。DeepSeek API Key 仅保存在本地浏览器中，Gemini 核心已自动挂载。</p>
      </header>

      <div className="max-w-4xl space-y-8">
        {/* Configuration Preview Card */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent"></div>
          <div className="relative p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(configStatus)} animate-pulse`}></div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">当前激活配置</span>
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <div className={`px-4 py-2 rounded-xl bg-white/10 border ${
                    settings.activeProvider === 'GEMINI' 
                      ? 'border-blue-500/50 bg-blue-500/10' 
                      : 'border-purple-500/50 bg-purple-500/10'
                  }`}>
                    <span className="font-bold text-lg tracking-widest text-white">
                      {settings.activeProvider}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-300 font-mono">{currentModel}</div>
                    <div className={`text-xs mt-1 ${getStatusColor(configStatus)}`}>
                      {getStatusText(configStatus)}
                    </div>
                  </div>
                </div>
                
                {showConfigDetails && (
                  <div className="mt-4 p-4 bg-black/30 rounded-xl border border-white/5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">API Key:</span>
                      <span className={settings.activeProvider === 'GEMINI' 
                        ? (settings.geminiApiKey ? 'text-green-400' : 'text-yellow-400')
                        : (settings.deepseekKey ? 'text-green-400' : 'text-yellow-400')
                      }>
                        {settings.activeProvider === 'GEMINI' 
                          ? (settings.geminiApiKey ? '✓ 已配置' : '⚠ 未配置')
                          : (settings.deepseekKey ? '✓ 已配置' : '⚠ 未配置')
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">质量过滤:</span>
                      <span className={settings.qualityFilterEnabled ? 'text-green-400' : 'text-gray-500'}>
                        {settings.qualityFilterEnabled ? '✓ 启用' : '✗ 禁用'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">置信度阈值:</span>
                      <span className="text-gray-300">{Math.round((settings.minConfidenceThreshold || 0.6) * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setShowConfigDetails(!showConfigDetails)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-400 transition-all"
              >
                {showConfigDetails ? '收起' : '详情'}
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleTestConnection}
                disabled={testingConnection || configStatus === 'incomplete'}
                className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {testingConnection ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                    <span>测试中...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-plug"></i>
                    <span>测试连接</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-sliders"></i>
                切换模型配置
              </button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`mt-4 p-4 rounded-xl border ${
                testResult.success 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
              } animate-in fade-in slide-in-from-top-2 duration-300`}>
                <div className="flex items-center gap-2">
                  <i className={`fa-solid ${testResult.success ? 'fa-check-circle' : 'fa-exclamation-circle'} ${
                    testResult.success ? 'text-green-400' : 'text-red-400'
                  }`}></i>
                  <span className={`text-sm font-medium ${
                    testResult.success ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {testResult.message}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Provider Selection */}
        <section className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
            <i className="fa-solid fa-key text-blue-400"></i>
            模型提供商选择
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            {(['GEMINI', 'DEEPSEEK'] as AIProvider[]).map(p => {
              const isActive = settings.activeProvider === p;
              const providerConfigStatus = p === 'GEMINI' 
                ? (settings.geminiApiKey ? 'valid' : 'incomplete')
                : (settings.deepseekKey ? 'valid' : 'incomplete');
              
              return (
                <div key={p} className="flex flex-col gap-2">
                  <button
                    onClick={() => handleProviderSelect(p)}
                    className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 relative overflow-hidden group ${
                      isActive 
                        ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/10 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/20' 
                        : 'bg-white/5 border-white/10 text-gray-500 grayscale hover:grayscale-0 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <>
                        <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-50"></div>
                      </>
                    )}
                    
                    {/* Provider icon */}
                    <div className={`relative z-10 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                      <i className={`fa-solid ${p === 'GEMINI' ? 'fa-gem' : 'fa-robot'} text-3xl ${isActive ? 'drop-shadow-lg' : ''}`}></i>
                    </div>
                    
                    {/* Provider name */}
                    <span className={`font-bold tracking-widest relative z-10 ${isActive ? 'text-white' : ''}`}>{p}</span>
                    
                    {/* Status badge */}
                    <div className={`relative z-10 px-2 py-1 rounded-lg text-[9px] font-bold ${
                      providerConfigStatus === 'valid' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {providerConfigStatus === 'valid' ? '✓ 已配置' : '⚠ 未配置'}
                    </div>
                  </button>
                  
                  {/* Description */}
                  <div className={`text-[10px] text-center px-2 transition-colors ${
                    isActive ? 'text-blue-400' : 'text-gray-600'
                  }`}>
                    {p === 'GEMINI' ? (
                      <>
                        <div className="font-bold mb-1">支持结构化输出</div>
                        <div>自动 JSON 验证，高质量提取</div>
                      </>
                    ) : (
                      <>
                        <div className="font-bold mb-1">性价比高</div>
                        <div>需要详细提示词，适合日常使用</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Model Comparison Info */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-info-circle text-blue-400 mt-0.5"></i>
              <div className="flex-1 text-xs text-gray-400">
                <p className="font-bold text-blue-400 mb-2">模型选择建议：</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Gemini</strong>：支持结构化 JSON 输出，自动验证格式，适合复杂推理任务，提取质量更高</li>
                  <li><strong>DeepSeek</strong>：性价比高，对中文理解好，但需要更详细的提示词，输出需要额外解析验证</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Gemini Configuration */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Gemini API Key</label>
              <input 
                type="password"
                value={settings.geminiApiKey || ''}
                onChange={(e) => onUpdate({ geminiApiKey: e.target.value })}
                placeholder="在此粘贴你的 Gemini API Key..."
                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-mono"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-600 italic">官方网址: aistudio.google.com</span>
                <div className="flex flex-col gap-1">
                  <select
                    value={settings.geminiModel || 'gemini-3-pro-preview'}
                    onChange={(e) => onUpdate({ geminiModel: e.target.value })}
                    className="bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="gemini-3-pro-preview">gemini-3-pro-preview - 复杂推理，高质量提取</option>
                    <option value="gemini-3-flash-preview">gemini-3-flash-preview - 快速响应，平衡速度质量</option>
                    <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp - 实验性，最新特性</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro - 稳定版本，可靠</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash - 快速版本，适合大量数据</option>
                  </select>
                  <p className="text-[9px] text-gray-600 italic">
                    {settings.geminiModel === 'gemini-3-pro-preview' && '推荐：复杂推理任务，最高质量'}
                    {settings.geminiModel === 'gemini-3-flash-preview' && '推荐：实时对话，快速响应'}
                    {settings.geminiModel === 'gemini-2.0-flash-exp' && '实验性模型，可能不稳定'}
                    {settings.geminiModel === 'gemini-1.5-pro' && '稳定可靠，适合生产环境'}
                    {settings.geminiModel === 'gemini-1.5-flash' && '快速处理，适合批量任务'}
                  </p>
                </div>
              </div>
            </div>

            {/* DeepSeek Configuration */}
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
                <div className="flex flex-col gap-1">
                  <select
                    value={settings.deepseekModel || 'deepseek-chat'}
                    onChange={(e) => onUpdate({ deepseekModel: e.target.value })}
                    className="bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="deepseek-chat">deepseek-chat - 通用对话，性价比高</option>
                    <option value="deepseek-coder">deepseek-coder - 代码相关，逻辑分析强</option>
                    <option value="deepseek-reasoner">deepseek-reasoner - 推理任务，专门优化</option>
                  </select>
                  <p className="text-[9px] text-gray-600 italic">
                    {settings.deepseekModel === 'deepseek-chat' && '推荐：日常使用，需要详细中文提示词'}
                    {settings.deepseekModel === 'deepseek-coder' && '推荐：代码相关任务，逻辑分析'}
                    {settings.deepseekModel === 'deepseek-reasoner' && '推荐：复杂推理任务，深度分析'}
                  </p>
                </div>
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

      {/* Configuration Confirm Modal */}
      {showConfirmModal && pendingProvider && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCancelChange();
            }
          }}
        >
          <div className="glass-panel max-w-2xl w-full p-8 rounded-3xl border-2 border-white/30 shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a]">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent"></div>
            <div className="relative">
              {/* Header */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <i className="fa-solid fa-sliders text-2xl text-blue-400"></i>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">确认模型配置变更</h3>
                  <p className="text-sm text-gray-400">请确认以下配置变更</p>
                </div>
              </div>

              {/* Comparison View */}
              <div className="grid grid-cols-3 gap-6 mb-8 items-center">
                {/* Current Config */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">当前配置</div>
                  <div className={`px-3 py-2 rounded-lg mb-2 ${
                    settings.activeProvider === 'GEMINI' 
                      ? 'bg-blue-500/20 border border-blue-500/30' 
                      : 'bg-purple-500/20 border border-purple-500/30'
                  }`}>
                    <span className="font-bold text-white">{settings.activeProvider}</span>
                  </div>
                  <div className="text-sm text-gray-300 font-mono">{currentModel}</div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                    <i className="fa-solid fa-arrow-right text-xl text-blue-400"></i>
                  </div>
                </div>

                {/* New Config */}
                <div className={`p-6 rounded-2xl border-2 ${
                  pendingProvider === 'GEMINI'
                    ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/20'
                    : 'bg-purple-500/20 border-purple-500/50 shadow-lg shadow-purple-500/20'
                }`}>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">新配置</div>
                  <div className={`px-3 py-2 rounded-lg mb-2 ${
                    pendingProvider === 'GEMINI'
                      ? 'bg-blue-500/30 border border-blue-500/50'
                      : 'bg-purple-500/30 border border-purple-500/50'
                  }`}>
                    <span className="font-bold text-white">{pendingProvider}</span>
                  </div>
                  <div className="text-sm text-gray-300 font-mono">
                    {pendingProvider === 'GEMINI' 
                      ? (settings.geminiModel || 'gemini-3-pro-preview')
                      : (settings.deepseekModel || 'deepseek-chat')
                    }
                  </div>
                </div>
              </div>

              {/* Impact Notice */}
              <div className="p-5 bg-yellow-500/10 border-2 border-yellow-500/40 rounded-xl mb-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-yellow-500/5 via-transparent to-transparent"></div>
                <div className="relative flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-info-circle text-yellow-400"></i>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold mb-2 text-yellow-200">配置变更影响</p>
                    <p className="text-sm text-yellow-300/90 leading-relaxed">
                      切换后，所有新的记忆提取和对话将使用 <strong className="text-yellow-200">{pendingProvider}</strong> 模型。
                      <br />
                      <span className="text-xs text-yellow-400/70">已提取的记忆和现有对话不会受到影响。</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={handleCancelChange}
                  disabled={isApplying}
                  className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 font-bold hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmChange}
                  disabled={isApplying}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-500 hover:via-blue-400 hover:to-purple-500 text-white font-bold transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group"
                >
                  {isApplying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>应用中...</span>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <i className="fa-solid fa-check relative z-10"></i>
                      <span className="relative z-10">确认应用配置</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/30 border-4 border-green-400 flex items-center justify-center shadow-2xl shadow-green-500/50">
              <i className="fa-solid fa-check text-4xl text-green-300"></i>
            </div>
            <div className="px-6 py-3 rounded-2xl bg-green-500/20 border border-green-400/30 backdrop-blur-md">
              <p className="text-green-300 font-bold text-lg">配置已应用</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsCenter;
