/**
 * 文档分块工具函数
 * 用于处理超出AI模型上下文限制的超长文档
 */

/**
 * 模型上下文限制配置（字符数，保守估计）
 * 注意：实际token数和字符数有差异（中文约1.5字符/token，英文约4字符/token）
 * 这里使用字符数作为粗略估算，并保留安全边际
 */
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // Gemini 模型
  'gemini-3-pro-preview': 400000,      // ~1M tokens (保守估计 ~400K 字符)
  'gemini-3-flash-preview': 400000,    // ~1M tokens
  'gemini-pro': 12000,                 // ~30K tokens (~12K 字符)
  'gemini-flash': 400000,              // ~1M tokens
  
  // DeepSeek 模型
  'deepseek-chat': 25000,              // ~64K tokens (~25K 字符)
  'deepseek-reasoner': 25000,          // ~64K tokens
  
  // 默认值（保守）
  'default': 20000                     // 默认 20K 字符
};

/**
 * 获取模型的上下文限制
 */
export function getModelContextLimit(modelName: string | undefined): number {
  if (!modelName) return MODEL_CONTEXT_LIMITS['default'];
  
  // 精确匹配
  if (MODEL_CONTEXT_LIMITS[modelName]) {
    return MODEL_CONTEXT_LIMITS[modelName];
  }
  
  // 部分匹配
  if (modelName.includes('gemini-3-pro')) {
    return MODEL_CONTEXT_LIMITS['gemini-3-pro-preview'];
  }
  if (modelName.includes('gemini-3-flash')) {
    return MODEL_CONTEXT_LIMITS['gemini-3-flash-preview'];
  }
  if (modelName.includes('gemini-pro') && !modelName.includes('gemini-3')) {
    return MODEL_CONTEXT_LIMITS['gemini-pro'];
  }
  if (modelName.includes('deepseek')) {
    return MODEL_CONTEXT_LIMITS['deepseek-chat'];
  }
  
  return MODEL_CONTEXT_LIMITS['default'];
}

/**
 * 计算Prompt基础开销（估算系统提示词和格式开销）
 */
function estimatePromptOverhead(): number {
  // 系统提示词、JSON格式说明等大约占用
  return 3000; // 约3K字符
}

/**
 * 文本块接口
 */
export interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
}

/**
 * 智能分块策略：尽量在语义边界处分割
 */
export function chunkText(
  text: string, 
  maxChunkSize: number,
  overlapSize: number = 500 // 重叠大小，避免跨块信息丢失
): TextChunk[] {
  if (!text || text.length === 0) {
    return [];
  }
  
  const chunks: TextChunk[] = [];
  const promptOverhead = estimatePromptOverhead();
  const effectiveChunkSize = Math.max(100, maxChunkSize - promptOverhead); // Ensure at least 100 chars
  
  // Check if text needs chunking based on effective size (not raw maxChunkSize)
  if (text.length <= effectiveChunkSize) {
    return [{
      text,
      startIndex: 0,
      endIndex: text.length,
      chunkIndex: 0
    }];
  }
  const effectiveOverlap = Math.min(overlapSize, Math.floor(effectiveChunkSize * 0.1)); // 重叠不超过10%
  
  let currentIndex = 0;
  let chunkIndex = 0;
  
  while (currentIndex < text.length) {
    const chunkEnd = currentIndex + effectiveChunkSize;
    
    if (chunkEnd >= text.length) {
      // 最后一块
      chunks.push({
        text: text.slice(currentIndex),
        startIndex: currentIndex,
        endIndex: text.length,
        chunkIndex: chunkIndex++
      });
      break;
    }
    
    // 尝试在语义边界处分割
    let actualEnd = chunkEnd;
    
    // 优先在段落边界分割（双换行）
    const doubleNewlineIndex = text.lastIndexOf('\n\n', chunkEnd);
    if (doubleNewlineIndex > currentIndex + effectiveChunkSize * 0.5) {
      actualEnd = doubleNewlineIndex + 2;
    } 
    // 其次在单换行处分割
    else {
      const newlineIndex = text.lastIndexOf('\n', chunkEnd);
      if (newlineIndex > currentIndex + effectiveChunkSize * 0.5) {
        actualEnd = newlineIndex + 1;
      }
      // 最后在句子边界分割（。！？）
      else {
        const sentenceEndPattern = /[。！？]\s*/g;
        let match;
        let lastMatchEnd = -1;
        
        // 找到最后一个在chunkEnd之前的句子结束符
        while ((match = sentenceEndPattern.exec(text.slice(currentIndex, chunkEnd))) !== null) {
          lastMatchEnd = currentIndex + match.index + match[0].length;
        }
        
        if (lastMatchEnd > currentIndex + effectiveChunkSize * 0.7) {
          actualEnd = lastMatchEnd;
        }
      }
    }
    
    chunks.push({
      text: text.slice(currentIndex, actualEnd),
      startIndex: currentIndex,
      endIndex: actualEnd,
      chunkIndex: chunkIndex++
    });
    
    // 下一个块的起始位置（考虑重叠）
    currentIndex = Math.max(actualEnd - effectiveOverlap, currentIndex + 1);
  }
  
  return chunks;
}

/**
 * 检查文本是否需要分块
 */
export function shouldChunk(text: string, modelName: string | undefined): boolean {
  if (!text) return false;
  const limit = getModelContextLimit(modelName);
  const promptOverhead = estimatePromptOverhead();
  return text.length > (limit - promptOverhead);
}

/**
 * 合并分块提取结果，去除重复项
 */
export function mergeExtractionResults<T extends { content?: string; title?: string }>(
  results: T[][]
): T[] {
  const merged: T[] = [];
  const seenContents = new Set<string>();
  
  for (const chunkResults of results) {
    if (!Array.isArray(chunkResults)) continue;
    
    for (const item of chunkResults) {
      if (!item) continue;
      
      // 使用 content 或 title 作为去重标识
      const identifier = (item.content || item.title || '').trim().toLowerCase();
      
      if (identifier && identifier.length > 0 && !seenContents.has(identifier)) {
        seenContents.add(identifier);
        merged.push(item);
      }
    }
  }
  
  return merged;
}
