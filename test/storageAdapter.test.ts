import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  LocalStorageAdapter, 
  IndexedDBAdapter, 
  getStorageManager, 
  migrateStorage,
  StorageBackend 
} from '../utils/storageAdapter';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  describe('getItem and setItem', () => {
    it('should store and retrieve values', async () => {
      const testData = { test: 'value', number: 42 };
      const result = await adapter.setItem('test-key', testData);
      
      expect(result).toBe(true);
      const retrieved = await adapter.getItem<typeof testData>('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await adapter.getItem('non-existent');
      expect(result).toBeNull();
    });

    it('should handle quota exceeded error', async () => {
      // Mock localStorage to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        // Use plain object instead of DOMException to allow property assignment
        const error: any = Object.create(DOMException.prototype);
        Object.defineProperty(error, 'name', {
          value: 'QuotaExceededError',
          writable: false,
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(error, 'message', {
          value: 'QuotaExceededError',
          writable: false,
          enumerable: false,
          configurable: true
        });
        throw error;
      });

      await expect(adapter.setItem('test-key', { data: 'test' })).rejects.toThrow('QUOTA_EXCEEDED');
      
      localStorage.setItem = originalSetItem;
    });
  });

  describe('removeItem and clear', () => {
    it('should remove specific items', async () => {
      await adapter.setItem('key1', { value: 1 });
      await adapter.setItem('key2', { value: 2 });
      
      await adapter.removeItem('key1');
      
      expect(await adapter.getItem('key1')).toBeNull();
      expect(await adapter.getItem('key2')).not.toBeNull();
    });

    it('should clear all items', async () => {
      await adapter.setItem('key1', { value: 1 });
      await adapter.setItem('key2', { value: 2 });
      
      await adapter.clear();
      
      expect(await adapter.getItem('key1')).toBeNull();
      expect(await adapter.getItem('key2')).toBeNull();
    });
  });

  describe('getAllKeys', () => {
    it('should return all keys', async () => {
      await adapter.setItem('key1', { value: 1 });
      await adapter.setItem('key2', { value: 2 });
      await adapter.setItem('key3', { value: 3 });
      
      const keys = await adapter.getAllKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });
  });

  describe('estimateQuota and getUsage', () => {
    it('should estimate quota', async () => {
      const quota = await adapter.estimateQuota();
      expect(quota).not.toBeNull();
      expect(quota).toBeGreaterThan(0);
    });

    it('should get usage', async () => {
      await adapter.setItem('test-key', { data: 'test data' });
      const usage = await adapter.getUsage();
      
      // Usage should be greater than 0 if storage API is available
      // Or it should calculate manually
      expect(usage).not.toBeNull();
    });
  });
});

describe('IndexedDBAdapter', () => {
  let adapter: IndexedDBAdapter;

  beforeEach(async () => {
    adapter = new IndexedDBAdapter();
    // Clean up any existing database
    try {
      await adapter.clear();
      await adapter.close();
    } catch (e) {
      // Ignore errors during cleanup
    }
    adapter = new IndexedDBAdapter();
  });

  afterEach(async () => {
    try {
      await adapter.clear();
      await adapter.close();
    } catch (e) {
      // Ignore errors during cleanup
    }
  });

  describe('getItem and setItem', () => {
    it('should store and retrieve values', async () => {
      const testData = { test: 'value', number: 42 };
      const result = await adapter.setItem('test-key', testData);
      
      expect(result).toBe(true);
      const retrieved = await adapter.getItem<typeof testData>('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await adapter.getItem('non-existent');
      expect(result).toBeNull();
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        memories: [
          { id: '1', content: 'test' },
          { id: '2', content: 'test2' }
        ],
        proposals: [
          { id: 'p1', status: 'PENDING' },
          { id: 'p2', status: 'REJECTED' }
        ]
      };
      
      await adapter.setItem('complex-data', complexData);
      const retrieved = await adapter.getItem<typeof complexData>('complex-data');
      
      expect(retrieved).toEqual(complexData);
      expect(retrieved?.memories).toHaveLength(2);
      expect(retrieved?.proposals).toHaveLength(2);
    });
  });

  describe('removeItem and clear', () => {
    it('should remove specific items', async () => {
      await adapter.setItem('key1', { value: 1 });
      await adapter.setItem('key2', { value: 2 });
      
      await adapter.removeItem('key1');
      
      expect(await adapter.getItem('key1')).toBeNull();
      expect(await adapter.getItem('key2')).not.toBeNull();
    });

    it('should clear all items', async () => {
      await adapter.setItem('key1', { value: 1 });
      await adapter.setItem('key2', { value: 2 });
      
      await adapter.clear();
      
      expect(await adapter.getItem('key1')).toBeNull();
      expect(await adapter.getItem('key2')).toBeNull();
    });
  });

  describe('getAllKeys', () => {
    it('should return all keys', async () => {
      await adapter.setItem('key1', { value: 1 });
      await adapter.setItem('key2', { value: 2 });
      await adapter.setItem('key3', { value: 3 });
      
      const keys = await adapter.getAllKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });
  });
});

