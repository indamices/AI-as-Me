
import { Memory, InsightProposal, MemoryCategory } from './types';

/**
 * 计算两个文本的 Jaccard 相似度
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 0));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 0));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * 计算编辑距离（Levenshtein距离）
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * 计算基于编辑距离的相似度
 */
export function levenshteinSimilarity(text1: string, text2: string): number {
  const maxLen = Math.max(text1.length, text2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(text1.toLowerCase(), text2.toLowerCase());
  return 1 - distance / maxLen;
}

/**
 * 计算余弦相似度（基于词频）
 */
export function cosineSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  
  const allWords = new Set([...words1, ...words2]);
  const vec1: number[] = [];
  const vec2: number[] = [];
  
  allWords.forEach(word => {
    vec1.push(words1.filter(w => w === word).length);
    vec2.push(words2.filter(w => w === word).length);
  });
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * 计算文本相似度（综合多种方法）
 */
export function calculateSimilarity(
  text1: string,
  text2: string,
  method: 'jaccard' | 'cosine' | 'levenshtein' | 'combined' = 'combined'
): number {
  if (method === 'jaccard') {
    return jaccardSimilarity(text1, text2);
  } else if (method === 'cosine') {
    return cosineSimilarity(text1, text2);
  } else if (method === 'levenshtein') {
    return levenshteinSimilarity(text1, text2);
  } else {
    // 综合方法：取多种算法的平均值
    const jaccard = jaccardSimilarity(text1, text2);
    const cosine = cosineSimilarity(text1, text2);
    const levenshtein = levenshteinSimilarity(text1, text2);
    return (jaccard * 0.4 + cosine * 0.4 + levenshtein * 0.2);
  }
}

/**
 * 查找相似记忆
 */
export function findSimilarMemories(
  proposal: InsightProposal,
  existingMemories: Memory[],
  threshold: number = 0.7
): Array<{ memory: Memory; similarity: number; reason: string }> {
  const matches: Array<{ memory: Memory; similarity: number; reason: string }> = [];
  const proposalContent = proposal.proposedMemory.content || '';
  const proposalCategory = proposal.proposedMemory.category;

  if (!proposalContent) return matches;

  // 1. 先按分类过滤
  const sameCategoryMemories = existingMemories.filter(
    m => m.status === 'ACTIVE' && 
    (proposalCategory ? m.category === proposalCategory : true)
  );

  // 2. 计算语义相似度
  for (const memory of sameCategoryMemories) {
    const similarity = calculateSimilarity(proposalContent, memory.content, 'combined');
    
    if (similarity >= threshold) {
      let reason = '';
      if (similarity >= 0.9) {
        reason = '高度相似，可能是重复记忆';
      } else if (similarity >= 0.8) {
        reason = '非常相似，建议合并';
      } else {
        reason = '相似度较高，请检查是否需要合并';
      }
      
      matches.push({ memory, similarity, reason });
    }
  }

  // 按相似度降序排序
  matches.sort((a, b) => b.similarity - a.similarity);
  
  return matches;
}

/**
 * 计算质量评分
 */
export function calculateQualityScore(
  insight: {
    confidence: number;
    evidenceStrength: number;
    qualityIndicators?: {
      generalization?: number;
      specificity?: number;
      consistency?: number;
    };
  }
): number {
  const confidence = insight.confidence || 0.5;
  const evidenceStrength = insight.evidenceStrength || 0.5;
  
  let generalization = 0.5;
  let consistency = 0.5;
  
  if (insight.qualityIndicators) {
    generalization = insight.qualityIndicators.generalization || 0.5;
    consistency = insight.qualityIndicators.consistency || 0.5;
  }
  
  // 质量评分公式
  return (
    confidence * 0.4 +           // AI置信度
    evidenceStrength * 0.3 +      // 证据强度
    generalization * 0.2 +        // 泛化性
    consistency * 0.1            // 一致性
  );
}

/**
 * 计算合并后的置信度
 */
export function calculateMergedConfidence(
  existing: Memory,
  proposal: InsightProposal,
  evidenceCount: number
): number {
  // 基于证据数量的动态调整
  const evidenceWeight = Math.min(evidenceCount / 5, 1.0);
  const proposalWeight = (proposal.confidence || 0.8) * (proposal.evidenceStrength || 0.7);
  
  // 加权平均，但偏向更高的置信度
  return Math.min(1.0,
    existing.confidence * 0.6 +
    proposalWeight * 0.4 +
    evidenceWeight * 0.1
  );
}
