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

// Mock crypto.subtle for content hashing tests
Object.defineProperty(global, 'crypto', {
  value: {
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
