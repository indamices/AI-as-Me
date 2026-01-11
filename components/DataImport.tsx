import React, { useState, useRef } from 'react';
import { 
  Memory, 
  KnowledgeItem, 
  ConversationSession, 
  UploadRecord, 
  InsightProposal, 
  EvolutionRecord 
} from '../types';
import { importData, applyImport, detectConflicts, ImportOptions, ImportResult } from '../utils/importUtils';
import { validateExportPackage } from '../utils/validationUtils';
import { ExportPackage } from '../utils/exportUtils';

interface DataImportProps {
  currentData: {
    memories: Memory[];
    knowledge: KnowledgeItem[];
    sessions: ConversationSession[];
    uploads: UploadRecord[];
    proposals: InsightProposal[];
    history: EvolutionRecord[];
  };
  onImport: (data: {
    memories: Memory[];
    knowledge: KnowledgeItem[];
    sessions: ConversationSession[];
    uploads: UploadRecord[];
    proposals: InsightProposal[];
    history: EvolutionRecord[];
  }) => void;
}

const DataImport: React.FC<DataImportProps> = ({ currentData, onImport }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importPreview, setImportPreview] = useState<ImportResult | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    strategy: 'merge',
    conflictResolution: 'new',
    skipDuplicates: true
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMessage(null);
    setValidationResult(null);
    setImportPreview(null);

    // Validate file
    setIsValidating(true);
    try {
      const text = await file.text();
      let jsonData: any;

      try {
        jsonData = JSON.parse(text);
      } catch (e) {
        setErrorMessage(`无效的 JSON 格式：${e instanceof Error ? e.message : '未知错误'}`);
        setIsValidating(false);
        return;
      }

      // Validate package structure
      const validation = validateExportPackage(jsonData);
      setValidationResult(validation);

      if (validation.valid) {
        // Preview import
        const preview = await importData(file, currentData, importOptions);
        setImportPreview(preview);
      } else {
        setErrorMessage(`数据包验证失败：${validation.errors.map(e => e.message).join('; ')}`);
      }
    } catch (error) {
      setErrorMessage(`文件读取失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !validationResult?.valid) return;

    setIsImporting(true);
    try {
      const text = await selectedFile.text();
      const jsonData = JSON.parse(text) as ExportPackage;
      
      // Apply import
      const mergedData = applyImport(currentData, jsonData.data, importOptions);
      
      // Call onImport callback
      onImport(mergedData);
      
      // Reset state
      setSelectedFile(null);
      setValidationResult(null);
      setImportPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      alert('数据导入成功！');
    } catch (error) {
      setErrorMessage(`导入失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      const fakeEvent = {
        target: { files: [file] }
      } as any;
      handleFileSelect(fakeEvent);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-black/40">
      <header className="mb-12 max-w-2xl">
        <h2 className="text-3xl font-bold mb-4">数据包导入</h2>
        <p className="text-gray-400 text-lg">导入之前导出的数据包，恢复或合并你的数据。支持完全替换、智能合并或增量添加。</p>
      </header>

      {errorMessage && (
        <div className="max-w-4xl mb-6 p-4 bg-red-600/20 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>{errorMessage}</span>
          <button 
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      <div className="max-w-4xl space-y-8">
        {/* 文件选择 */}
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="group glass-panel p-10 rounded-3xl border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
            accept=".json"
          />
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-file-import text-3xl text-blue-500"></i>
          </div>
          <h3 className="text-xl font-bold mb-2">选择数据包文件</h3>
          <p className="text-gray-500 text-sm">拖拽文件到此处或点击选择。支持 .json 格式的数据包文件。</p>
          {selectedFile && (
            <div className="mt-4 p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl">
              <p className="text-sm text-blue-400 font-mono">{selectedFile.name}</p>
              <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024).toFixed(2)} KB</p>
            </div>
          )}
        </div>

        {/* 验证结果 */}
        {isValidating && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-spinner animate-spin text-blue-400"></i>
              <span className="text-gray-300">正在验证数据包...</span>
            </div>
          </div>
        )}

        {validationResult && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-3">
              <i className="fa-solid fa-clipboard-check text-green-400"></i>
              导入预览
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className={`p-4 rounded-xl ${validationResult.valid ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {validationResult.valid ? (
                    <i className="fa-solid fa-check-circle text-green-400"></i>
                  ) : (
                    <i className="fa-solid fa-times-circle text-red-400"></i>
                  )}
                  <span className={`font-bold ${validationResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                    {validationResult.valid ? '格式验证通过' : '格式验证失败'}
                  </span>
                </div>
                {validationResult.metadata && (
                  <div className="text-xs text-gray-400 mt-2">
                    <p>数据包版本: {validationResult.metadata.version}</p>
                    <p>导出日期: {new Date(validationResult.metadata.exportDate).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {validationResult.warnings.length > 0 && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <p className="text-xs text-yellow-400 font-bold mb-2">警告：</p>
                  {validationResult.warnings.map((w: any, i: number) => (
                    <p key={i} className="text-xs text-yellow-300">{w.message}</p>
                  ))}
                </div>
              )}

              {importPreview && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-xs text-blue-400 font-bold mb-3">数据统计：</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">记忆: </span>
                      <span className="text-blue-400 font-bold">{importPreview.imported.memories} 条</span>
                    </div>
                    <div>
                      <span className="text-gray-400">知识: </span>
                      <span className="text-green-400 font-bold">{importPreview.imported.knowledge} 条</span>
                    </div>
                    <div>
                      <span className="text-gray-400">会话: </span>
                      <span className="text-purple-400 font-bold">{importPreview.imported.sessions} 个</span>
                    </div>
                    <div>
                      <span className="text-gray-400">上传: </span>
                      <span className="text-cyan-400 font-bold">{importPreview.imported.uploads} 条</span>
                    </div>
                    <div>
                      <span className="text-gray-400">提案: </span>
                      <span className="text-yellow-400 font-bold">{importPreview.imported.proposals} 条</span>
                    </div>
                    <div>
                      <span className="text-gray-400">历史: </span>
                      <span className="text-pink-400 font-bold">{importPreview.imported.history} 条</span>
                    </div>
                  </div>
                  {importPreview.conflicts > 0 && (
                    <div className="mt-3 p-2 bg-yellow-500/10 rounded-lg">
                      <p className="text-xs text-yellow-400">
                        <i className="fa-solid fa-exclamation-triangle mr-2"></i>
                        检测到 {importPreview.conflicts} 个潜在冲突
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 导入策略 */}
        {validationResult?.valid && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-3">
              <i className="fa-solid fa-sliders text-purple-400"></i>
              导入策略
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-bold text-gray-400 mb-3 block">导入方式</label>
                <div className="space-y-2">
                  {(['replace', 'merge', 'append'] as const).map(strategy => {
                    const labels = {
                      replace: '完全替换（清空现有数据）',
                      merge: '智能合并（推荐）',
                      append: '增量添加（只添加新数据）'
                    };
                    return (
                      <label key={strategy} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                        <input
                          type="radio"
                          name="strategy"
                          checked={importOptions.strategy === strategy}
                          onChange={() => setImportOptions(prev => ({ ...prev, strategy }))}
                          className="w-4 h-4 border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300">{labels[strategy]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {importOptions.strategy === 'merge' && (
                <div>
                  <label className="text-sm font-bold text-gray-400 mb-3 block">冲突处理</label>
                  <div className="space-y-2">
                    {(['new', 'old'] as const).map(resolution => {
                      const labels = {
                        new: '使用新数据（推荐）',
                        old: '保留旧数据'
                      };
                      return (
                        <label key={resolution} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                          <input
                            type="radio"
                            name="conflictResolution"
                            checked={importOptions.conflictResolution === resolution}
                            onChange={() => setImportOptions(prev => ({ ...prev, conflictResolution: resolution }))}
                            className="w-4 h-4 border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-300">{labels[resolution]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleImport}
              disabled={isImporting || !validationResult?.valid}
              className={`w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
                isImporting || !validationResult?.valid
                ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20 active:scale-[0.98]'
              }`}
            >
              {isImporting ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  正在导入...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i>
                  确认导入
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataImport;
