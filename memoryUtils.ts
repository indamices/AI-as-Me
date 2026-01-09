
import { Memory, InsightProposal, MemoryCategory, MemoryStatus } from './types';

/**
 * Calculate Jaccard similarity between two texts
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  // Handle null/undefined/empty inputs
  if (!text1 || !text2) {
    return text1 === text2 ? 1 : 0;
  }
  
  const words1 = new Set(String(text1).toLowerCase().split(/\s+/).filter(w => w.length > 0));
  const words2 = new Set(String(text2).toLowerCase().split(/\s+/).filter(w => w.length > 0));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Calculate Levenshtein distance (edit distance)
 * Optimized for performance with long strings by using word-level comparison
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // For very long strings, use word-level comparison for better performance
  // This is a performance optimization that trades exactness for speed
  const MAX_LENGTH = 500; // Character threshold for switching algorithms
  if (len1 > MAX_LENGTH || len2 > MAX_LENGTH) {
    // For very long strings, use word-level edit distance
    // Split into words and calculate character distance on a sample
    const words1 = str1.split(/\s+/).filter(w => w.length > 0);
    const words2 = str2.split(/\s+/).filter(w => w.length > 0);
    
    if (words1.length === 0 && words2.length === 0) return 0;
    if (words1.length === 0) return str2.length;
    if (words2.length === 0) return str1.length;
    
    // Use word-level comparison - approximate character distance
    const maxWords = Math.max(words1.length, words2.length);
    const minWords = Math.min(words1.length, words2.length);
    
    // Approximate: assume each word difference adds average word length
    const avgWordLength = Math.floor((str1.length + str2.length) / (words1.length + words2.length));
    const wordDiff = maxWords - minWords;
    
    // For matching words, calculate character distance on first N words
    const sampleSize = Math.min(10, minWords);
    let charDistance = 0;
    for (let i = 0; i < sampleSize; i++) {
      charDistance += Math.abs(words1[i].length - words2[i].length);
    }
    
    return charDistance + (wordDiff * avgWordLength);
  }
  
  // Standard Levenshtein algorithm for shorter strings
  const matrix: number[][] = [];
  
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
  // Handle null/undefined/empty inputs
  if (!text1 || !text2) {
    return text1 === text2 ? 1 : 0;
  }
  
  const str1 = String(text1).toLowerCase();
  const str2 = String(text2).toLowerCase();
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Calculate cosine similarity (based on word frequency)
 */
export function cosineSimilarity(text1: string, text2: string): number {
  // Handle null/undefined/empty inputs
  if (!text1 || !text2) {
    return text1 === text2 ? 1 : 0;
  }
  
  const words1 = String(text1).toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const words2 = String(text2).toLowerCase().split(/\s+/).filter(w => w.length > 0);
  
  if (words1.length === 0 && words2.length === 0) return 1;
  if (words1.length === 0 || words2.length === 0) return 0;
  
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
  // Handle null/undefined inputs
  if (text1 == null || text2 == null) {
    return text1 === text2 ? 1 : 0;
  }
  
  // Ensure strings are converted
  const str1 = String(text1);
  const str2 = String(text2);
  
  if (method === 'jaccard') {
    return jaccardSimilarity(str1, str2);
  } else if (method === 'cosine') {
    return cosineSimilarity(str1, str2);
  } else if (method === 'levenshtein') {
    return levenshteinSimilarity(str1, str2);
  } else {
    // Combined method: average of multiple algorithms
    const jaccard = jaccardSimilarity(str1, str2);
    const cosine = cosineSimilarity(str1, str2);
    const levenshtein = levenshteinSimilarity(str1, str2);
    const result = (jaccard * 0.4 + cosine * 0.4 + levenshtein * 0.2);
    // Ensure result is valid
    return isNaN(result) || !isFinite(result) ? 0 : Math.max(0, Math.min(1, result));
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

  // 1. Filter by category first - filter out null/undefined and inactive memories
  const sameCategoryMemories = existingMemories
    .filter((m): m is Memory => m != null && m.status === MemoryStatus.ACTIVE)
    .filter(m => proposalCategory ? m.category === proposalCategory : true);

  // 2. Calculate semantic similarity
  for (const memory of sameCategoryMemories) {
    if (!memory.content) continue; // Skip memories without content
    
    const similarity = calculateSimilarity(proposalContent, memory.content, 'combined');
    
    // Validate similarity value
    if (isNaN(similarity) || !isFinite(similarity)) continue;
    
    if (similarity >= threshold) {
      let reason = '';
      if (similarity >= 0.9) {
        reason = 'Highly similar, likely duplicate memory';
      } else if (similarity >= 0.8) {
        reason = 'Very similar, recommend merging';
      } else {
        reason = 'Moderately similar, check if merge needed';
      }
      
      matches.push({ memory, similarity: Math.max(0, Math.min(1, similarity)), reason });
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
  // Validate and clamp input values to [0, 1]
  const clamp = (value: number | undefined, defaultValue: number): number => {
    if (value == null || isNaN(value) || !isFinite(value)) return defaultValue;
    return Math.max(0, Math.min(1, value));
  };
  
  const confidence = clamp(insight.confidence, 0.5);
  const evidenceStrength = clamp(insight.evidenceStrength, 0.5);
  
  let generalization = 0.5;
  let consistency = 0.5;
  
  if (insight.qualityIndicators) {
    generalization = clamp(insight.qualityIndicators.generalization, 0.5);
    consistency = clamp(insight.qualityIndicators.consistency, 0.5);
  }
  
  // Quality score formula
  const result = (
    confidence * 0.4 +           // AI confidence
    evidenceStrength * 0.3 +      // Evidence strength
    generalization * 0.2 +        // Generalization
    consistency * 0.1            // Consistency
  );
  
  // Ensure result is valid
  return isNaN(result) || !isFinite(result) ? 0.5 : Math.max(0, Math.min(1, result));
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
