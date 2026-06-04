import { beforeAll, afterEach, vi } from "vitest";

beforeAll(() => {
  (global as unknown as Record<string, unknown>).chrome = {
    runtime: {
      onInstalled: {
        addListener: vi.fn()
      },
      onMessage: {
        addListener: vi.fn()
      },
      sendMessage: vi.fn()
    },
    storage: {
      sync: {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn()
      },
      local: {
        get: vi.fn(),
        set: vi.fn()
      }
    },
    bookmarks: {
      remove: vi.fn()
    }
  };
});

afterEach(() => {
  vi.clearAllMocks();
});
