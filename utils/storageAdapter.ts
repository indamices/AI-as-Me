/**
 * 存储适配器抽象层
 * 支持 localStorage 和 IndexedDB 两种存储后端
 * 提供统一的存储接口，可以动态切换存储方式
 */

export type StorageBackend = 'localStorage' | 'indexedDB';

export interface StorageAdapter {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<boolean>;
  removeItem(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
  estimateQuota?(): Promise<number | null>;
  getUsage?(): Promise<number | null>;
}

/**
 * localStorage 适配器
 */
export class LocalStorageAdapter implements StorageAdapter {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error(`LocalStorage quota exceeded for key "${key}"`);
        throw new Error('QUOTA_EXCEEDED');
      }
      console.error(`Error writing localStorage key "${key}":`, error);
      return false;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      return false;
    }
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return Object.keys(localStorage);
  }

  async estimateQuota(): Promise<number | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return estimate.quota || null;
      } catch (error) {
        console.error('Error estimating storage quota:', error);
        return null;
      }
    }
    // localStorage 通常限制在 5-10MB
    return 5 * 1024 * 1024; // 5MB (保守估计)
  }

  async getUsage(): Promise<number | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || null;
      } catch (error) {
        console.error('Error getting storage usage:', error);
        // 手动计算 localStorage 使用量
        let total = 0;
        for (const key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length + key.length;
          }
        }
        return total;
      }
    }
    return null;
  }
}

/**
 * IndexedDB 适配器
 */
export class IndexedDBAdapter implements StorageAdapter {
  private dbName = 'ai-as-me-storage';
  private dbVersion = 1;
  private storeName = 'data-store';
  private db: IDBDatabase | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? (result as T) : null);
        };
      });
    } catch (error) {
      console.error(`Error reading IndexedDB key "${key}":`, error);
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);

        request.onerror = () => {
          if (request.error?.name === 'QuotaExceededError') {
            reject(new Error('QUOTA_EXCEEDED'));
          } else {
            reject(request.error);
          }
        };
        request.onsuccess = () => resolve(true);
      });
    } catch (error) {
      console.error(`Error writing IndexedDB key "${key}":`, error);
      return false;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(true);
      });
    } catch (error) {
      console.error(`Error removing IndexedDB key "${key}":`, error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAllKeys();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          resolve(request.result.map(key => String(key)));
        };
      });
    } catch (error) {
      console.error('Error getting all keys from IndexedDB:', error);
      return [];
    }
  }

  async estimateQuota(): Promise<number | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return estimate.quota || null;
      } catch (error) {
        console.error('Error estimating storage quota:', error);
        return null;
      }
    }
    // IndexedDB 通常提供更大的配额（数百MB到几GB）
    return 50 * 1024 * 1024; // 50MB (保守估计)
  }

  async getUsage(): Promise<number | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || null;
      } catch (error) {
        console.error('Error getting storage usage:', error);
        return null;
      }
    }
    return null;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * 存储管理器 - 统一管理存储适配器
 */
class StorageManager {
  private adapter: StorageAdapter;
  private backend: StorageBackend;

  constructor(backend: StorageBackend = 'localStorage') {
    this.backend = backend;
    this.adapter = backend === 'indexedDB' ? new IndexedDBAdapter() : new LocalStorageAdapter();
  }

  getBackend(): StorageBackend {
    return this.backend;
  }

  async switchBackend(backend: StorageBackend): Promise<void> {
    if (this.backend === backend) return;

    // 关闭旧的适配器连接
    if (this.adapter instanceof IndexedDBAdapter) {
      await this.adapter.close();
    }

    this.backend = backend;
    this.adapter = backend === 'indexedDB' ? new IndexedDBAdapter() : new LocalStorageAdapter();
  }

  getAdapter(): StorageAdapter {
    return this.adapter;
  }

  async getItem<T>(key: string): Promise<T | null> {
    return this.adapter.getItem<T>(key);
  }

  async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      return await this.adapter.setItem(key, value);
    } catch (error) {
      if ((error as Error).message === 'QUOTA_EXCEEDED') {
        throw error;
      }
      return false;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    return this.adapter.removeItem(key);
  }

  async clear(): Promise<void> {
    return this.adapter.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return this.adapter.getAllKeys();
  }

  async estimateQuota(): Promise<number | null> {
    if (this.adapter.estimateQuota) {
      return this.adapter.estimateQuota();
    }
    return null;
  }

  async getUsage(): Promise<number | null> {
    if (this.adapter.getUsage) {
      return this.adapter.getUsage();
    }
    return null;
  }
}

// 全局存储管理器实例
let storageManager: StorageManager | null = null;

/**
 * 获取存储管理器实例（单例模式）
 */
export function getStorageManager(): StorageManager {
  if (!storageManager) {
    // 从 localStorage 读取存储后端配置（使用特殊键，避免循环依赖）
    const storedBackend = localStorage.getItem('__storage_backend__') as StorageBackend | null;
    const backend = storedBackend && ['localStorage', 'indexedDB'].includes(storedBackend)
      ? storedBackend
      : 'localStorage';
    storageManager = new StorageManager(backend);
  }
  return storageManager;
}

/**
 * 迁移数据从一个存储后端到另一个
 */
export async function migrateStorage(
  fromBackend: StorageBackend,
  toBackend: StorageBackend
): Promise<{ success: boolean; migratedKeys: string[]; error?: string }> {
  const fromAdapter = fromBackend === 'indexedDB' ? new IndexedDBAdapter() : new LocalStorageAdapter();
  const toAdapter = toBackend === 'indexedDB' ? new IndexedDBAdapter() : new LocalStorageAdapter();

  try {
    const keys = await fromAdapter.getAllKeys();
    const migratedKeys: string[] = [];

    // 迁移所有数据（排除内部配置键）
    const keysToMigrate = keys.filter(key => !key.startsWith('__'));

    for (const key of keysToMigrate) {
      try {
        const value = await fromAdapter.getItem(key);
        if (value !== null) {
          await toAdapter.setItem(key, value);
          migratedKeys.push(key);
        }
      } catch (error) {
        console.warn(`Failed to migrate key "${key}":`, error);
      }
    }

    // 如果迁移成功，更新配置（保存在 localStorage 中，因为这是应用启动时读取的地方）
    if (migratedKeys.length > 0) {
      localStorage.setItem('__storage_backend__', toBackend);
    }

    return { success: true, migratedKeys };
  } catch (error) {
    return {
      success: false,
      migratedKeys: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    if (fromAdapter instanceof IndexedDBAdapter) {
      await fromAdapter.close();
    }
    if (toAdapter instanceof IndexedDBAdapter) {
      await toAdapter.close();
    }
  }
}
