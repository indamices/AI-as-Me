
import { Memory, InsightProposal, MemoryCategory } from './types';

/**
 * Calculate Jaccard similarity between two texts
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 0));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 0));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Calculate Levenshtein distance (edit distance)
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
 * Calculate similarity based on Levenshtein distance
 */
export function levenshteinSimilarity(text1: string, text2: string): number {
  const maxLen = Math.max(text1.length, text2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(text1.toLowerCase(), text2.toLowerCase());
  return 1 - distance / maxLen;
}

/**
 * Calculate cosine similarity (based on word frequency)
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
 * Calculate text similarity (combines multiple methods)
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
    // Combined method: average of multiple algorithms
    const jaccard = jaccardSimilarity(text1, text2);
    const cosine = cosineSimilarity(text1, text2);
    const levenshtein = levenshteinSimilarity(text1, text2);
    return (jaccard * 0.4 + cosine * 0.4 + levenshtein * 0.2);
  }
}

/**
 * Find similar memories
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

  // 1. Filter by category first
  const sameCategoryMemories = existingMemories.filter(
    m => m.status === 'ACTIVE' && 
    (proposalCategory ? m.category === proposalCategory : true)
  );

  // 2. Calculate semantic similarity
  for (const memory of sameCategoryMemories) {
    const similarity = calculateSimilarity(proposalContent, memory.content, 'combined');
    
    if (similarity >= threshold) {
      let reason = '';
      if (similarity >= 0.9) {
        reason = 'Highly similar, likely duplicate memory';
      } else if (similarity >= 0.8) {
        reason = 'Very similar, recommend merging';
      } else {
        reason = 'Moderately similar, check if merge needed';
      }
      
      matches.push({ memory, similarity, reason });
    }
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);
  
  return matches;
}

/**
 * Calculate quality score
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
  
  // Quality score formula
  return (
    confidence * 0.4 +           // AI confidence
    evidenceStrength * 0.3 +      // Evidence strength
    generalization * 0.2 +        // Generalization
    consistency * 0.1            // Consistency
  );
}

/**
 * Calculate merged confidence after memory consolidation
 */
export function calculateMergedConfidence(
  existing: Memory,
  proposal: InsightProposal,
  evidenceCount: number
): number {
  // Dynamic adjustment based on evidence count
  const evidenceWeight = Math.min(evidenceCount / 5, 1.0);
  const proposalWeight = (proposal.confidence || 0.8) * (proposal.evidenceStrength || 0.7);
  
  // Weighted average, biased towards higher confidence
  return Math.min(1.0,
    existing.confidence * 0.6 +
    proposalWeight * 0.4 +
    evidenceWeight * 0.1
  );
}
