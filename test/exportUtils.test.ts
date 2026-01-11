import { describe, it, expect } from 'vitest';
import { exportData, getEstimatedSize } from '../utils/exportUtils';
import {
  Memory,
  KnowledgeItem,
  ConversationSession,
  UploadRecord,
  InsightProposal,
  EvolutionRecord,
  MemoryCategory,
  MemoryLayer,
  MemoryStatus,
  KnowledgeType
} from '../types';

const createMemory = (overrides?: Partial<Memory>): Memory => ({
  id: 'memory-1',
  content: 'Test memory content',
  category: MemoryCategory.PREFERENCE,
  layer: MemoryLayer.L1,
  confidence: 0.8,
  evidence: ['Evidence 1'],
  status: MemoryStatus.ACTIVE,
  isSensitive: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  confirmedByHuman: false,
  ...overrides
});

const createKnowledgeItem = (overrides?: Partial<KnowledgeItem>): KnowledgeItem => ({
  id: 'knowledge-1',
  title: 'Test Knowledge',
  content: 'Test knowledge content',
  type: KnowledgeType.DOCUMENT,
  tags: ['tag1'],
  hash: 'hash1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'ACTIVE',
  source: { type: 'UPLOAD', filename: 'test.txt' },
  ...overrides
});

const createSession = (overrides?: Partial<ConversationSession>): ConversationSession => ({
  id: 'session-1',
  title: 'Test Session',
  messages: [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there' }
  ],
  startedAt: new Date().toISOString(),
  lastMessageAt: new Date().toISOString(),
  ...overrides
});

const createUpload = (overrides?: Partial<UploadRecord>): UploadRecord => ({
  id: 'upload-1',
  filename: 'test.txt',
  content: 'Test upload content',
  hash: 'hash1',
  uploadedAt: new Date().toISOString(),
  status: 'PROCESSED',
  ...overrides
});

const createProposal = (overrides?: Partial<InsightProposal>): InsightProposal => ({
  id: 'proposal-1',
  type: 'NEW',
  summary: 'Test proposal',
  reasoning: 'Test reasoning',
  proposedMemory: {
    content: 'Test content',
    category: MemoryCategory.PREFERENCE,
    layer: MemoryLayer.L1
  },
  evidenceContext: ['Evidence'],
  status: 'PENDING',
  confidence: 0.8,
  qualityScore: 0.7,
  evidenceStrength: 0.8,
  ...overrides
});

const createHistory = (overrides?: Partial<EvolutionRecord>): EvolutionRecord => ({
  id: 'history-1',
  timestamp: new Date().toISOString(),
  changeDescription: 'Test change',
  affectedMemoryIds: ['memory-1'],
  type: 'MANUAL_OVERRIDE',
  ...overrides
});

