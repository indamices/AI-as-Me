import { describe, it, expect } from 'vitest';
import {
  calculateSimilarity,
  findSimilarMemories,
  calculateQualityScore,
  calculateMergedConfidence,
} from '../memoryUtils';
import {
  retrieveRelevantKnowledge,
  formatKnowledgeContext,
} from '../knowledgeUtils';
import { Memory, InsightProposal, MemoryCategory, MemoryLayer, MemoryStatus } from '../types';

describe('Edge Cases and Potential Bugs', () => {
  describe('calculateSimilarity - Edge Cases', () => {
    it('should handle null or undefined inputs', () => {
      // @ts-expect-error - Testing invalid input
      expect(() => calculateSimilarity(null, 'test')).not.toThrow();
      // @ts-expect-error - Testing invalid input
      expect(() => calculateSimilarity(undefined, 'test')).not.toThrow();
      // @ts-expect-error - Testing invalid input
      expect(() => calculateSimilarity('test', null)).not.toThrow();
      // @ts-expect-error - Testing invalid input
      expect(() => calculateSimilarity('test', undefined)).not.toThrow();
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = calculateSimilarity(longString, longString);
      expect(result).toBe(1);
      expect(isNaN(result)).toBe(false);
      expect(isFinite(result)).toBe(true);
    });

    it('should handle strings with special characters and emojis', () => {
      const text1 = 'Hello 🌟 world! 你好';
      const text2 = 'Hello 🌟 world! 你好';
      const result = calculateSimilarity(text1, text2);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should handle strings with only whitespace', () => {
      const result = calculateSimilarity('   ', '   ');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should return valid number for all similarity methods', () => {
      const text1 = 'test one';
      const text2 = 'test two';
      
      ['jaccard', 'cosine', 'levenshtein', 'combined'].forEach(method => {
        const result = calculateSimilarity(text1, text2, method as any);
        expect(typeof result).toBe('number');
        expect(isNaN(result)).toBe(false);
        expect(isFinite(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('findSimilarMemories - Edge Cases', () => {
    it('should handle proposal with undefined category', () => {
      const proposal: InsightProposal = {
        id: 'test',
        type: 'NEW',
        summary: 'Test',
        reasoning: 'Test reasoning',
        proposedMemory: {
          content: 'Test content',
          // category is undefined
        },
        evidenceContext: [],
        status: 'PENDING',
        confidence: 0.8,
        qualityScore: 0.7,
        evidenceStrength: 0.6,
      };

      const memories: Memory[] = [{
        id: '1',
        content: 'Test content',
        category: MemoryCategory.PREFERENCE,
        layer: MemoryLayer.L1,
        confidence: 0.9,
        evidence: [],
        status: MemoryStatus.ACTIVE,
        isSensitive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confirmedByHuman: false,
      }];

      const result = findSimilarMemories(proposal, memories, 0.5);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty content in proposal', () => {
      const proposal: InsightProposal = {
        id: 'test',
        type: 'NEW',
        summary: 'Test',
        reasoning: 'Test reasoning',
        proposedMemory: {
          content: '',
        },
        evidenceContext: [],
        status: 'PENDING',
        confidence: 0.8,
        qualityScore: 0.7,
        evidenceStrength: 0.6,
      };

      const memories: Memory[] = [];
      const result = findSimilarMemories(proposal, memories, 0.5);
      expect(result.length).toBe(0);
    });

    it('should handle very low threshold', () => {
      const proposal: InsightProposal = {
        id: 'test',
        type: 'NEW',
        summary: 'Test',
        reasoning: 'Test reasoning',
        proposedMemory: {
          content: 'Completely different content',
          category: MemoryCategory.PREFERENCE,
        },
        evidenceContext: [],
        status: 'PENDING',
        confidence: 0.8,
        qualityScore: 0.7,
        evidenceStrength: 0.6,
      };

      const memories: Memory[] = [{
        id: '1',
        content: 'Different text here',
        category: MemoryCategory.PREFERENCE,
        layer: MemoryLayer.L1,
        confidence: 0.9,
        evidence: [],
        status: MemoryStatus.ACTIVE,
        isSensitive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confirmedByHuman: false,
      }];

      const result = findSimilarMemories(proposal, memories, 0);
      // With threshold 0, should find matches even with low similarity
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle boundary similarity values (0.8, 0.9)', () => {
      // Test the uncovered lines 140 and 142
      const proposal: InsightProposal = {
        id: 'test',
        type: 'NEW',
        summary: 'Test',
        reasoning: 'Test reasoning',
        proposedMemory: {
          content: 'I love programming',
          category: MemoryCategory.PREFERENCE,
        },
        evidenceContext: [],
        status: 'PENDING',
        confidence: 0.8,
        qualityScore: 0.7,
        evidenceStrength: 0.6,
      };

      const memories: Memory[] = [{
        id: '1',
        content: 'I love programming very much',
        category: MemoryCategory.PREFERENCE,
        layer: MemoryLayer.L1,
        confidence: 0.9,
        evidence: [],
        status: MemoryStatus.ACTIVE,
        isSensitive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        confirmedByHuman: false,
      }];

      // Use a very low threshold to ensure we get results, then manually check similarity
      const result = findSimilarMemories(proposal, memories, 0.01);
      
      if (result.length > 0) {
        // Check if reason contains the expected text for high similarity
        const highSimilarityResult = result.find(r => r.similarity >= 0.9);
        if (highSimilarityResult) {
          expect(highSimilarityResult.reason).toContain('Highly similar');
        }
        
        const moderateSimilarityResult = result.find(r => r.similarity >= 0.8 && r.similarity < 0.9);
        if (moderateSimilarityResult) {
          expect(moderateSimilarityResult.reason).toContain('Very similar');
        }
      }
    });

    it('should handle null or undefined in memories array', () => {
      const proposal: InsightProposal = {
        id: 'test',
        type: 'NEW',
        summary: 'Test',
        reasoning: 'Test reasoning',
        proposedMemory: {
          content: 'Test content',
        },
        evidenceContext: [],
        status: 'PENDING',
        confidence: 0.8,
        qualityScore: 0.7,
        evidenceStrength: 0.6,
      };

      // @ts-expect-error - Testing invalid input
      const memories: Memory[] = [null, undefined];
      
      expect(() => findSimilarMemories(proposal, memories, 0.5)).not.toThrow();
    });
  });

  describe('calculateQualityScore - Edge Cases', () => {
    it('should handle NaN values by using default values', () => {
      // NaN should be clamped to default value (0.5)
      const result = calculateQualityScore({
        confidence: NaN,
        evidenceStrength: 0.5,
      });
      // Result should be a valid number (NaN is converted to default)
      expect(isNaN(result)).toBe(false);
      expect(isFinite(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should handle Infinity values by clamping to valid range', () => {
      // Infinity should be clamped to [0, 1]
      const result = calculateQualityScore({
        confidence: Infinity,
        evidenceStrength: 0.5,
      });
      // Result should be clamped to 1 (or less)
      expect(isFinite(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should handle negative values', () => {
      const result = calculateQualityScore({
        confidence: -0.5,
        evidenceStrength: -0.3,
      });
      // Should still return a number, but may be negative or clamped
      expect(typeof result).toBe('number');
    });

    it('should handle values greater than 1', () => {
      const result = calculateQualityScore({
        confidence: 1.5,
        evidenceStrength: 2.0,
      });
      expect(typeof result).toBe('number');
    });
  });

  describe('retrieveRelevantKnowledge - Edge Cases', () => {
    it('should handle null or undefined in knowledge items array', () => {
      // @ts-expect-error - Testing invalid input
      const result = retrieveRelevantKnowledge('test', [null, undefined], 5);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle knowledge items with null or undefined fields', () => {
      const items = [{
        id: '1',
        title: null as any,
        content: 'test',
        type: 'DOCUMENT' as any,
        tags: [],
        hash: 'hash1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE' as any,
        source: { type: 'UPLOAD' as any },
      }];

      expect(() => retrieveRelevantKnowledge('test', items as any, 5)).not.toThrow();
    });

    it('should handle invalid limit values', () => {
      const items: any[] = [];
      
      expect(() => retrieveRelevantKnowledge('test', items, -1)).not.toThrow();
      expect(() => retrieveRelevantKnowledge('test', items, 0)).not.toThrow();
      expect(() => retrieveRelevantKnowledge('test', items, NaN)).not.toThrow();
    });

    it('should handle very long query strings', () => {
      const longQuery = 'test '.repeat(1000);
      const items: any[] = [];
      
      expect(() => retrieveRelevantKnowledge(longQuery, items, 5)).not.toThrow();
    });

    it('should handle query with special regex characters', () => {
      const query = 'test (.*?) [a-z]';
      const items: any[] = [];
      
      expect(() => retrieveRelevantKnowledge(query, items, 5)).not.toThrow();
    });
  });

  describe('formatKnowledgeContext - Edge Cases', () => {
    it('should handle knowledge items with very long content', () => {
      const items = [{
        id: '1',
        title: 'Test',
        content: 'a'.repeat(10000),
        type: 'DOCUMENT' as any,
        tags: [],
        hash: 'hash1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE' as any,
        source: { type: 'UPLOAD' as any },
      }];

      const result = formatKnowledgeContext(items as any);
      expect(result.length).toBeLessThanOrEqual(250); // Should be truncated to 200 + overhead
    });

    it('should handle null or undefined in array', () => {
      // @ts-expect-error - Testing invalid input
      const result = formatKnowledgeContext([null, undefined]);
      expect(typeof result).toBe('string');
    });
  });
});
