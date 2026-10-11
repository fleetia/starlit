import { describe, expect, it, vi } from 'vitest';

import {
  DEVICE_STORAGE_SCHEMA_VERSION_KEY,
  DISMISSED_LEGACY_SYNC_HYDRATION_STATE,
  LEGACY_SCENE_SETTINGS_SNAPSHOT_KEY,
  LEGACY_SYNC_HYDRATION_STATE_KEY,
  STORAGE_SCHEMA_VERSION,
  hasLegacySyncHydrationChange,
  migrateStorage,
  normalizeGridSettings,
  normalizeTheme,
  type StorageMigrationDependencies,
} from './migrateStorage';
import {
  DEFAULT_GRID_SETTINGS,
  LEGACY_DEFAULT_GRID_SETTINGS,
} from '../../layout/defaults';
import {
  DEFAULT_STARLIT_THEME,
  LEGACY_DEFAULT_THEME,
} from '../../theme/defaults';
import { DEFAULT_OVERLAY_SCENE } from '../../overlays/model';

function createDependencies(
  syncValues: Record<string, unknown>,
  localValues: Record<string, unknown> = {},
): StorageMigrationDependencies & {
  syncRemove: ReturnType<typeof vi.fn>;
  syncSet: ReturnType<typeof vi.fn>;
  localRemove: ReturnType<typeof vi.fn>;
  localSet: ReturnType<typeof vi.fn>;
  saveCurrentMedia: ReturnType<typeof vi.fn>;
} {
  const syncSet = vi.fn(
    async (items: Record<string, unknown>): Promise<void> => {
      Object.assign(syncValues, items);
    },
  );
  const syncRemove = vi.fn(async (keys: string | string[]): Promise<void> => {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      delete syncValues[key];
    }
  });
  const localSet = vi.fn(
    async (items: Record<string, unknown>): Promise<void> => {
      Object.assign(localValues, items);
    },
  );
  const localRemove = vi.fn(async (keys: string | string[]): Promise<void> => {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      delete localValues[key];
    }
  });
  const saveCurrentMedia = vi.fn(async (): Promise<void> => undefined);

  return {
    sync: {
      get: vi.fn(async (key) => syncValues[key]),
      remove: syncRemove,
      set: syncSet,
    },
    local: {
      get: vi.fn(async (key) => localValues[key]),
      remove: localRemove,
      set: localSet,
    },
    loadCurrentMedia: vi.fn(async () => null),
    loadLegacyMedia: vi.fn(async () => null),
    saveCurrentMedia,
    syncSet,
    syncRemove,
    localSet,
    localRemove,
  };
}

describe('storage normalization', () => {
  it('moves legacy defaults to Lagrange defaults and preserves custom leaves', () => {
    const theme = normalizeTheme({
      ...LEGACY_DEFAULT_THEME,
      accent: '#123456',
    });
    const grid = normalizeGridSettings({
      ...LEGACY_DEFAULT_GRID_SETTINGS,
      gap: '2rem',
    });

    expect(theme).toEqual({
      ...DEFAULT_STARLIT_THEME,
      accent: '#123456',
    });
    expect(grid).toEqual({
      ...DEFAULT_GRID_SETTINGS,
      gap: '2rem',
    });
  });
});

