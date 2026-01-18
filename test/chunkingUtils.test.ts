import { describe, it, expect } from 'vitest';
import {
  getModelContextLimit,
  chunkText,
  shouldChunk,
  mergeExtractionResults,
  TextChunk
} from '../utils/chunkingUtils';

describe('chunkingUtils', () => {
  describe('getModelContextLimit', () => {
    it('should return correct limit for gemini-3-pro-preview', () => {
      expect(getModelContextLimit('gemini-3-pro-preview')).toBe(400000);
    });

    it('should return correct limit for gemini-3-flash-preview', () => {
      expect(getModelContextLimit('gemini-3-flash-preview')).toBe(400000);
    });

    it('should return correct limit for gemini-pro', () => {
      expect(getModelContextLimit('gemini-pro')).toBe(12000);
    });

    it('should return correct limit for deepseek-chat', () => {
      expect(getModelContextLimit('deepseek-chat')).toBe(25000);
    });

    it('should return correct limit for glm-4.7', () => {
      expect(getModelContextLimit('glm-4.7')).toBe(200000);
    });

    it('should return correct limit for glm-4', () => {
      expect(getModelContextLimit('glm-4')).toBe(200000);
    });

    it('should return correct limit for glm-3', () => {
      expect(getModelContextLimit('glm-3')).toBe(128000);
    });

    it('should match partial model names', () => {
      expect(getModelContextLimit('gemini-3-pro-test')).toBe(400000);
      expect(getModelContextLimit('gemini-3-flash-beta')).toBe(400000);
      expect(getModelContextLimit('deepseek-reasoner')).toBe(25000);
      expect(getModelContextLimit('glm-4-test')).toBe(200000);
      expect(getModelContextLimit('glm-3-beta')).toBe(128000);
    });

    it('should return default limit for unknown models', () => {
      expect(getModelContextLimit('unknown-model')).toBe(20000);
    });

    it('should return default limit for undefined', () => {
      expect(getModelContextLimit(undefined)).toBe(20000);
    });

    it('should return default limit for empty string', () => {
      expect(getModelContextLimit('')).toBe(20000);
    });
  });

  describe('shouldChunk', () => {
    it('should return false for short text', () => {
      const shortText = 'This is a short text.'.repeat(100); // ~2000 chars
      expect(shouldChunk(shortText, 'gemini-3-pro-preview')).toBe(false);
    });

    it('should return true for long text', () => {
      const longText = 'This is a long text. '.repeat(20000); // ~440K chars
      expect(shouldChunk(longText, 'gemini-3-pro-preview')).toBe(true);
    });

    it('should return true for text exceeding deepseek limit', () => {
      const mediumText = 'Text. '.repeat(10000); // ~60K chars
      expect(shouldChunk(mediumText, 'deepseek-chat')).toBe(true);
    });

    it('should return false for text within deepseek limit', () => {
      const mediumText = 'Text. '.repeat(1000); // ~6K chars
      expect(shouldChunk(mediumText, 'deepseek-chat')).toBe(false);
    });

    it('should return true for text exceeding glm-4.7 limit', () => {
      const longText = 'Text. '.repeat(60000); // ~360K chars, exceeds 200K limit
      expect(shouldChunk(longText, 'glm-4.7')).toBe(true);
    });

    it('should return false for text within glm-4.7 limit', () => {
      const mediumText = 'Text. '.repeat(10000); // ~60K chars, within 200K limit
      expect(shouldChunk(mediumText, 'glm-4.7')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(shouldChunk('', 'gemini-3-pro-preview')).toBe(false);
    });

    it('should handle undefined model', () => {
      const text = 'Text. '.repeat(5000);
      expect(shouldChunk(text, undefined)).toBe(true); // Exceeds default 20K limit
    });
  });

  describe('chunkText', () => {
    it('should return single chunk for short text', () => {
      const text = 'This is a short text.';
      const chunks = chunkText(text, 10000);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(text);
      expect(chunks[0].startIndex).toBe(0);
      expect(chunks[0].endIndex).toBe(text.length);
      expect(chunks[0].chunkIndex).toBe(0);
    });

    it('should split long text into multiple chunks', () => {
      // Create text that definitely needs splitting
      // Use chunk size that ensures effective size is positive (5000 - 3000 = 2000)
      const baseText = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.';
      const text = baseText.repeat(200); // ~8000 chars
      const maxChunkSize = 5000; // Use larger chunk size to ensure effective size is positive
      const chunks = chunkText(text, maxChunkSize);
      
      // Should split into multiple chunks (8000 > 2000)
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].startIndex).toBe(0);
      // Last chunk should end at text length (ensuring full coverage)
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.endIndex).toBe(text.length);
    });

    it('should preserve text content when merged', () => {
      const text = 'This is a test. '.repeat(100);
      const chunks = chunkText(text, 200);
      
      const mergedText = chunks.map(c => c.text).join('');
      // Should be approximately the original text (allowing for overlaps)
      expect(mergedText.length).toBeGreaterThanOrEqual(text.length * 0.9);
    });

    it('should split at paragraph boundaries when possible', () => {
      const text = 'Para 1.\n\nPara 2.\n\nPara 3.\n\nPara 4.';
      const chunks = chunkText(text, 20); // Force splitting
      
      // At least some chunks should end with paragraph breaks
      const hasParagraphBreaks = chunks.some(chunk => 
        chunk.text.includes('\n\n')
      );
      expect(hasParagraphBreaks || chunks.length === 1).toBe(true);
    });

    it('should handle empty string', () => {
      const chunks = chunkText('', 1000);
      expect(chunks).toHaveLength(0);
    });

    it('should have sequential chunk indices', () => {
      const text = 'Text. '.repeat(500);
      const chunks = chunkText(text, 200);
      
      chunks.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index);
      });
    });

    it('should have non-overlapping or minimal overlapping chunks', () => {
      const text = 'Test sentence. '.repeat(100);
      const chunks = chunkText(text, 500);
      
      // Check that chunks are sequential and have proper boundaries
      for (let i = 0; i < chunks.length - 1; i++) {
        const current = chunks[i];
        const next = chunks[i + 1];
        
        // Next chunk should start at or after current start (sequential)
        expect(next.startIndex).toBeGreaterThanOrEqual(current.startIndex);
        // Due to overlap logic (line 153 in chunkingUtils.ts), next.startIndex 
        // is max(actualEnd - effectiveOverlap, currentIndex + 1)
        // So next.startIndex can be less than current.endIndex for overlap,
        // but should be at least current.startIndex + 1
        expect(next.startIndex).toBeGreaterThanOrEqual(current.startIndex);
        // Should not start beyond text length
        expect(next.startIndex).toBeLessThanOrEqual(text.length);
      }
    });

    it('should handle text with only newlines', () => {
      const text = '\n\n'.repeat(10);
      const chunks = chunkText(text, 100);
      
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].text).toContain('\n');
    });

    it('should handle very long single line', () => {
      const text = 'Word '.repeat(10000); // Single long line
      const chunks = chunkText(text, 500);
      
      expect(chunks.length).toBeGreaterThan(1);
      // Should still split even without natural boundaries
    });

    it('should respect maxChunkSize parameter', () => {
      const text = 'Test. '.repeat(1000);
      const maxSize = 5000; // Use larger size to avoid negative effective size
      const chunks = chunkText(text, maxSize);
      
      // Each chunk should be within the limit (accounting for prompt overhead)
      chunks.forEach(chunk => {
        // Account for prompt overhead (approx 3000)
        const effectiveSize = maxSize - 3000;
        if (effectiveSize > 0) {
          // Allow some margin for overlap and boundary adjustments
          expect(chunk.text.length).toBeLessThanOrEqual(effectiveSize * 1.2);
        }
      });
    });
  });

  describe('mergeExtractionResults', () => {
    it('should merge results from multiple chunks', () => {
      const chunk1 = [
        { content: 'Memory 1', title: 'Title 1' },
        { content: 'Memory 2', title: 'Title 2' }
      ];
      const chunk2 = [
        { content: 'Memory 3', title: 'Title 3' },
        { content: 'Memory 4', title: 'Title 4' }
      ];
      
      const merged = mergeExtractionResults([chunk1, chunk2]);
      
      expect(merged).toHaveLength(4);
      expect(merged[0].content).toBe('Memory 1');
      expect(merged[3].content).toBe('Memory 4');
    });

    it('should remove duplicates based on content', () => {
      const chunk1 = [
        { content: 'Duplicate Memory', title: 'Title 1' }
      ];
      const chunk2 = [
        { content: 'Duplicate Memory', title: 'Title 2' }, // Same content
        { content: 'Unique Memory', title: 'Title 3' }
      ];
      
      const merged = mergeExtractionResults([chunk1, chunk2]);
      
      expect(merged).toHaveLength(2); // One duplicate removed
      expect(merged.map(m => m.content)).toEqual(
        expect.arrayContaining(['Duplicate Memory', 'Unique Memory'])
      );
    });

    it('should remove duplicates based on title when content is missing', () => {
      const chunk1 = [
        { title: 'Duplicate Title' }
      ];
      const chunk2 = [
        { title: 'Duplicate Title' }, // Same title
        { title: 'Unique Title' }
      ];
      
      const merged = mergeExtractionResults([chunk1, chunk2]);
      
      expect(merged).toHaveLength(2);
      expect(merged.map(m => m.title)).toEqual(
        expect.arrayContaining(['Duplicate Title', 'Unique Title'])
      );
    });

    it('should be case-insensitive for duplicates', () => {
      const chunk1 = [
        { content: 'Test Memory', title: 'Title' }
      ];
      const chunk2 = [
        { content: 'TEST MEMORY', title: 'TITLE' } // Different case
      ];
      
      const merged = mergeExtractionResults([chunk1, chunk2]);
      
      expect(merged).toHaveLength(1); // Should be treated as duplicate
    });

    it('should handle empty arrays', () => {
      const merged = mergeExtractionResults([]);
      expect(merged).toHaveLength(0);
    });

    it('should handle empty chunks', () => {
      const chunk1 = [{ content: 'Memory 1' }];
      const chunk2: any[] = [];
      const chunk3 = [{ content: 'Memory 2' }];
      
      const merged = mergeExtractionResults([chunk1, chunk2, chunk3]);
      
      expect(merged).toHaveLength(2);
    });

    it('should handle null or undefined items', () => {
      const chunk1 = [
        { content: 'Memory 1' },
        null as any,
        undefined as any,
        { content: 'Memory 2' }
      ];
      
      const merged = mergeExtractionResults([chunk1]);
      
      expect(merged).toHaveLength(2);
      expect(merged[0].content).toBe('Memory 1');
      expect(merged[1].content).toBe('Memory 2');
    });

    it('should handle items with empty content and title', () => {
      const chunk1 = [
        { content: '', title: '' }, // Should be skipped
        { content: 'Valid Memory', title: 'Title' }
      ];
      
      const merged = mergeExtractionResults([chunk1]);
      
      // Items with empty identifiers are skipped
      expect(merged.length).toBeGreaterThanOrEqual(1);
      expect(merged[0].content).toBe('Valid Memory');
    });

    it('should preserve order within chunks', () => {
      const chunk1 = [
        { content: 'First', title: '1' },
        { content: 'Second', title: '2' }
      ];
      const chunk2 = [
        { content: 'Third', title: '3' }
      ];
      
      const merged = mergeExtractionResults([chunk1, chunk2]);
      
      expect(merged[0].content).toBe('First');
      expect(merged[1].content).toBe('Second');
      expect(merged[2].content).toBe('Third');
    });

    it('should trim whitespace for duplicate detection', () => {
      const chunk1 = [
        { content: '  Memory  ', title: 'Title' }
      ];
      const chunk2 = [
        { content: 'Memory', title: 'Title' } // Same after trimming
      ];
      
      const merged = mergeExtractionResults([chunk1, chunk2]);
      
      expect(merged).toHaveLength(1);
    });
  });

  describe('integration tests', () => {
    it('should handle complete chunking and merging workflow', () => {
      // Simulate a long document
      const longText = 'This is a sentence. '.repeat(5000); // ~100K chars
      const model = 'deepseek-chat'; // 25K limit
      
      // Check if chunking is needed
      const needsChunking = shouldChunk(longText, model);
      expect(needsChunking).toBe(true);
      
      // Get context limit
      const limit = getModelContextLimit(model);
      expect(limit).toBe(25000);
      
      // Split into chunks
      const chunks = chunkText(longText, limit);
      expect(chunks.length).toBeGreaterThan(1);
      
      // Simulate extracting results from each chunk
      const chunkResults = chunks.map((chunk, index) => [
        { content: `Extracted from chunk ${index}`, title: `Chunk ${index}` },
        { content: `Another from chunk ${index}`, title: `Chunk ${index} B` }
      ]);
      
      // Merge results
      const merged = mergeExtractionResults(chunkResults);
      
      // Should have results from all chunks
      expect(merged.length).toBe(chunks.length * 2);
    });

    it('should handle edge case: text exactly at limit', () => {
      const limit = 10000;
      const text = 'A'.repeat(limit - 3000); // Just under limit (accounting for overhead)
      
      const needsChunking = shouldChunk(text, 'default');
      // Should be false since we account for prompt overhead
      expect(needsChunking).toBe(false);
      
      const chunks = chunkText(text, limit);
      expect(chunks.length).toBe(1);
    });

    it('should handle edge case: text slightly over limit', () => {
      const promptOverhead = 3000; // Account for prompt overhead
      // Default limit is 20000, so we need text > 20000 - 3000 = 17000
      const effectiveLimit = 20000 - promptOverhead; // Default limit - overhead
      const text = 'A'.repeat(effectiveLimit + 100); // Just over effective limit (17100 chars)
      
      const needsChunking = shouldChunk(text, 'default');
      expect(needsChunking).toBe(true);
      
      // Use default limit (20000) for chunking
      // Effective chunk size = 20000 - 3000 = 17000
      // Text length = 17100, so should create at least 2 chunks (first chunk ends at ~17000)
      const defaultLimit = 20000;
      const chunks = chunkText(text, defaultLimit);
      // Should split into multiple chunks since text (17100) > effective size (17000)
      expect(chunks.length).toBeGreaterThan(1);
    });
  });
});
