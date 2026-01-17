import { describe, it, expect } from 'vitest';
import { validateExportPackage } from '../utils/validationUtils';
import {
  MemoryCategory,
  MemoryLayer,
  MemoryStatus,
  KnowledgeType
} from '../types';

describe('validationUtils', () => {
  describe('validateExportPackage', () => {
    it('should validate a valid export package', () => {
      const validPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: {
            memories: 1,
            knowledge: 1,
            sessions: 0,
            uploads: 0,
            proposals: 0,
            history: 0
          }
        },
        data: {
          memories: [{
            id: 'mem-1',
            content: 'Test memory',
            category: MemoryCategory.GOAL,
            layer: MemoryLayer.L1,
            confidence: 0.8,
            evidence: ['Evidence'],
            status: MemoryStatus.ACTIVE,
            isSensitive: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            confirmedByHuman: false
          }],
          knowledge: [{
            id: 'know-1',
            title: 'Test Knowledge',
            content: 'Test content',
            type: KnowledgeType.DOCUMENT,
            tags: ['tag1'],
            hash: 'hash123',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'ACTIVE',
            source: { type: 'UPLOAD', filename: 'test.txt' }
          }],
          sessions: [],
          uploads: [],
          proposals: [],
          history: []
        }
      };

      const result = validateExportPackage(validPackage);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid root structure', () => {
      const invalidPackage = null;
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('root');
    });

    it('should reject non-object root', () => {
      const invalidPackage = 'not an object';
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('root');
    });

    it('should reject missing metadata', () => {
      const invalidPackage = {
        data: { memories: [], knowledge: [], sessions: [], uploads: [], proposals: [], history: [] }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'metadata')).toBe(true);
    });

    it('should reject missing version', () => {
      const invalidPackage = {
        metadata: {
          exportDate: new Date().toISOString(),
          itemCounts: {}
        },
        data: { memories: [], knowledge: [], sessions: [], uploads: [], proposals: [], history: [] }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'metadata.version')).toBe(true);
    });

    it('should reject missing exportDate', () => {
      const invalidPackage = {
        metadata: {
          version: '1.0.0',
          itemCounts: {}
        },
        data: { memories: [], knowledge: [], sessions: [], uploads: [], proposals: [], history: [] }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'metadata.exportDate')).toBe(true);
    });

    it('should reject missing data object', () => {
      const invalidPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: {}
        }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'data')).toBe(true);
    });

    it('should validate memory fields', () => {
      const invalidPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: { memories: 1 }
        },
        data: {
          memories: [{
            // Missing required fields
            id: 'mem-1'
          }],
          knowledge: [],
          sessions: [],
          uploads: [],
          proposals: [],
          history: []
        }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid memory category', () => {
      const invalidPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: { memories: 1 }
        },
        data: {
          memories: [{
            id: 'mem-1',
            content: 'Test',
            category: 'INVALID_CATEGORY',
            layer: MemoryLayer.L1,
            confidence: 0.8,
            evidence: [],
            status: MemoryStatus.ACTIVE,
            isSensitive: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            confirmedByHuman: false
          }],
          knowledge: [],
          sessions: [],
          uploads: [],
          proposals: [],
          history: []
        }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('category'))).toBe(true);
    });

    it('should reject invalid memory layer', () => {
      const invalidPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: { memories: 1 }
        },
        data: {
          memories: [{
            id: 'mem-1',
            content: 'Test',
            category: MemoryCategory.GOAL,
            layer: 10, // Invalid: should be 0-4
            confidence: 0.8,
            evidence: [],
            status: MemoryStatus.ACTIVE,
            isSensitive: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            confirmedByHuman: false
          }],
          knowledge: [],
          sessions: [],
          uploads: [],
          proposals: [],
          history: []
        }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('layer'))).toBe(true);
    });

    it('should reject invalid confidence value', () => {
      const invalidPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: { memories: 1 }
        },
        data: {
          memories: [{
            id: 'mem-1',
            content: 'Test',
            category: MemoryCategory.GOAL,
            layer: MemoryLayer.L1,
            confidence: 1.5, // Invalid: should be 0-1
            evidence: [],
            status: MemoryStatus.ACTIVE,
            isSensitive: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            confirmedByHuman: false
          }],
          knowledge: [],
          sessions: [],
          uploads: [],
          proposals: [],
          history: []
        }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('confidence'))).toBe(true);
    });

    it('should validate knowledge item fields', () => {
      const invalidPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: { knowledge: 1 }
        },
        data: {
          memories: [],
          knowledge: [{
            // Missing required fields
            id: 'know-1'
          }],
          sessions: [],
          uploads: [],
          proposals: [],
          history: []
        }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid knowledge type', () => {
      const invalidPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: { knowledge: 1 }
        },
        data: {
          memories: [],
          knowledge: [{
            id: 'know-1',
            title: 'Test',
            content: 'Content',
            type: 'INVALID_TYPE',
            tags: [],
            hash: 'hash',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'ACTIVE',
            source: { type: 'UPLOAD', filename: 'test.txt' }
          }],
          sessions: [],
          uploads: [],
          proposals: [],
          history: []
        }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('type'))).toBe(true);
    });

    it('should validate session messages', () => {
      const invalidPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: { sessions: 1 }
        },
        data: {
          memories: [],
          knowledge: [],
          sessions: [{
            id: 'session-1',
            title: 'Test',
            messages: [{
              role: 'invalid_role', // Invalid role
              content: 'Test'
            }]
          }],
          uploads: [],
          proposals: [],
          history: []
        }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('role'))).toBe(true);
    });

    it('should validate upload record', () => {
      const invalidPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: { uploads: 1 }
        },
        data: {
          memories: [],
          knowledge: [],
          sessions: [],
          uploads: [{
            // Missing filename
            id: 'upload-1'
          }],
          proposals: [],
          history: []
        }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate proposal with missing summary (backward compatibility)', () => {
      const oldPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: { proposals: 1 }
        },
        data: {
          memories: [],
          knowledge: [],
          sessions: [],
          uploads: [],
          proposals: [{
            id: 'prop-1',
            reasoning: 'Test reasoning', // Old format without summary
            status: 'PENDING',
            proposedMemory: { content: 'Test' },
            evidenceContext: [],
            confidence: 0.8,
            qualityScore: 0.7,
            evidenceStrength: 0.6
          }],
          history: []
        }
      };
      const result = validateExportPackage(oldPackage);
      // Should be valid but with warnings
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.field.includes('summary'))).toBe(true);
    });

    it('should validate history record', () => {
      const invalidPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: { history: 1 }
        },
        data: {
          memories: [],
          knowledge: [],
          sessions: [],
          uploads: [],
          proposals: [],
          history: [{
            // Missing timestamp
            id: 'hist-1',
            affectedMemoryIds: []
          }]
        }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('timestamp'))).toBe(true);
    });

    it('should reject non-array fields', () => {
      const invalidPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: {}
        },
        data: {
          memories: 'not an array', // Should be array
          knowledge: [],
          sessions: [],
          uploads: [],
          proposals: [],
          history: []
        }
      };
      const result = validateExportPackage(invalidPackage);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'data.memories')).toBe(true);
    });

    it('should warn about version mismatch', () => {
      const packageWithOldVersion = {
        metadata: {
          version: '0.9.0', // Different version
          exportDate: new Date().toISOString(),
          itemCounts: {}
        },
        data: {
          memories: [],
          knowledge: [],
          sessions: [],
          uploads: [],
          proposals: [],
          history: []
        }
      };
      const result = validateExportPackage(packageWithOldVersion);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.field === 'metadata.version')).toBe(true);
    });

    it('should handle empty arrays', () => {
      const emptyPackage = {
        metadata: {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          itemCounts: {
            memories: 0,
            knowledge: 0,
            sessions: 0,
            uploads: 0,
            proposals: 0,
            history: 0
          }
        },
        data: {
          memories: [],
          knowledge: [],
          sessions: [],
          uploads: [],
          proposals: [],
          history: []
        }
      };
      const result = validateExportPackage(emptyPackage);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
