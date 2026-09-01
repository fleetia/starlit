import { beforeEach, describe, expect, it } from 'vitest';

import storage from './storage';

beforeEach((): void => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('session storage adapter', () => {
  it('keeps event cache data separate from persistent local storage', async () => {
    await storage.session.set({ calendarEvents: [{ summary: 'Planning' }] });

    await expect(storage.session.get('calendarEvents')).resolves.toEqual([
      { summary: 'Planning' },
    ]);
    await expect(storage.local.get('calendarEvents')).resolves.toBeUndefined();

    await storage.session.remove('calendarEvents');
    await expect(
      storage.session.get('calendarEvents'),
    ).resolves.toBeUndefined();
  });
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