describe('migrateStorage', () => {
  it('waits for an empty sync area without writing sync preference defaults', async () => {
    const syncValues: Record<string, unknown> = {};
    const localValues: Record<string, unknown> = {};
    const dependencies = createDependencies(syncValues, localValues);

    await migrateStorage(dependencies);

    expect(dependencies.syncSet).toHaveBeenCalledOnce();
    expect(dependencies.syncSet).toHaveBeenCalledWith({
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    });
    expect(localValues).toMatchObject({
      [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION,
      [LEGACY_SYNC_HYDRATION_STATE_KEY]: {
        protectedKeys: [],
        schemaVersion: 1,
        status: 'watching',
      },
    });
  });

  it.each([undefined, 2])(
    'preserves schema 2 visual preferences while moving them local with device schema %s',
    async (deviceVersion) => {
      const visualPreferences = {
        colorTheme: { ...LEGACY_DEFAULT_THEME, accent: '#123456' },
        gridSettings: { ...LEGACY_DEFAULT_GRID_SETTINGS, gap: '3rem' },
        iconSize: 32,
        size: 20,
      };
      const syncValues = { ...visualPreferences, storageSchemaVersion: 2 };
      const localValues: Record<string, unknown> = {
        ...(deviceVersion === undefined
          ? {}
          : { [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: deviceVersion }),
      };
      const dependencies = createDependencies(syncValues, localValues);

      await migrateStorage(dependencies);
      await migrateStorage(dependencies);
      const secondDeviceValues: Record<string, unknown> = {};
      await migrateStorage(createDependencies(syncValues, secondDeviceValues));

      expect(secondDeviceValues).toMatchObject(visualPreferences);
      expect(localValues).toMatchObject(visualPreferences);
      expect(syncValues).toMatchObject(visualPreferences);
      expect(localValues[DEVICE_STORAGE_SCHEMA_VERSION_KEY]).toBe(
        STORAGE_SCHEMA_VERSION,
      );
    },
  );

  it('copies recoverable data and writes the version stamp last', async () => {
    const legacyMedia = new Blob(['legacy']);
    const dependencies = createDependencies({
      gridSettings: LEGACY_DEFAULT_GRID_SETTINGS,
      colorTheme: LEGACY_DEFAULT_THEME,
      displaySize: 18,
      iconSize: 40,
      backgroundImage: 'https://example.com/background.jpg',
      bookmarks: [{ title: 'Saved' }],
    });
    dependencies.loadLegacyMedia = vi.fn(async () => legacyMedia);

    await migrateStorage(dependencies);

    expect(dependencies.localSet).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundMeta: {
          source: 'url',
          type: 'image',
          url: 'https://example.com/background.jpg',
        },
        bookmarks: [{ title: 'Saved' }],
        settings: expect.objectContaining({
          fontFamily: 'ibm-plex-sans',
        }),
      }),
    );
    expect(dependencies.saveCurrentMedia).toHaveBeenCalledWith(legacyMedia);
    expect(dependencies.localSet).toHaveBeenCalledWith({
      [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION,
    });
    expect(dependencies.syncRemove).not.toHaveBeenCalled();
    expect(dependencies.syncSet).toHaveBeenLastCalledWith({
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    });
  });

  it('keeps animated GIF URLs as image backgrounds', async () => {
    const dependencies = createDependencies({
      backgroundImage: 'https://example.com/background.gif',
    });

    await migrateStorage(dependencies);

    expect(dependencies.localSet).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundMeta: {
          source: 'url',
          type: 'image',
          url: 'https://example.com/background.gif',
        },
      }),
    );
  });

  it('keeps an explicit cleared background instead of restoring a legacy URL', async () => {
    const dependencies = createDependencies({
      backgroundImage: 'https://example.com/legacy-background.jpg',
      backgroundMeta: null,
    });

    await migrateStorage(dependencies);

    expect(dependencies.localSet).toHaveBeenCalledWith(
      expect.objectContaining({ backgroundMeta: null }),
    );
    expect(dependencies.syncSet).toHaveBeenLastCalledWith({
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    });
  });

  it('migrates device-local data when only the synced version is present', async () => {
    const legacyMedia = new Blob(['legacy']);
    const dependencies = createDependencies({
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
      bookmarks: [{ title: 'Synced' }],
    });
    dependencies.loadLegacyMedia = vi.fn(async () => legacyMedia);

    await migrateStorage(dependencies);

    expect(dependencies.syncSet).not.toHaveBeenCalled();
    expect(dependencies.localSet).toHaveBeenCalledWith(
      expect.objectContaining({ bookmarks: [{ title: 'Synced' }] }),
    );
    expect(dependencies.saveCurrentMedia).toHaveBeenCalledWith(legacyMedia);
    expect(dependencies.localSet).toHaveBeenLastCalledWith({
      [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION,
    });
  });

  it('does not overwrite current device-local data', async () => {
    const currentMedia = new Blob(['current']);
    const dependencies = createDependencies(
      {
        storageSchemaVersion: STORAGE_SCHEMA_VERSION,
        bookmarks: [{ title: 'Synced' }],
      },
      { bookmarks: [{ title: 'Local' }] },
    );
    dependencies.loadCurrentMedia = vi.fn(async () => currentMedia);

    await migrateStorage(dependencies);

    expect(dependencies.localSet).not.toHaveBeenCalledWith(
      expect.objectContaining({ bookmarks: expect.anything() }),
    );
    expect(dependencies.loadLegacyMedia).not.toHaveBeenCalled();
    expect(dependencies.saveCurrentMedia).not.toHaveBeenCalled();
    expect(dependencies.localSet).toHaveBeenCalledWith({
      [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION,
    });
  });

  it('does nothing after both synced and device-local versions are present', async () => {
    const dependencies = createDependencies(
      {
        bookmarks: [{ title: 'Preserved only for older devices' }],
        storageSchemaVersion: STORAGE_SCHEMA_VERSION,
      },
      { [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION },
    );

    await migrateStorage(dependencies);

    expect(dependencies.syncSet).not.toHaveBeenCalled();
    expect(dependencies.localSet).not.toHaveBeenCalled();
    expect(dependencies.loadCurrentMedia).not.toHaveBeenCalled();
  });

  it('preserves a future synced schema while migrating old device-local data', async () => {
    const legacyMedia = new Blob(['legacy']);
    const dependencies = createDependencies({
      bookmarks: [{ title: 'Synced' }],
      storageSchemaVersion: STORAGE_SCHEMA_VERSION + 1,
    });
    dependencies.loadLegacyMedia = vi.fn(async () => legacyMedia);

    await migrateStorage(dependencies);

    expect(dependencies.syncSet).not.toHaveBeenCalled();
    expect(dependencies.localSet).toHaveBeenCalledWith(
      expect.objectContaining({ bookmarks: [{ title: 'Synced' }] }),
    );
    expect(dependencies.saveCurrentMedia).toHaveBeenCalledWith(legacyMedia);
    expect(dependencies.localSet).toHaveBeenLastCalledWith({
      [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION,
    });
  });

  it('preserves a future device-local schema while migrating old synced data', async () => {
    const dependencies = createDependencies(
      { storageSchemaVersion: STORAGE_SCHEMA_VERSION - 1 },
      { [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION + 1 },
    );

    await migrateStorage(dependencies);

    expect(dependencies.syncSet).toHaveBeenLastCalledWith({
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    });
    expect(dependencies.localSet).not.toHaveBeenCalled();
    expect(dependencies.loadCurrentMedia).not.toHaveBeenCalled();
  });

  it('does not copy or remove legacy Scene data when the device schema is newer', async () => {
    const dependencies = createDependencies(
      {
        bookmarks: [{ title: 'Future-owned' }],
        customCSS: '.private { background: url(https://example.test); }',
        storageSchemaVersion: STORAGE_SCHEMA_VERSION - 1,
      },
      { [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION + 1 },
    );

    await migrateStorage(dependencies);

    expect(dependencies.localSet).not.toHaveBeenCalled();
    expect(dependencies.syncRemove).not.toHaveBeenCalled();
    expect(dependencies.loadCurrentMedia).not.toHaveBeenCalled();
  });

  it('keeps malformed schema versions on the legacy migration path', async () => {
    const futureVersionText = String(STORAGE_SCHEMA_VERSION + 1);
    const dependencies = createDependencies(
      { storageSchemaVersion: futureVersionText },
      { [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: futureVersionText },
    );

    await migrateStorage(dependencies);

    expect(dependencies.syncSet).toHaveBeenLastCalledWith({
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    });
    expect(dependencies.localSet).toHaveBeenLastCalledWith({
      [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION,
    });
  });

  it('moves legacy Scene payloads local-first and preserves them for other devices', async () => {
    const localTheme = { ...DEFAULT_STARLIT_THEME, accent: '#654321' };
    const dependencies = createDependencies(
      {
        backgroundMeta: {
          source: 'url',
          type: 'image',
          url: 'https://private.example/background.webp',
        },
        bookmarkTreePrefs: {
          rootPath: ['Private'],
          siblingOrder: { Private: ['Bank'] },
        },
        colorTheme: LEGACY_DEFAULT_THEME,
        settings: {
          fontFamily: 'ibm-plex-sans',
          isExpandView: false,
          isFolderEnabled: true,
          isOpenInNewTab: true,
          isVisibleOnce: false,
        },
        storageSchemaVersion: STORAGE_SCHEMA_VERSION,
      },
      { colorTheme: localTheme },
    );

    await migrateStorage(dependencies);

    expect(dependencies.localSet).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundMeta: {
          source: 'url',
          type: 'image',
          url: 'https://private.example/background.webp',
        },
        bookmarkTreePrefs: {
          rootPath: ['Private'],
          siblingOrder: { Private: ['Bank'] },
        },
        settings: expect.objectContaining({ isOpenInNewTab: true }),
      }),
    );
    expect(dependencies.localSet.mock.calls[0]?.[0]).toMatchObject({
      colorTheme: localTheme,
    });
    expect(dependencies.syncSet).toHaveBeenCalledWith({
      settings: { isOpenInNewTab: true },
    });
    expect(dependencies.syncSet.mock.calls).not.toEqual(
      expect.arrayContaining([
        [expect.objectContaining({ backgroundMeta: expect.anything() })],
      ]),
    );
    expect(dependencies.syncRemove).not.toHaveBeenCalled();
  });

  it('lets a second device migrate after the first device normalizes synced settings', async () => {
    const legacySettings = {
      fontFamily: 'system',
      isExpandView: false,
      isFolderEnabled: false,
      isOpenInNewTab: true,
      isVisibleOnce: true,
    };
    const sharedSync: Record<string, unknown> = {
      bookmarks: [{ title: 'Shared legacy bookmark' }],
      colorTheme: LEGACY_DEFAULT_THEME,
      gridSettings: LEGACY_DEFAULT_GRID_SETTINGS,
      settings: legacySettings,
    };
    const firstLocal: Record<string, unknown> = {};
    const secondLocal: Record<string, unknown> = {};

    await migrateStorage(createDependencies(sharedSync, firstLocal));

    expect(sharedSync).toMatchObject({
      [LEGACY_SCENE_SETTINGS_SNAPSHOT_KEY]: legacySettings,
      bookmarks: [{ title: 'Shared legacy bookmark' }],
      settings: { isOpenInNewTab: true },
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    });

    await migrateStorage(createDependencies(sharedSync, secondLocal));

    expect(secondLocal).toMatchObject({
      [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION,
      bookmarks: [{ title: 'Shared legacy bookmark' }],
      settings: expect.objectContaining({
        fontFamily: 'system',
        isExpandView: false,
        isFolderEnabled: false,
        isOpenInNewTab: true,
        isVisibleOnce: true,
      }),
    });
  });

  it('imports legacy Scene keys that hydrate incrementally after the device stamp', async () => {
    const sharedSync: Record<string, unknown> = {};
    const localValues: Record<string, unknown> = {};
    const dependencies = createDependencies(sharedSync, localValues);

    await migrateStorage(dependencies);
    localValues.overlayScene = DEFAULT_OVERLAY_SCENE;
    Object.assign(sharedSync, {
      bookmarks: [{ title: 'Late bookmark' }],
      settings: {
        fontFamily: 'system',
        isExpandView: true,
        isFolderEnabled: false,
        isOpenInNewTab: true,
        isVisibleOnce: true,
      },
    });

    await migrateStorage(dependencies);

    expect(localValues).toMatchObject({
      bookmarks: [{ title: 'Late bookmark' }],
      overlayScene: DEFAULT_OVERLAY_SCENE,
      settings: {
        fontFamily: 'system',
        isExpandView: true,
        isFolderEnabled: false,
        isOpenInNewTab: true,
        isVisibleOnce: true,
      },
    });
    expect(sharedSync).toMatchObject({
      [LEGACY_SCENE_SETTINGS_SNAPSHOT_KEY]: expect.objectContaining({
        fontFamily: 'system',
      }),
      settings: { isOpenInNewTab: true },
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    });

    const lateTheme = { ...LEGACY_DEFAULT_THEME, accent: '#234567' };
    Object.assign(sharedSync, {
      colorTheme: lateTheme,
      gridSettings: {
        ...LEGACY_DEFAULT_GRID_SETTINGS,
        gap: '3rem',
      },
    });

    await migrateStorage(dependencies);

    expect(localValues.colorTheme).toEqual({
      ...DEFAULT_STARLIT_THEME,
      accent: '#234567',
    });
    expect(localValues.gridSettings).toEqual({
      ...DEFAULT_GRID_SETTINGS,
      gap: '3rem',
    });
    expect(localValues[LEGACY_SYNC_HYDRATION_STATE_KEY]).toMatchObject({
      schemaVersion: 1,
      status: 'watching',
    });
  });

  it('dismisses late legacy hydration after the local v2 profile changes', async () => {
    const sharedSync: Record<string, unknown> = {};
    const localValues: Record<string, unknown> = {};
    const dependencies = createDependencies(sharedSync, localValues);

    await migrateStorage(dependencies);
    const currentTheme = { ...DEFAULT_STARLIT_THEME, accent: '#abcdef' };
    localValues.colorTheme = currentTheme;
    Object.assign(sharedSync, {
      bookmarks: [{ title: 'Must not overwrite' }],
      colorTheme: LEGACY_DEFAULT_THEME,
    });

    await migrateStorage(dependencies);

    expect(localValues.colorTheme).toEqual(currentTheme);
    expect(localValues.bookmarks).toBeUndefined();
    expect(localValues[LEGACY_SYNC_HYDRATION_STATE_KEY]).toEqual(
      DISMISSED_LEGACY_SYNC_HYDRATION_STATE,
    );
  });

  it('ignores the device bookmark cache when checking for local v2 changes', async () => {
    const sharedSync: Record<string, unknown> = {};
    const localValues: Record<string, unknown> = {};
    const dependencies = createDependencies(sharedSync, localValues);

    await migrateStorage(dependencies);
    localValues.bookmarks = [{ title: 'Current Chrome bookmarks' }];
    sharedSync.colorTheme = {
      ...LEGACY_DEFAULT_THEME,
      accent: '#345678',
    };
    sharedSync.bookmarks = [{ title: 'Remote bookmark cache' }];

    await migrateStorage(dependencies);

    expect(localValues.bookmarks).toEqual([
      { title: 'Current Chrome bookmarks' },
    ]);
    expect(localValues.colorTheme).toEqual({
      ...DEFAULT_STARLIT_THEME,
      accent: '#345678',
    });
    expect(localValues[LEGACY_SYNC_HYDRATION_STATE_KEY]).toMatchObject({
      status: 'watching',
    });
  });

  it('preserves pre-existing local keys while accepting other late legacy keys', async () => {
    const sharedSync: Record<string, unknown> = {};
    const localTheme = { ...DEFAULT_STARLIT_THEME, accent: '#765432' };
    const localValues: Record<string, unknown> = { colorTheme: localTheme };
    const dependencies = createDependencies(sharedSync, localValues);

    await migrateStorage(dependencies);
    Object.assign(sharedSync, {
      bookmarks: [{ title: 'Late bookmark' }],
      colorTheme: LEGACY_DEFAULT_THEME,
    });

    await migrateStorage(dependencies);

    expect(localValues.colorTheme).toEqual(localTheme);
    expect(localValues.bookmarks).toEqual([{ title: 'Late bookmark' }]);
  });

  it('does not stamp the version when a data write fails', async () => {
    const dependencies = createDependencies({});
    dependencies.local.set = vi.fn(async (): Promise<void> => {
      throw new Error('storage failed');
    });
    dependencies.local.get = vi.fn(async () => undefined);
    dependencies.sync.get = vi.fn(async (key) =>
      key === 'bookmarks' ? [{ title: 'Saved' }] : undefined,
    );

    await expect(migrateStorage(dependencies)).rejects.toThrow(
      'storage failed',
    );

    expect(
      (await dependencies.sync.get('storageSchemaVersion')) ?? undefined,
    ).toBeUndefined();
  });

  it('retries an interruption before either version stamp is written', async () => {
    const dependencies = createDependencies({
      bookmarks: [{ title: 'Saved' }],
      gridSettings: LEGACY_DEFAULT_GRID_SETTINGS,
    });
    dependencies.syncSet.mockRejectedValueOnce(
      new Error('sync migration interrupted'),
    );

    await expect(migrateStorage(dependencies)).rejects.toThrow(
      'sync migration interrupted',
    );

    expect(dependencies.localSet).not.toHaveBeenCalledWith({
      [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION,
    });
    expect(
      (await dependencies.sync.get('storageSchemaVersion')) ?? undefined,
    ).toBeUndefined();

    await expect(migrateStorage(dependencies)).resolves.toBeUndefined();

    expect(dependencies.syncSet).toHaveBeenCalledTimes(2);
    expect(dependencies.localSet).toHaveBeenCalledWith({
      [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION,
    });
    expect(dependencies.syncSet).toHaveBeenLastCalledWith({
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    });
  });
});

describe('hasLegacySyncHydrationChange', () => {
  it('matches only relevant sync changes', () => {
    expect(
      hasLegacySyncHydrationChange(
        { colorTheme: { newValue: LEGACY_DEFAULT_THEME } },
        'sync',
      ),
    ).toBe(true);
    expect(
      hasLegacySyncHydrationChange(
        { colorTheme: { newValue: LEGACY_DEFAULT_THEME } },
        'local',
      ),
    ).toBe(false);
    expect(
      hasLegacySyncHydrationChange({ locale: { newValue: 'ko' } }, 'sync'),
    ).toBe(false);
    expect(
      hasLegacySyncHydrationChange(
        { colorTheme: { oldValue: LEGACY_DEFAULT_THEME } },
        'sync',
      ),
    ).toBe(false);
  });
});
