import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto.subtle for content hashing tests and crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => {
      uuidCounter++;
      return `test-uuid-${uuidCounter}-${Date.now()}`;
    },
    subtle: {
      digest: async (algorithm: string, data: Uint8Array) => {
        // Simple mock implementation for testing
        const hashArray = new Uint8Array(32);
        for (let i = 0; i < data.length; i++) {
          hashArray[i % 32] ^= data[i];
        }
        return hashArray.buffer;
      },
    },
  },
});

// Mock IndexedDB for testing
class MockIDBDatabase {
  objectStoreNames = { contains: () => true };
  transaction() { return new MockIDBTransaction(); }
  close() {}
  createObjectStore() { return {}; }
}

class MockIDBTransaction {
  objectStore() { return new MockIDBObjectStore(); }
}

class MockIDBObjectStore {
  private _store?: Map<any, any>;
  
  get store(): Map<any, any> {
    return this._store || new Map();
  }
  
  set store(value: Map<any, any>) {
    this._store = value;
  }
  
  get(key: any): MockIDBRequest {
    return new MockIDBRequest(this.store.get(key) || null);
  }
  
  put(value: any, key: any): MockIDBRequest {
    this.store.set(key, value);
    return new MockIDBRequest(key);
  }
  
  delete(key: any): MockIDBRequest {
    this.store.delete(key);
    return new MockIDBRequest(undefined);
  }
  
  clear(): MockIDBRequest {
    this.store.clear();
    return new MockIDBRequest(undefined);
  }
  
  getAllKeys(): MockIDBRequest {
    return new MockIDBRequest(Array.from(this.store.keys()));
  }
}

class MockIDBRequest {
  result: any;
  error: any = null;
  onsuccess: ((this: IDBRequest, ev: Event) => any) | null = null;
  onerror: ((this: IDBRequest, ev: Event) => any) | null = null;

  constructor(result: any) {
    this.result = result;
    // Auto-resolve in next tick
    setTimeout(() => {
      if (this.onsuccess) {
        this.onsuccess.call(this, new Event('success'));
      }
    }, 0);
  }
}

class MockIDBOpenDBRequest extends MockIDBRequest {
  onupgradeneeded: ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => any) | null = null;
  onblocked: ((this: IDBOpenDBRequest, ev: Event) => any) | null = null;

  constructor(result: MockIDBDatabase) {
    super(result);
    // Auto-resolve upgrade
    setTimeout(() => {
      if (this.onupgradeneeded) {
        const event = new Event('upgradeneeded') as any;
        event.target = this;
        event.newVersion = 1;
        event.oldVersion = 0;
        this.onupgradeneeded.call(this, event);
      }
      if (this.onsuccess) {
        this.onsuccess.call(this, new Event('success'));
      }
    }, 0);
  }
}

const mockIndexedDBStore = new Map<string, Map<any, any>>();

// Store store map per database name
Object.defineProperty(global, 'indexedDB', {
  value: {
    open: (name: string, version?: number) => {
      if (!mockIndexedDBStore.has(name)) {
        mockIndexedDBStore.set(name, new Map());
      }
      const db = new MockIDBDatabase() as any;
      db.name = name;
      db.version = version || 1;
      db.objectStoreNames = {
        contains: (storeName: string) => mockIndexedDBStore.has(name)
      };
      
      const store = mockIndexedDBStore.get(name)!;
      db.transaction = () => {
        const tx = new MockIDBTransaction();
        const objectStore = new MockIDBObjectStore() as any;
        objectStore.store = store;
        tx.objectStore = () => objectStore;
        return tx;
      };
      
      return new MockIDBOpenDBRequest(db);
    },
    deleteDatabase: () => {
      return new MockIDBRequest(undefined);
    },
  },
  writable: true,
});

// Also define on window and globalThis for browser-like environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'indexedDB', {
    value: (global as any).indexedDB,
    writable: true,
  });
}

// Also define on globalThis (used by some environments)
if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'indexedDB', {
    value: (global as any).indexedDB,
    writable: true,
  });
}

// Mock navigator.storage for quota estimation
Object.defineProperty(global, 'navigator', {
  value: {
    ...global.navigator,
    storage: {
      estimate: async () => ({
        quota: 50 * 1024 * 1024, // 50MB
        usage: 1024 * 1024, // 1MB
      }),
    },
  },
  writable: true,
});