describe('StorageManager', () => {
  beforeEach(() => {
    localStorage.clear();
    // Clear the global storage manager instance
    (global as any).storageManager = null;
  });

  it('should use localStorage by default', () => {
    const manager = getStorageManager();
    expect(manager.getBackend()).toBe('localStorage');
  });

  it('should persist backend selection', async () => {
    const manager1 = getStorageManager();
    expect(manager1.getBackend()).toBe('localStorage');
    
    // Set backend to indexedDB
    localStorage.setItem('__storage_backend__', 'indexedDB');
    
    // Get new manager instance (simulating page reload)
    (global as any).storageManager = null;
    const manager2 = getStorageManager();
    expect(manager2.getBackend()).toBe('indexedDB');
  });

  it('should allow switching backends', async () => {
    const manager = getStorageManager();
    
    await manager.switchBackend('indexedDB');
    expect(manager.getBackend()).toBe('indexedDB');
    
    await manager.switchBackend('localStorage');
    expect(manager.getBackend()).toBe('localStorage');
  });

  it('should store and retrieve data through manager', async () => {
    const manager = getStorageManager();
    const testData = { test: 'value' };
    
    await manager.setItem('test-key', testData);
    const retrieved = await manager.getItem<typeof testData>('test-key');
    
    expect(retrieved).toEqual(testData);
  });
});

describe('migrateStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should migrate data from localStorage to IndexedDB', async () => {
    // Setup: Add test data to localStorage
    const testData = {
      'pe_memories': JSON.stringify([{ id: '1', content: 'test' }]),
      'pe_proposals': JSON.stringify([
        { id: 'p1', status: 'PENDING' },
        { id: 'p2', status: 'ACCEPTED' },
        { id: 'p3', status: 'REJECTED' }
      ]),
      'pe_knowledge': JSON.stringify([{ id: 'k1', title: 'test' }])
    };

    for (const [key, value] of Object.entries(testData)) {
      localStorage.setItem(key, value);
    }

    // Migrate
    const result = await migrateStorage('localStorage', 'indexedDB');

    expect(result.success).toBe(true);
    expect(result.migratedKeys.length).toBeGreaterThan(0);
    expect(result.migratedKeys).toContain('pe_memories');
    expect(result.migratedKeys).toContain('pe_proposals');
    expect(result.migratedKeys).toContain('pe_knowledge');

    // Verify proposals were migrated (including PENDING)
    const indexedDBAdapter = new IndexedDBAdapter();
    const migratedProposals = await indexedDBAdapter.getItem<any[]>('pe_proposals');
    
    expect(migratedProposals).not.toBeNull();
    expect(migratedProposals?.length).toBe(3);
    expect(migratedProposals?.find((p: any) => p.id === 'p1' && p.status === 'PENDING')).toBeDefined();
    expect(migratedProposals?.find((p: any) => p.id === 'p2' && p.status === 'ACCEPTED')).toBeDefined();
    expect(migratedProposals?.find((p: any) => p.id === 'p3' && p.status === 'REJECTED')).toBeDefined();

    await indexedDBAdapter.clear();
    await indexedDBAdapter.close();
  });

  it('should preserve PENDING proposals during migration', async () => {
    // Setup: Add proposals with different statuses
    const proposals = [
      { id: 'pending-1', status: 'PENDING', summary: 'Pending proposal 1' },
      { id: 'pending-2', status: 'PENDING', summary: 'Pending proposal 2' },
      { id: 'accepted-1', status: 'ACCEPTED', summary: 'Accepted proposal' },
      { id: 'rejected-1', status: 'REJECTED', summary: 'Rejected proposal' }
    ];

    localStorage.setItem('pe_proposals', JSON.stringify(proposals));

    // Migrate
    const result = await migrateStorage('localStorage', 'indexedDB');

    expect(result.success).toBe(true);

    // Verify all proposals were migrated, especially PENDING ones
    const indexedDBAdapter = new IndexedDBAdapter();
    const migratedProposals = await indexedDBAdapter.getItem<any[]>('pe_proposals');

    expect(migratedProposals).not.toBeNull();
    expect(migratedProposals?.length).toBe(4);
    
    const pendingProposals = migratedProposals?.filter((p: any) => p.status === 'PENDING');
    expect(pendingProposals?.length).toBe(2);
    expect(pendingProposals?.find((p: any) => p.id === 'pending-1')).toBeDefined();
    expect(pendingProposals?.find((p: any) => p.id === 'pending-2')).toBeDefined();

    await indexedDBAdapter.clear();
    await indexedDBAdapter.close();
  });

  it('should not migrate internal configuration keys', async () => {
    localStorage.setItem('pe_memories', JSON.stringify([{ id: '1' }]));
    localStorage.setItem('__internal_config__', 'test');
    localStorage.setItem('__storage_backend__', 'localStorage');

    const result = await migrateStorage('localStorage', 'indexedDB');

    expect(result.success).toBe(true);
    expect(result.migratedKeys).toContain('pe_memories');
    expect(result.migratedKeys).not.toContain('__internal_config__');
    expect(result.migratedKeys).not.toContain('__storage_backend__');

    // Cleanup
    const indexedDBAdapter = new IndexedDBAdapter();
    await indexedDBAdapter.clear();
    await indexedDBAdapter.close();
  });

  it('should update backend config after migration', async () => {
    localStorage.setItem('pe_memories', JSON.stringify([{ id: '1' }]));

    await migrateStorage('localStorage', 'indexedDB');

    // Backend config should be updated in localStorage
    expect(localStorage.getItem('__storage_backend__')).toBe('indexedDB');

    // Cleanup
    const indexedDBAdapter = new IndexedDBAdapter();
    await indexedDBAdapter.clear();
    await indexedDBAdapter.close();
  });

  it('should handle migration errors gracefully', async () => {
    // This test might be tricky in a test environment, but we can at least
    // verify the function doesn't crash
    const result = await migrateStorage('localStorage', 'indexedDB');

    // Should return a result object even if there's no data to migrate
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('migratedKeys');
  });
});
