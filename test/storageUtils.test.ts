import { describe, it, expect, beforeEach, vi } from 'vitest';
import { estimateStorageUsage, cleanupStorage, autoCleanupOnQuotaError } from '../utils/storageUtils';
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

describe('storageUtils', () => {
  describe('estimateStorageUsage', () => {
    it('should calculate storage usage correctly', () => {
      const data = {
        memories: [createMemory()],
        knowledge: [createKnowledgeItem()],
        sessions: [createSession()],
        uploads: [createUpload()],
        proposals: [createProposal()],
        history: [createHistory()]
      };

      const usage = estimateStorageUsage(data);

      expect(usage.total).toBeGreaterThan(0);
      expect(usage.byType.memories).toBeGreaterThan(0);
      expect(usage.byType.knowledge).toBeGreaterThan(0);
      expect(usage.byType.sessions).toBeGreaterThan(0);
      expect(usage.byType.uploads).toBeGreaterThan(0);
      expect(usage.byType.proposals).toBeGreaterThan(0);
      expect(usage.byType.history).toBeGreaterThan(0);
      expect(usage.breakdown).toContain('记忆:');
      expect(usage.breakdown).toContain('知识:');
    });

    it('should handle empty data', () => {
      const data = {
        memories: [],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const usage = estimateStorageUsage(data);

      // Empty arrays still have JSON overhead (e.g., "[]" = 2 bytes per array)
      expect(usage.total).toBeGreaterThanOrEqual(0);
      expect(usage.byType.memories).toBe(2); // "[]" = 2 bytes
    });
  });

  describe('cleanupStorage', () => {
    it('should preserve PENDING proposals', () => {
      const now = Date.now();
      const data = {
        memories: [],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [
          createProposal({ 
            id: 'pending-1', 
            status: 'PENDING',
            extractionMetadata: {
              timestamp: new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString(),
              model: 'test',
              extractionMethod: 'CHAT'
            }
          }),
          createProposal({ 
            id: 'pending-2', 
            status: 'PENDING'
          }),
          createProposal({ 
            id: 'accepted-1', 
            status: 'ACCEPTED'
          })
        ],
        history: []
      };

      const result = cleanupStorage(data, {
        autoDeleteRejectedProposals: 30 // 30 days
      });

      // PENDING and ACCEPTED proposals should be preserved
      expect(result.cleanedData.proposals.length).toBe(3);
      expect(result.cleanedData.proposals.find(p => p.id === 'pending-1')).toBeDefined();
      expect(result.cleanedData.proposals.find(p => p.id === 'pending-2')).toBeDefined();
      expect(result.cleanedData.proposals.find(p => p.id === 'accepted-1')).toBeDefined();
      expect(result.cleaned.proposals).toBe(0);
    });

    it('should delete old REJECTED proposals', () => {
      const now = Date.now();
      const data = {
        memories: [],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [
          createProposal({ 
            id: 'rejected-old', 
            status: 'REJECTED',
            extractionMetadata: {
              timestamp: new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days ago
              model: 'test',
              extractionMethod: 'CHAT'
            }
          }),
          createProposal({ 
            id: 'rejected-recent', 
            status: 'REJECTED',
            extractionMetadata: {
              timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
              model: 'test',
              extractionMethod: 'CHAT'
            }
          }),
          createProposal({ 
            id: 'pending-1', 
            status: 'PENDING'
          })
        ],
        history: []
      };

      const result = cleanupStorage(data, {
        autoDeleteRejectedProposals: 30 // Delete after 30 days
      });

      // Old rejected should be deleted, recent rejected and pending should remain
      expect(result.cleanedData.proposals.length).toBe(2);
      expect(result.cleanedData.proposals.find(p => p.id === 'rejected-old')).toBeUndefined();
      expect(result.cleanedData.proposals.find(p => p.id === 'rejected-recent')).toBeDefined();
      expect(result.cleanedData.proposals.find(p => p.id === 'pending-1')).toBeDefined();
      expect(result.cleaned.proposals).toBe(1);
    });

    it('should preserve recent sessions', () => {
      const now = Date.now();
      const data = {
        memories: [],
        knowledge: [],
        sessions: Array.from({ length: 150 }, (_, i) => 
          createSession({
            id: `session-${i}`,
            lastMessageAt: new Date(now - i * 1000 * 60).toISOString() // Different timestamps
          })
        ),
        uploads: [],
        proposals: [],
        history: []
      };

      const result = cleanupStorage(data, {
        keepRecentSessions: 100
      });

      expect(result.cleanedData.sessions.length).toBe(100);
      expect(result.cleaned.sessions).toBe(50);
    });

    it('should preserve recent history', () => {
      const now = Date.now();
      const data = {
        memories: [],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: Array.from({ length: 250 }, (_, i) => 
          createHistory({
            id: `history-${i}`,
            timestamp: new Date(now - i * 1000 * 60).toISOString()
          })
        )
      };

      const result = cleanupStorage(data, {
        keepRecentHistory: 200
      });

      expect(result.cleanedData.history.length).toBe(200);
      expect(result.cleaned.history).toBe(50);
    });

    it('should preserve recent uploads', () => {
      const now = Date.now();
      const data = {
        memories: [],
        knowledge: [],
        sessions: [],
        uploads: Array.from({ length: 60 }, (_, i) => 
          createUpload({
            id: `upload-${i}`,
            uploadedAt: new Date(now - i * 1000 * 60).toISOString()
          })
        ),
        proposals: [],
        history: []
      };

      const result = cleanupStorage(data, {
        keepRecentUploads: 50
      });

      expect(result.cleanedData.uploads.length).toBe(50);
      expect(result.cleaned.uploads).toBe(10);
    });

    it('should archive old unconfirmed memories', () => {
      const now = Date.now();
      const data = {
        memories: [
          createMemory({
            id: 'old-unconfirmed',
            status: MemoryStatus.ACTIVE,
            confirmedByHuman: false,
            updatedAt: new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString() // 100 days ago
          }),
          createMemory({
            id: 'old-confirmed',
            status: MemoryStatus.ACTIVE,
            confirmedByHuman: true,
            updatedAt: new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString()
          }),
          createMemory({
            id: 'recent-unconfirmed',
            status: MemoryStatus.ACTIVE,
            confirmedByHuman: false,
            updatedAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
          })
        ],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const result = cleanupStorage(data, {
        autoArchiveOldMemories: 90 // Archive after 90 days
      });

      const oldUnconfirmed = result.cleanedData.memories.find(m => m.id === 'old-unconfirmed');
      const oldConfirmed = result.cleanedData.memories.find(m => m.id === 'old-confirmed');
      const recentUnconfirmed = result.cleanedData.memories.find(m => m.id === 'recent-unconfirmed');

      expect(oldUnconfirmed?.status).toBe(MemoryStatus.ARCHIVED);
      expect(oldConfirmed?.status).toBe(MemoryStatus.ACTIVE); // Confirmed memories not archived
      expect(recentUnconfirmed?.status).toBe(MemoryStatus.ACTIVE);
      expect(result.cleaned.memories).toBe(1);
    });

    it('should handle multiple cleanup operations together', () => {
      const now = Date.now();
      const data = {
        memories: [
          createMemory({
            id: 'old-unconfirmed',
            status: MemoryStatus.ACTIVE,
            confirmedByHuman: false,
            updatedAt: new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString()
          })
        ],
        knowledge: [],
        sessions: Array.from({ length: 120 }, (_, i) => 
          createSession({ id: `session-${i}` })
        ),
        uploads: [],
        proposals: [
          createProposal({ 
            id: 'rejected-old', 
            status: 'REJECTED',
            extractionMetadata: {
              timestamp: new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString(),
              model: 'test',
              extractionMethod: 'CHAT'
            }
          }),
          createProposal({ id: 'pending-1', status: 'PENDING' })
        ],
        history: Array.from({ length: 250 }, (_, i) => 
          createHistory({ id: `history-${i}` })
        )
      };

      const result = cleanupStorage(data, {
        keepRecentSessions: 100,
        keepRecentHistory: 200,
        autoDeleteRejectedProposals: 30,
        autoArchiveOldMemories: 90
      });

      expect(result.cleanedData.memories.length).toBe(1);
      expect(result.cleanedData.memories[0].status).toBe(MemoryStatus.ARCHIVED);
      expect(result.cleanedData.sessions.length).toBe(100);
      expect(result.cleanedData.proposals.length).toBe(1); // Only PENDING remains
      expect(result.cleanedData.proposals[0].status).toBe('PENDING');
      expect(result.cleanedData.history.length).toBe(200);
    });
  });

  describe('autoCleanupOnQuotaError', () => {
    it('should clean up storage to target size', () => {
      const now = Date.now();
      const data = {
        memories: [],
        knowledge: [],
        sessions: Array.from({ length: 200 }, (_, i) => 
          createSession({ id: `session-${i}` })
        ),
        uploads: [],
        proposals: Array.from({ length: 100 }, (_, i) => 
          createProposal({
            id: `proposal-${i}`,
            status: i < 80 ? 'REJECTED' : 'PENDING',
            extractionMetadata: i < 80 ? {
              timestamp: new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString(),
              model: 'test',
              extractionMethod: 'CHAT'
            } : undefined
          })
        ),
        history: Array.from({ length: 300 }, (_, i) => 
          createHistory({ id: `history-${i}` })
        )
      };

      const originalUsage = estimateStorageUsage(data);
      const targetSize = originalUsage.total * 0.5; // Target 50% of original

      const result = autoCleanupOnQuotaError(data, targetSize);

      const newUsage = estimateStorageUsage(result.cleanedData);
      expect(newUsage.total).toBeLessThanOrEqual(targetSize);
      expect(result.freedSpace).toBeGreaterThan(0);
      
      // PENDING proposals should still be preserved
      const pendingProposals = result.cleanedData.proposals.filter(p => p.status === 'PENDING');
      expect(pendingProposals.length).toBeGreaterThan(0);
    });

    it('should preserve PENDING proposals during auto cleanup', () => {
      const data = {
        memories: [],
        knowledge: [],
        sessions: Array.from({ length: 200 }, () => createSession()),
        uploads: [],
        proposals: [
          createProposal({ id: 'pending-1', status: 'PENDING' }),
          createProposal({ id: 'pending-2', status: 'PENDING' }),
          createProposal({ id: 'pending-3', status: 'PENDING' }),
          createProposal({ id: 'accepted-1', status: 'ACCEPTED' })
        ],
        history: Array.from({ length: 300 }, () => createHistory())
      };

      const originalUsage = estimateStorageUsage(data);
      const targetSize = originalUsage.total * 0.3; // Aggressive cleanup

      const result = autoCleanupOnQuotaError(data, targetSize);

      // All PENDING and ACCEPTED proposals should be preserved
      expect(result.cleanedData.proposals.length).toBe(4);
      expect(result.cleanedData.proposals.every(p => 
        p.status === 'PENDING' || p.status === 'ACCEPTED'
      )).toBe(true);
    });
  });
});
