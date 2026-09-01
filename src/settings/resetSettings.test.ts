import { beforeEach, describe, expect, it, vi } from 'vitest';

const resetMocks = vi.hoisted(() => ({
  deleteLegacyMedia: vi.fn(async (): Promise<void> => undefined),
  deleteMedia: vi.fn(async (): Promise<void> => undefined),
  deleteMediaByPrefix: vi.fn(async (): Promise<void> => undefined),
  localGetAll: vi.fn(async (): Promise<Record<string, unknown>> => ({})),
  localRemove: vi.fn(async (): Promise<void> => undefined),
  localSet: vi.fn(async (): Promise<void> => undefined),
  replaceIndexedRecordSet: vi.fn(async (): Promise<void> => undefined),
  sessionRemove: vi.fn(async (): Promise<void> => undefined),
  syncRemove: vi.fn(async (): Promise<void> => undefined),
  syncSet: vi.fn(async (): Promise<void> => undefined),
  withExclusiveLock: vi.fn(
    (_name: string, operation: () => Promise<unknown>): Promise<unknown> =>
      operation(),
  ),
}));

vi.mock('../platform/locks/exclusiveLock', () => ({
  withExclusiveLock: resetMocks.withExclusiveLock,
}));

vi.mock('../platform/storage/mediaStorage', () => ({
  deleteLegacyMedia: resetMocks.deleteLegacyMedia,
  deleteMedia: resetMocks.deleteMedia,
  deleteMediaByPrefix: resetMocks.deleteMediaByPrefix,
  SCENE_STORE_NAME: 'scenes',
  SHARED_ASSET_STORE_NAME: 'assets',
}));

vi.mock('../platform/storage/indexedDbRecords', () => ({
  replaceIndexedRecordSet: resetMocks.replaceIndexedRecordSet,
}));

vi.mock('../platform/storage/storage', () => ({
  default: {
    local: {
      getAll: resetMocks.localGetAll,
      remove: resetMocks.localRemove,
      set: resetMocks.localSet,
    },
    sync: {
      remove: resetMocks.syncRemove,
      set: resetMocks.syncSet,
    },
    session: {
      remove: resetMocks.sessionRemove,
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

    expect(resetMocks.syncSet).toHaveBeenCalledWith({
      settings: { isOpenInNewTab: false },
      storageSchemaVersion: 3,
    });
    expect(resetMocks.withExclusiveLock).toHaveBeenCalledWith(
      'starlit-storage-migration',
      expect.any(Function),
    );
    expect(resetMocks.syncRemove).toHaveBeenCalledWith(
      expect.arrayContaining([
        'backgroundMeta',
        'bookmarkTreePrefs',
        'colorTheme',
        'customCSS',
        'expandedGroupsState',
        'gridSettings',
        'groupPreferences',
        'iconSize',
        'legacySceneSettingsV1',
        'locale',
        'overlayScene',
        'size',
      ]),
    );
    expect(resetMocks.localRemove).toHaveBeenCalledWith(
      expect.arrayContaining([
        'bookmarks',
        'expandedGroupsState',
        'favicons',
        'googleCalendar.calendarList.v1',
        'googleCalendar.selectedCalendarIds',
        'backgroundMeta',
        'bookmarkTreePrefs',
        'colorTheme',
        'customCSS',
        'gridSettings',
        'groupPreferences',
        'iconSize',
        'overlayScene',
        'sceneIndex',
        'settings',
        'size',
        'tutorialStatus',
        'activeSceneId',
        'overlayImageDraftLease:session-1',
        'overlayMediaMutationLease:import-1',
      ]),
    );
    expect(resetMocks.sessionRemove).toHaveBeenCalledWith(
      'googleCalendar.eventCache.v1',
    );
    expect(resetMocks.deleteMedia).toHaveBeenCalledWith('backgroundMedia');
    expect(resetMocks.deleteLegacyMedia).toHaveBeenCalledWith(
      'backgroundMedia',
    );
    expect(resetMocks.deleteMediaByPrefix).toHaveBeenCalledWith(
      'overlayImage:',
    );
    expect(resetMocks.deleteMediaByPrefix).toHaveBeenCalledWith(
      'overlayImageDraft:',
    );
    expect(resetMocks.localSet).toHaveBeenLastCalledWith({
      legacySyncHydrationStateV1: {
        schemaVersion: 1,
        status: 'dismissed',
      },
    });
  });
});
