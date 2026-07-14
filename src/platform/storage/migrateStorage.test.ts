import { describe, expect, it, vi } from 'vitest';

import {
  DEVICE_STORAGE_SCHEMA_VERSION_KEY,
  STORAGE_SCHEMA_VERSION,
  migrateStorage,
  normalizeGridSettings,
  normalizeTheme,
  type StorageMigrationDependencies,
} from './migrateStorage';
import {
  DEFAULT_GRID_SETTINGS,
  DEFAULT_STARLIT_THEME,
  LEGACY_DEFAULT_GRID_SETTINGS,
  LEGACY_DEFAULT_THEME,
} from '../../newtab/defaultOptionValue';

function createDependencies(
  syncValues: Record<string, unknown>,
  localValues: Record<string, unknown> = {},
): StorageMigrationDependencies & {
  syncSet: ReturnType<typeof vi.fn>;
  localSet: ReturnType<typeof vi.fn>;
  saveCurrentMedia: ReturnType<typeof vi.fn>;
} {
  const syncSet = vi.fn(async (): Promise<void> => undefined);
  const localSet = vi.fn(async (): Promise<void> => undefined);
  const saveCurrentMedia = vi.fn(async (): Promise<void> => undefined);

  return {
    sync: {
      get: vi.fn(async (key) => syncValues[key]),
      set: syncSet,
    },
    local: {
      get: vi.fn(async (key) => localValues[key]),
      set: localSet,
    },
    loadCurrentMedia: vi.fn(async () => null),
    loadLegacyMedia: vi.fn(async () => null),
    saveCurrentMedia,
    syncSet,
    localSet,
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

    expect(dependencies.localSet).toHaveBeenCalledWith({
      bookmarks: [{ title: 'Saved' }],
    });
    expect(dependencies.saveCurrentMedia).toHaveBeenCalledWith(legacyMedia);
    expect(dependencies.localSet).toHaveBeenCalledWith({
      [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION,
    });
    expect(dependencies.syncSet).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundMeta: {
          source: 'url',
          type: 'image',
          url: 'https://example.com/background.jpg',
        },
      }),
    );
    expect(dependencies.syncSet).toHaveBeenLastCalledWith({
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    });
  });

  it('keeps animated GIF URLs as image backgrounds', async () => {
    const dependencies = createDependencies({
      backgroundImage: 'https://example.com/background.gif',
    });

    await migrateStorage(dependencies);

    expect(dependencies.syncSet).toHaveBeenCalledWith(
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

    expect(dependencies.syncSet.mock.calls[0]?.[0]).not.toHaveProperty(
      'backgroundMeta',
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
    expect(dependencies.localSet).toHaveBeenCalledWith({
      bookmarks: [{ title: 'Synced' }],
    });
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
      { storageSchemaVersion: STORAGE_SCHEMA_VERSION },
      { [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION },
    );

    await migrateStorage(dependencies);

    expect(dependencies.syncSet).not.toHaveBeenCalled();
    expect(dependencies.localSet).not.toHaveBeenCalled();
    expect(dependencies.loadCurrentMedia).not.toHaveBeenCalled();
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

    expect(dependencies.syncSet).not.toHaveBeenCalledWith({
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    });
  });
});
