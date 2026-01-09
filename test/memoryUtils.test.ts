import { describe, it, expect } from 'vitest';
import {
  jaccardSimilarity,
  cosineSimilarity,
  levenshteinSimilarity,
  calculateSimilarity,
  findSimilarMemories,
  calculateQualityScore,
  calculateMergedConfidence,
} from '../memoryUtils';
import { Memory, InsightProposal, MemoryCategory, MemoryLayer, MemoryStatus } from '../types';

describe('memoryUtils', () => {
  describe('jaccardSimilarity', () => {
    it('should return 1 for identical texts', () => {
      const text = 'This is a test';
      expect(jaccardSimilarity(text, text)).toBe(1);
    });

    it('should return 0 for completely different texts', () => {
      expect(jaccardSimilarity('apple banana', 'zebra elephant')).toBe(0);
    });

    it('should calculate similarity for partially matching texts', () => {
      const similarity = jaccardSimilarity('I like apples', 'I like bananas');
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle empty strings', () => {
      // Two empty strings are identical, so similarity should be 1
      expect(jaccardSimilarity('', '')).toBe(1);
      // One empty and one non-empty should have similarity 0
      expect(jaccardSimilarity('test', '')).toBe(0);
    });

    it('should be case insensitive', () => {
      expect(jaccardSimilarity('TEST', 'test')).toBe(1);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical texts', () => {
      const text = 'This is a test';
      expect(cosineSimilarity(text, text)).toBe(1);
    });

    it('should return 0 for orthogonal texts', () => {
      const similarity = cosineSimilarity('apple', 'banana');
      expect(similarity).toBe(0);
    });

    it('should calculate similarity for similar texts', () => {
      const similarity = cosineSimilarity('I love programming', 'I love coding');
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });
  });

  describe('levenshteinSimilarity', () => {
    it('should return 1 for identical texts', () => {
      const text = 'This is a test';
      expect(levenshteinSimilarity(text, text)).toBe(1);
    });

    it('should calculate similarity for similar texts', () => {
      const similarity = levenshteinSimilarity('hello', 'hallo');
      expect(similarity).toBeGreaterThan(0.5);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle empty strings', () => {
      expect(levenshteinSimilarity('', '')).toBe(1);
      expect(levenshteinSimilarity('test', '')).toBe(0);
    });
  });

  describe('calculateSimilarity', () => {
    it('should use jaccard method when specified', () => {
      const result = calculateSimilarity('test one', 'test two', 'jaccard');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should use cosine method when specified', () => {
      const result = calculateSimilarity('test one', 'test two', 'cosine');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should use levenshtein method when specified', () => {
      const result = calculateSimilarity('test one', 'test two', 'levenshtein');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should use combined method by default', () => {
      const result = calculateSimilarity('test one', 'test two', 'combined');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should use combined method when no method specified', () => {
      const result = calculateSimilarity('test one', 'test two');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('findSimilarMemories', () => {
    const mockMemory: Memory = {
      id: '1',
      content: 'I love programming in TypeScript',
      category: MemoryCategory.PREFERENCE,
      layer: MemoryLayer.L1,
      confidence: 0.9,
      evidence: ['Evidence 1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: MemoryStatus.ACTIVE,
      isSensitive: false,
      confirmedByHuman: false,
    };

    const mockProposal: InsightProposal = {
      id: 'proposal-1',
      type: 'NEW',
      summary: 'Test proposal summary',
      reasoning: 'Test reasoning',
      proposedMemory: {
        content: 'I love programming',
        category: MemoryCategory.PREFERENCE,
        layer: MemoryLayer.L1,
      },
      evidenceContext: ['Evidence 1', 'Evidence 2'],
      status: 'PENDING',
      confidence: 0.8,
      qualityScore: 0.75,
      evidenceStrength: 0.7,
    };

    it('should find similar memories above threshold', () => {
      const matches = findSimilarMemories(mockProposal, [mockMemory], 0.5);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].similarity).toBeGreaterThanOrEqual(0.5);
    });

    it('should return empty array when no matches above threshold', () => {
      const differentProposal: InsightProposal = {
        ...mockProposal,
        proposedMemory: {
          content: 'Completely different content about cooking',
          category: MemoryCategory.PREFERENCE,
          layer: MemoryLayer.L1,
        },
      };
      const matches = findSimilarMemories(differentProposal, [mockMemory], 0.9);
      expect(matches.length).toBe(0);
    });

    it('should filter by category when specified', () => {
      const differentCategoryMemory: Memory = {
        ...mockMemory,
        id: '2',
        category: MemoryCategory.VALUE,
      };
      const matches = findSimilarMemories(mockProposal, [mockMemory, differentCategoryMemory], 0.5);
      expect(matches.every(m => m.memory.category === MemoryCategory.PREFERENCE)).toBe(true);
    });

    it('should sort by similarity descending', () => {
      const memory2: Memory = {
        ...mockMemory,
        id: '2',
        content: 'I really love programming and coding',
      };
      const matches = findSimilarMemories(mockProposal, [mockMemory, memory2], 0.5);
      if (matches.length > 1) {
        expect(matches[0].similarity).toBeGreaterThanOrEqual(matches[1].similarity);
      }
    });

    it('should only check ACTIVE memories', () => {
      const inactiveMemory: Memory = {
        ...mockMemory,
        id: '3',
        status: MemoryStatus.ARCHIVED,
      };
      const matches = findSimilarMemories(mockProposal, [inactiveMemory], 0.5);
      expect(matches.length).toBe(0);
    });
  });

  describe('calculateQualityScore', () => {
    it('should calculate quality score with all indicators', () => {
      const score = calculateQualityScore({
        confidence: 0.8,
        evidenceStrength: 0.7,
        qualityIndicators: {
          generalization: 0.9,
          specificity: 0.6,
          consistency: 0.8,
        },
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(score).toBeGreaterThan(0.5); // Should be reasonably high with good inputs
    });

    it('should calculate quality score with minimal inputs', () => {
      const score = calculateQualityScore({
        confidence: 0.5,
        evidenceStrength: 0.5,
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle missing optional fields', () => {
      const score = calculateQualityScore({
        confidence: 0.9,
        evidenceStrength: 0.8,
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should weight confidence more heavily', () => {
      const highConfidence = calculateQualityScore({
        confidence: 1.0,
        evidenceStrength: 0.5,
      });
      const lowConfidence = calculateQualityScore({
        confidence: 0.0,
        evidenceStrength: 0.5,
      });
      expect(highConfidence).toBeGreaterThan(lowConfidence);
    });
  });

  describe('calculateMergedConfidence', () => {
    const mockMemory: Memory = {
      id: '1',
      content: 'Test memory',
      category: MemoryCategory.PREFERENCE,
      layer: MemoryLayer.L1,
      confidence: 0.8,
      evidence: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: MemoryStatus.ACTIVE,
      isSensitive: false,
      confirmedByHuman: false,
    };

    const mockProposal: InsightProposal = {
      id: 'proposal-1',
      type: 'NEW',
      summary: 'Test proposal',
      reasoning: 'Test reasoning',
      proposedMemory: {
        content: 'Test proposal',
        category: MemoryCategory.PREFERENCE,
        layer: MemoryLayer.L1,
      },
      evidenceContext: ['Evidence'],
      status: 'PENDING',
      confidence: 0.9,
      qualityScore: 0.8,
      evidenceStrength: 0.8,
    };

    it('should calculate merged confidence', () => {
      const merged = calculateMergedConfidence(mockMemory, mockProposal, 3);
      expect(merged).toBeGreaterThanOrEqual(0);
      expect(merged).toBeLessThanOrEqual(1);
    });

    it('should increase with more evidence', () => {
      const lowEvidence = calculateMergedConfidence(mockMemory, mockProposal, 1);
      const highEvidence = calculateMergedConfidence(mockMemory, mockProposal, 10);
      expect(highEvidence).toBeGreaterThanOrEqual(lowEvidence);
    });

    it('should cap at 1.0', () => {
      const veryHighConfidenceMemory: Memory = {
        ...mockMemory,
        confidence: 1.0,
      };
      const veryHighConfidenceProposal: InsightProposal = {
        ...mockProposal,
        confidence: 1.0,
        evidenceStrength: 1.0,
      };
      const merged = calculateMergedConfidence(
        veryHighConfidenceMemory,
        veryHighConfidenceProposal,
        100
      );
      expect(merged).toBeLessThanOrEqual(1.0);
    });
  });
});
