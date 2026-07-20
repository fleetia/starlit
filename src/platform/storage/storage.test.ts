import { beforeEach, describe, expect, it } from 'vitest';

import storage from './storage';

beforeEach((): void => {
  localStorage.clear();
});

describe('local storage adapter', () => {
  it('matches Chrome storage semantics for a missing key', async (): Promise<void> => {
    await expect(storage.local.get('missing')).resolves.toBeUndefined();
  });

  it('preserves an explicitly stored null value', async (): Promise<void> => {
    await storage.local.set({ overlayScene: null });

    await expect(storage.local.get('overlayScene')).resolves.toBeNull();
  });
});
