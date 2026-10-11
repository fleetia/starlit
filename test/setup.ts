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
      permissions: {
        contains: vi.fn(async () => false),
        request: vi.fn(async () => true),
      },
      runtime: {
        onInstalled: { addListener: vi.fn() },
        onMessage: { addListener: vi.fn() },
        sendMessage: vi.fn(),
      },
      tabs: {
        create: vi.fn(),
      },
      storage: {
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
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
