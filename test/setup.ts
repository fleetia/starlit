import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

beforeAll((): void => {
  Object.defineProperty(globalThis, 'chrome', {
    configurable: true,
    value: {
      bookmarks: {
        getTree: vi.fn(),
        remove: vi.fn(),
      },
      runtime: {
        onInstalled: { addListener: vi.fn() },
        onMessage: { addListener: vi.fn() },
        sendMessage: vi.fn(),
      },
      storage: {
        local: {
          get: vi.fn(),
          remove: vi.fn(),
          set: vi.fn(),
        },
        sync: {
          get: vi.fn(),
          remove: vi.fn(),
          set: vi.fn(),
        },
      },
    },
    writable: true,
  });
});

afterEach((): void => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});