describe('exportUtils', () => {
  // Helper to read blob content in Node.js
  const readBlobAsText = async (blob: Blob): Promise<string> => {
    // Use FileReader for Node.js compatibility
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsText(blob);
    });
  };


  const testData = {
    memories: [createMemory()],
    knowledge: [createKnowledgeItem()],
    sessions: [createSession()],
    uploads: [createUpload()],
    proposals: [createProposal()],
    history: [createHistory()]
  };

  describe('exportData', () => {
    it('should export data as a Blob', async () => {
      const blob = await exportData(testData);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });

    it('should include all data types by default', async () => {
      const blob = await exportData(testData);
      const text = await readBlobAsText(blob);
      const json = JSON.parse(text);
      
      expect(json.data.memories).toHaveLength(1);
      expect(json.data.knowledge).toHaveLength(1);
      expect(json.data.sessions).toHaveLength(1);
      expect(json.data.uploads).toHaveLength(1);
      expect(json.data.proposals).toHaveLength(1);
      expect(json.data.history).toHaveLength(1);
    });

    it('should include metadata', async () => {
      const blob = await exportData(testData);
      const text = await readBlobAsText(blob);
      const json = JSON.parse(text);
      
      expect(json.metadata).toBeDefined();
      expect(json.metadata.version).toBe('1.0.0');
      expect(json.metadata.appVersion).toBe('0.1.0-beta');
      expect(json.metadata.exportDate).toBeDefined();
      expect(json.metadata.itemCounts).toBeDefined();
      expect(json.metadata.checksum).toBeDefined();
    });

    it('should filter archived memories when includeArchived is false', async () => {
      const dataWithArchived = {
        ...testData,
        memories: [
          createMemory({ status: MemoryStatus.ACTIVE }),
          createMemory({ id: 'memory-2', status: MemoryStatus.ARCHIVED })
        ]
      };
      
      const blob = await exportData(dataWithArchived, { includeArchived: false });
      const text = await readBlobAsText(blob);
      const json = JSON.parse(text);
      
      expect(json.data.memories).toHaveLength(1);
      expect(json.data.memories[0].status).toBe(MemoryStatus.ACTIVE);
    });

    it('should include archived memories when includeArchived is true', async () => {
      const dataWithArchived = {
        ...testData,
        memories: [
          createMemory({ status: MemoryStatus.ACTIVE }),
          createMemory({ id: 'memory-2', status: MemoryStatus.ARCHIVED })
        ]
      };
      
      const blob = await exportData(dataWithArchived, { includeArchived: true });
      const text = await readBlobAsText(blob);
      const json = JSON.parse(text);
      
      expect(json.data.memories.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter rejected proposals when includeRejected is false', async () => {
      const dataWithRejected = {
        ...testData,
        proposals: [
          createProposal({ status: 'PENDING' }),
          createProposal({ id: 'proposal-2', status: 'REJECTED' })
        ]
      };
      
      const blob = await exportData(dataWithRejected, { includeRejected: false });
      const text = await readBlobAsText(blob);
      const json = JSON.parse(text);
      
      expect(json.data.proposals).toHaveLength(1);
      expect(json.data.proposals[0].status).toBe('PENDING');
    });

    it('should export only selected data types', async () => {
      const blob = await exportData(testData, {
        dataTypes: ['memories', 'knowledge']
      });
      const text = await readBlobAsText(blob);
      const json = JSON.parse(text);
      
      expect(json.data.memories).toHaveLength(1);
      expect(json.data.knowledge).toHaveLength(1);
      expect(json.data.sessions).toHaveLength(0);
      expect(json.data.uploads).toHaveLength(0);
      expect(json.data.proposals).toHaveLength(0);
      expect(json.data.history).toHaveLength(0);
    });

    it('should calculate correct item counts', async () => {
      const multiData = {
        memories: [createMemory(), createMemory({ id: 'memory-2' })],
        knowledge: [createKnowledgeItem()],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };
      
      const blob = await exportData(multiData);
      const text = await readBlobAsText(blob);
      const json = JSON.parse(text);
      
      expect(json.metadata.itemCounts.memories).toBe(2);
      expect(json.metadata.itemCounts.knowledge).toBe(1);
    });

    it('should calculate data size', async () => {
      const blob = await exportData(testData);
      const text = await readBlobAsText(blob);
      const json = JSON.parse(text);
      
      expect(json.metadata.dataSize).toBeGreaterThan(0);
            // dataSize is calculated before checksum is added, so it may differ slightly
      // We verify it's a reasonable size (within 20% of actual blob size)
      expect(json.metadata.dataSize).toBeGreaterThan(blob.size * 0.8);
      expect(json.metadata.dataSize).toBeLessThan(blob.size * 1.2);
    });

    it('should include checksum', async () => {
      const blob = await exportData(testData);
      const text = await readBlobAsText(blob);
      const json = JSON.parse(text);
      
      expect(json.metadata.checksum).toBeDefined();
      expect(typeof json.metadata.checksum).toBe('string');
      expect(json.metadata.checksum.length).toBeGreaterThan(0);
    });

    it('should handle empty data', async () => {
      const emptyData = {
        memories: [],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };
      
      const blob = await exportData(emptyData);
      const text = await readBlobAsText(blob);
      const json = JSON.parse(text);
      
      expect(json.data.memories).toHaveLength(0);
      expect(json.metadata.itemCounts.memories).toBe(0);
    });

    it('should mark as compressed when compress option is true', async () => {
      const blob = await exportData(testData, { compress: true });
      const text = await readBlobAsText(blob);
      const json = JSON.parse(text);
      
      expect(json.compressed).toBe(true);
    });
  });

  describe('getEstimatedSize', () => {
    it('should estimate size for all data types', () => {
      const size = getEstimatedSize(testData);
      expect(size).toBeDefined();
      expect(typeof size).toBe('string');
      expect(size.length).toBeGreaterThan(0);
    });

    it('should return size in bytes for small data', () => {
      const smallData = {
        memories: [createMemory()],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };
      
      const size = getEstimatedSize(smallData);
      expect(size).toMatch(/^\d+ B$/);
    });

    it('should return size in KB for medium data', () => {
      const mediumData = {
        memories: Array(100).fill(0).map((_, i) => createMemory({ id: `memory-${i}` })),
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };
      
      const size = getEstimatedSize(mediumData);
      expect(size).toMatch(/^\d+\.\d+ KB$/);
    });

    it('should return size in MB for large data', () => {
      const largeKnowledge = Array(1000).fill(0).map((_, i) => 
        createKnowledgeItem({
          id: `knowledge-${i}`,
          content: 'x'.repeat(5000)
        })
      );
      
      const largeData = {
        memories: [],
        knowledge: largeKnowledge,
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };
      
      const size = getEstimatedSize(largeData);
      expect(size).toMatch(/^\d+\.\d+ MB$/);
    });

    it('should handle empty data', () => {
      const emptyData = {
        memories: [],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };
      
      const size = getEstimatedSize(emptyData);
      expect(size).toBe('0 B');
    });
  });
});


