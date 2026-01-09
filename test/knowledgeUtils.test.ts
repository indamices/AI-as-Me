import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateContentHash,
  retrieveRelevantKnowledge,
  formatKnowledgeContext,
} from '../knowledgeUtils';
import { KnowledgeItem, KnowledgeType } from '../types';

describe('knowledgeUtils', () => {
  describe('calculateContentHash', () => {
    it('should generate consistent hash for same content', async () => {
      const content = 'This is a test content';
      const hash1 = await calculateContentHash(content);
      const hash2 = await calculateContentHash(content);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', async () => {
      const hash1 = await calculateContentHash('Content 1');
      const hash2 = await calculateContentHash('Content 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should normalize whitespace and case', async () => {
      const hash1 = await calculateContentHash('  Test Content  ');
      const hash2 = await calculateContentHash('test content');
      expect(hash1).toBe(hash2);
    });

    it('should generate valid SHA-256 hash format', async () => {
      const hash = await calculateContentHash('test');
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 is 64 hex characters
    });

    it('should handle empty string', async () => {
      const hash = await calculateContentHash('');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });
  });

  describe('retrieveRelevantKnowledge', () => {
    const mockKnowledgeItems: KnowledgeItem[] = [
      {
        id: '1',
        title: 'TypeScript Basics',
        content: 'TypeScript is a typed superset of JavaScript',
        type: KnowledgeType.DOCUMENT,
        tags: ['typescript', 'programming', 'javascript'],
        hash: 'hash1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        source: { type: 'UPLOAD', filename: 'test.txt' },
      },
      {
        id: '2',
        title: 'React Hooks',
        content: 'React Hooks allow you to use state in functional components',
        type: KnowledgeType.REFERENCE,
        tags: ['react', 'hooks', 'frontend'],
        hash: 'hash2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        source: { type: 'UPLOAD', filename: 'test2.txt' },
      },
      {
        id: '3',
        title: 'Cooking Tips',
        content: 'Always preheat your oven before baking',
        type: KnowledgeType.FACT,
        tags: ['cooking', 'baking'],
        hash: 'hash3',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        source: { type: 'CHAT' },
      },
    ];

    it('should retrieve relevant knowledge by title match', () => {
      const results = retrieveRelevantKnowledge('TypeScript', mockKnowledgeItems, 5);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('TypeScript');
    });

    it('should retrieve relevant knowledge by tag match', () => {
      const results = retrieveRelevantKnowledge('react', mockKnowledgeItems, 5);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(k => k.tags.includes('react'))).toBe(true);
    });

    it('should retrieve relevant knowledge by content keyword', () => {
      const results = retrieveRelevantKnowledge('JavaScript', mockKnowledgeItems, 5);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(k => k.content.includes('JavaScript'))).toBe(true);
    });

    it('should limit results to specified limit', () => {
      const results = retrieveRelevantKnowledge('programming', mockKnowledgeItems, 1);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array for irrelevant query', () => {
      const results = retrieveRelevantKnowledge('astrophysics', mockKnowledgeItems, 5);
      expect(results.length).toBe(0);
    });

    it('should only include ACTIVE knowledge items', () => {
      const inactiveItem: KnowledgeItem = {
        ...mockKnowledgeItems[0],
        id: '4',
        status: 'ARCHIVED' as const,
      };
      const allItems = [...mockKnowledgeItems, inactiveItem];
      const results = retrieveRelevantKnowledge('TypeScript', allItems, 5);
      expect(results.every(k => k.status === 'ACTIVE')).toBe(true);
      expect(results.some(k => k.id === '4')).toBe(false);
    });

    it('should sort by relevance score', () => {
      const results = retrieveRelevantKnowledge('TypeScript programming', mockKnowledgeItems, 5);
      // First result should be most relevant
      expect(results[0].title).toContain('TypeScript');
    });

    it('should handle empty query', () => {
      const results = retrieveRelevantKnowledge('', mockKnowledgeItems, 5);
      expect(results.length).toBe(0);
    });

    it('should handle empty knowledge array', () => {
      const results = retrieveRelevantKnowledge('test', [], 5);
      expect(results.length).toBe(0);
    });
  });

  describe('formatKnowledgeContext', () => {
    const mockKnowledgeItems: KnowledgeItem[] = [
      {
        id: '1',
        title: 'Test Knowledge',
        content: 'This is a test knowledge item with some content that might be longer than expected',
        type: KnowledgeType.DOCUMENT,
        tags: ['test'],
        hash: 'hash1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        source: { type: 'UPLOAD', filename: 'test.txt' },
      },
      {
        id: '2',
        title: 'Short Knowledge',
        content: 'Short',
        type: KnowledgeType.NOTE,
        tags: [],
        hash: 'hash2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        source: { type: 'CHAT' },
      },
    ];

    it('should format knowledge items as context string', () => {
      const context = formatKnowledgeContext(mockKnowledgeItems);
      expect(context).toContain('Test Knowledge');
      expect(context).toContain('Short Knowledge');
      expect(context).toContain('[DOCUMENT]');
      expect(context).toContain('[NOTE]');
    });

    it('should truncate long content to 200 characters', () => {
      const longContentItem: KnowledgeItem = {
        ...mockKnowledgeItems[0],
        id: '3',
        content: 'a'.repeat(300),
        hash: 'hash3',
      };
      const context = formatKnowledgeContext([longContentItem]);
      expect(context).toContain('...');
      expect(context.length).toBeLessThan(250); // Should be truncated
    });

    it('should not truncate short content', () => {
      const context = formatKnowledgeContext([mockKnowledgeItems[1]]);
      expect(context).not.toContain('...');
    });

    it('should return empty string for empty array', () => {
      const context = formatKnowledgeContext([]);
      expect(context).toBe('');
    });

    it('should include type in formatted context', () => {
      const context = formatKnowledgeContext([mockKnowledgeItems[0]]);
      expect(context).toContain('[DOCUMENT]');
    });

    it('should separate multiple items with double newlines', () => {
      const context = formatKnowledgeContext(mockKnowledgeItems);
      const parts = context.split('\n\n');
      expect(parts.length).toBe(2);
    });
  });
});
