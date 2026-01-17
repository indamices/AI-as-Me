import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectConflicts,
  importData,
  applyImport,
  ImportOptions
} from '../utils/importUtils';
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
import { ExportPackage } from '../utils/exportUtils';

// Helper functions to create test data
const createMemory = (id: string, overrides?: Partial<Memory>): Memory => ({
  id,
  content: `Memory ${id}`,
  category: MemoryCategory.GOAL,
  layer: MemoryLayer.L1,
  confidence: 0.8,
  evidence: ['Evidence'],
  status: MemoryStatus.ACTIVE,
  isSensitive: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  confirmedByHuman: false,
  metadata: { sourceTrack: 'ACTIVE' },
  ...overrides
});

const createKnowledgeItem = (id: string, overrides?: Partial<KnowledgeItem>): KnowledgeItem => ({
  id,
  title: `Knowledge ${id}`,
  content: `Content ${id}`,
  type: KnowledgeType.DOCUMENT,
  tags: [],
  hash: `hash-${id}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'ACTIVE',
  source: { type: 'UPLOAD', filename: 'test.txt' },
  ...overrides
});

const createSession = (id: string): ConversationSession => ({
  id,
  title: `Session ${id}`,
  messages: [{ role: 'user', content: 'Hello' }],
  startedAt: new Date().toISOString(),
  lastMessageAt: new Date().toISOString(),
  extractedMemories: []
});

const createUpload = (id: string): UploadRecord => ({
  id,
  filename: `file-${id}.txt`,
  content: `Content ${id}`,
  hash: `hash-${id}`,
  uploadedAt: new Date().toISOString(),
  status: 'PROCESSED'
});

const createProposal = (id: string): InsightProposal => ({
  id,
  type: 'NEW',
  summary: `Proposal ${id}`,
  reasoning: `Reasoning ${id}`,
  proposedMemory: { content: `Content ${id}` },
  evidenceContext: [],
  status: 'PENDING',
  confidence: 0.8,
  qualityScore: 0.7,
  evidenceStrength: 0.6
});

const createHistory = (id: string): EvolutionRecord => ({
  id,
  timestamp: new Date().toISOString(),
  changeDescription: `Change ${id}`,
  affectedMemoryIds: [],
  type: 'CONSOLIDATION'
});

describe('importUtils', () => {
  describe('detectConflicts', () => {
    it('should detect no conflicts when data is completely different', () => {
      const existing = {
        memories: [createMemory('mem-1')],
        knowledge: [createKnowledgeItem('know-1')],
        sessions: [createSession('session-1')],
        uploads: [createUpload('upload-1')],
        proposals: [createProposal('prop-1')],
        history: [createHistory('hist-1')]
      };

      const imported = {
        memories: [createMemory('mem-2')],
        knowledge: [createKnowledgeItem('know-2')],
        sessions: [createSession('session-2')],
        uploads: [createUpload('upload-2')],
        proposals: [createProposal('prop-2')],
        history: [createHistory('hist-2')]
      };

      const conflicts = detectConflicts(existing, imported);
      expect(conflicts).toHaveLength(0);
    });

    it('should detect memory ID conflicts', () => {
      const existing = {
        memories: [createMemory('mem-1')],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const imported = {
        memories: [createMemory('mem-1')], // Same ID
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const conflicts = detectConflicts(existing, imported);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('id');
      expect(conflicts[0].field).toContain('memories');
    });

    it('should detect knowledge ID conflicts', () => {
      const existing = {
        memories: [],
        knowledge: [createKnowledgeItem('know-1')],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const imported = {
        memories: [],
        knowledge: [createKnowledgeItem('know-1')], // Same ID
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const conflicts = detectConflicts(existing, imported);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('id');
      expect(conflicts[0].field).toContain('knowledge');
    });

    it('should detect session ID conflicts', () => {
      const existing = {
        memories: [],
        knowledge: [],
        sessions: [createSession('session-1')],
        uploads: [],
        proposals: [],
        history: []
      };

      const imported = {
        memories: [],
        knowledge: [],
        sessions: [createSession('session-1')], // Same ID
        uploads: [],
        proposals: [],
        history: []
      };

      const conflicts = detectConflicts(existing, imported);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('id');
      expect(conflicts[0].field).toContain('sessions');
    });

    it('should detect multiple conflicts', () => {
      const existing = {
        memories: [createMemory('mem-1')],
        knowledge: [createKnowledgeItem('know-1')],
        sessions: [createSession('session-1')],
        uploads: [],
        proposals: [],
        history: []
      };

      const imported = {
        memories: [createMemory('mem-1')],
        knowledge: [createKnowledgeItem('know-1')],
        sessions: [createSession('session-1')],
        uploads: [],
        proposals: [],
        history: []
      };

      const conflicts = detectConflicts(existing, imported);
      expect(conflicts.length).toBe(3);
    });
  });

  describe('applyImport', () => {
    it('should replace all data with replace strategy', () => {
      const currentData = {
        memories: [createMemory('mem-1')],
        knowledge: [createKnowledgeItem('know-1')],
        sessions: [createSession('session-1')],
        uploads: [createUpload('upload-1')],
        proposals: [createProposal('prop-1')],
        history: [createHistory('hist-1')]
      };

      const importedData = {
        memories: [createMemory('mem-2')],
        knowledge: [createKnowledgeItem('know-2')],
        sessions: [createSession('session-2')],
        uploads: [createUpload('upload-2')],
        proposals: [createProposal('prop-2')],
        history: [createHistory('hist-2')]
      };

      const options: ImportOptions = {
        strategy: 'replace',
        conflictResolution: 'new'
      };

      const result = applyImport(currentData, importedData, options);
      
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].id).toBe('mem-2');
      expect(result.knowledge[0].id).toBe('know-2');
    });

    it('should merge data with merge strategy', () => {
      const currentData = {
        memories: [createMemory('mem-1')],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const importedData = {
        memories: [createMemory('mem-2')], // New memory
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const options: ImportOptions = {
        strategy: 'merge',
        conflictResolution: 'old'
      };

      const result = applyImport(currentData, importedData, options);
      
      expect(result.memories).toHaveLength(2);
      expect(result.memories.map(m => m.id)).toContain('mem-1');
      expect(result.memories.map(m => m.id)).toContain('mem-2');
    });

    it('should replace conflicting items with merge strategy and new resolution', () => {
      const currentData = {
        memories: [createMemory('mem-1', { content: 'Old content' })],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const importedData = {
        memories: [createMemory('mem-1', { content: 'New content' })],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const options: ImportOptions = {
        strategy: 'merge',
        conflictResolution: 'new'
      };

      const result = applyImport(currentData, importedData, options);
      
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].content).toBe('New content');
    });

    it('should keep old items with merge strategy and old resolution', () => {
      const currentData = {
        memories: [createMemory('mem-1', { content: 'Old content' })],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const importedData = {
        memories: [createMemory('mem-1', { content: 'New content' })],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const options: ImportOptions = {
        strategy: 'merge',
        conflictResolution: 'old'
      };

      const result = applyImport(currentData, importedData, options);
      
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].content).toBe('Old content');
    });

    it('should append all data with append strategy', () => {
      const currentData = {
        memories: [createMemory('mem-1')],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const importedData = {
        memories: [createMemory('mem-1')], // Same ID - should get new ID
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const options: ImportOptions = {
        strategy: 'append',
        conflictResolution: 'new'
      };

      const result = applyImport(currentData, importedData, options);
      
      expect(result.memories).toHaveLength(2);
      // The conflicting memory should have a new ID
      expect(result.memories[1].id).not.toBe('mem-1');
    });

    it('should handle empty imported data', () => {
      const currentData = {
        memories: [createMemory('mem-1')],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const importedData = {
        memories: [],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const options: ImportOptions = {
        strategy: 'replace',
        conflictResolution: 'new'
      };

      const result = applyImport(currentData, importedData, options);
      
      expect(result.memories).toHaveLength(0);
    });

    it('should handle empty current data', () => {
      const currentData = {
        memories: [],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const importedData = {
        memories: [createMemory('mem-1')],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const options: ImportOptions = {
        strategy: 'merge',
        conflictResolution: 'new'
      };

      const result = applyImport(currentData, importedData, options);
      
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].id).toBe('mem-1');
    });
  });

  describe('importData', () => {
    it('should reject invalid JSON file', async () => {
      const invalidFile = new File(['invalid json'], 'test.json', { type: 'application/json' });
      
      const currentData = {
        memories: [],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const options: ImportOptions = {
        strategy: 'replace',
        conflictResolution: 'new'
      };

      const result = await importData(invalidFile, currentData, options);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject file with invalid package structure', async () => {
      const invalidPackage = { invalid: 'structure' };
      const file = new File([JSON.stringify(invalidPackage)], 'test.json', { type: 'application/json' });
      
      const currentData = {
        memories: [],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const options: ImportOptions = {
        strategy: 'replace',
        conflictResolution: 'new'
      };

      const result = await importData(file, currentData, options);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should successfully import valid package with replace strategy', async () => {
      const memory = createMemory('mem-1');
      const validPackage: ExportPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          appVersion: '1.0.0',
          dataSize: 100,
          itemCounts: {
            memories: 1,
            knowledge: 0,
            sessions: 0,
            uploads: 0,
            proposals: 0,
            history: 0
          }
        },
        data: {
          memories: [memory],
          knowledge: [],
          sessions: [],
          uploads: [],
          proposals: [],
          history: []
        }
      };

      // Create a File-like object with text() method for testing
      const fileContent = JSON.stringify(validPackage);
      const blob = new Blob([fileContent], { type: 'application/json' });
      const file = Object.assign(blob, {
        name: 'test.json',
        lastModified: Date.now(),
        text: async () => fileContent
      }) as File;
      
      const currentData = {
        memories: [],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const options: ImportOptions = {
        strategy: 'replace',
        conflictResolution: 'new'
      };

      const result = await importData(file, currentData, options);
      
      // Debug: Log errors if import failed
      if (!result.success) {
        console.log('Import failed with errors:', result.errors);
      }
      
      expect(result.success).toBe(true);
      expect(result.imported.memories).toBe(1);
      expect(result.conflicts).toBe(0);
    });

    it('should count new items correctly with merge strategy', async () => {
      const validPackage: ExportPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          appVersion: '1.0.0',
          dataSize: 100,
          itemCounts: {
            memories: 2,
            knowledge: 0,
            sessions: 0,
            uploads: 0,
            proposals: 0,
            history: 0
          }
        },
        data: {
          memories: [
            createMemory('mem-1'), // Existing
            createMemory('mem-2')  // New
          ],
          knowledge: [],
          sessions: [],
          uploads: [],
          proposals: [],
          history: []
        }
      };

      // Create a File-like object with text() method for testing
      const fileContent2 = JSON.stringify(validPackage);
      const blob2 = new Blob([fileContent2], { type: 'application/json' });
      const file2 = Object.assign(blob2, {
        name: 'test.json',
        lastModified: Date.now(),
        text: async () => fileContent2
      }) as File;
      
      const currentData = {
        memories: [createMemory('mem-1')], // Already exists
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const options: ImportOptions = {
        strategy: 'merge',
        conflictResolution: 'new'
      };

      const result = await importData(file2, currentData, options);
      
      expect(result.success).toBe(true);
      expect(result.imported.memories).toBe(1); // Only mem-2 is new
      expect(result.conflicts).toBe(1); // mem-1 conflicts
    });

    it('should handle errors gracefully', async () => {
      // Create a file that will cause an error when reading
      const file = {
        text: async () => {
          throw new Error('File read error');
        }
      } as unknown as File;
      
      const currentData = {
        memories: [],
        knowledge: [],
        sessions: [],
        uploads: [],
        proposals: [],
        history: []
      };

      const options: ImportOptions = {
        strategy: 'replace',
        conflictResolution: 'new'
      };

      const result = await importData(file, currentData, options);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
