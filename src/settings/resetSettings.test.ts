import { beforeEach, describe, expect, it, vi } from 'vitest';

const resetMocks = vi.hoisted(() => ({
  deleteMedia: vi.fn(async (): Promise<void> => undefined),
  deleteMediaByPrefix: vi.fn(async (): Promise<void> => undefined),
  localGetAll: vi.fn(async (): Promise<Record<string, unknown>> => ({})),
  localRemove: vi.fn(async (): Promise<void> => undefined),
  syncRemove: vi.fn(async (): Promise<void> => undefined),
  syncSet: vi.fn(async (): Promise<void> => undefined),
}));

vi.mock('../platform/storage/mediaStorage', () => ({
  deleteMedia: resetMocks.deleteMedia,
  deleteMediaByPrefix: resetMocks.deleteMediaByPrefix,
}));

vi.mock('../platform/storage/storage', () => ({
  default: {
    local: {
      getAll: resetMocks.localGetAll,
      remove: resetMocks.localRemove,
    },
    sync: {
      remove: resetMocks.syncRemove,
      set: resetMocks.syncSet,
    },
  },
}));

import { resetAllSettings } from './resetSettings';

beforeEach((): void => {
  Object.values(resetMocks).forEach((mock) => mock.mockClear());
  resetMocks.localGetAll.mockResolvedValue({
    'overlayImageDraftLease:session-1': { items: [], updatedAt: 1 },
    'overlayMediaMutationLease:import-1': { updatedAt: 1 },
  });
});

describe('resetAllSettings', () => {
  it('resets current preferences and clears app-owned caches and media', async () => {
    await resetAllSettings();

    expect(resetMocks.syncSet).toHaveBeenCalledWith(
      expect.objectContaining({
        iconSize: 28,
        settings: expect.objectContaining({
          fontFamily: 'ibm-plex-sans',
        }),
        size: 16,
        storageSchemaVersion: 2,
      }),
    );
    expect(resetMocks.syncRemove).toHaveBeenCalledWith(
      expect.arrayContaining([
        'backgroundMeta',
        'bookmarkTreePrefs',
        'customCSS',
        'groupPreferences',
        'locale',
      ]),
    );
    expect(resetMocks.localRemove).toHaveBeenCalledWith([
      'bookmarks',
      'favicons',
      'overlayScene',
      'overlayImageDraftLease:session-1',
      'overlayMediaMutationLease:import-1',
    ]);
    expect(resetMocks.deleteMedia).toHaveBeenCalledWith('backgroundMedia');
    expect(resetMocks.deleteMediaByPrefix).toHaveBeenCalledWith(
      'overlayImage:',
    );
    expect(resetMocks.deleteMediaByPrefix).toHaveBeenCalledWith(
      'overlayImageDraft:',
    );
  });
});
