import { normalizeGridSettings } from '../../layout/normalizeGridSettings';
import type { BackgroundMedia } from '../../settings/backgroundMedia';
import { DEFAULT_ICON_SIZE, DEFAULT_SIZE } from '../../settings/defaults';
import { normalizeSettings } from '../../settings/normalizeSettings';
import { normalizeTheme } from '../../theme/normalizeTheme';
import { loadLegacyMediaBlob, loadMediaBlob, saveMedia } from './mediaStorage';
import storage from './storage';
import { STORAGE_SCHEMA_VERSION } from './schema';

export { STORAGE_SCHEMA_VERSION } from './schema';
export { normalizeGridSettings } from '../../layout/normalizeGridSettings';
export { normalizeTheme } from '../../theme/normalizeTheme';
const MEDIA_KEY = 'backgroundMedia';
export const DEVICE_STORAGE_SCHEMA_VERSION_KEY = 'deviceStorageSchemaVersion';

type StorageAreaAdapter = {
  get: (key: string) => Promise<unknown>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

export type StorageMigrationDependencies = {
  sync: StorageAreaAdapter;
  local: StorageAreaAdapter;
  loadCurrentMedia: () => Promise<Blob | null>;
  loadLegacyMedia: () => Promise<Blob | null>;
  saveCurrentMedia: (blob: Blob) => Promise<void>;
};

function getFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function shouldMigrateSchemaVersion(version: unknown): boolean {
  if (version === STORAGE_SCHEMA_VERSION) {
    return false;
  }

  const isFutureVersion =
    typeof version === 'number' &&
    Number.isFinite(version) &&
    version > STORAGE_SCHEMA_VERSION;

  return !isFutureVersion;
}

function getSize(size: unknown, displaySize: unknown): number {
  const currentSize = getFiniteNumber(size) ?? getFiniteNumber(displaySize);
  return currentSize === null || currentSize === 20
    ? DEFAULT_SIZE
    : currentSize;
}

function getIconSize(iconSize: unknown): number {
  const currentSize = getFiniteNumber(iconSize);
  return currentSize === null || currentSize === 32
    ? DEFAULT_ICON_SIZE
    : currentSize;
}

function getLegacyBackground(value: unknown): BackgroundMedia | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(value);
  return {
    type: isVideo ? 'video' : 'image',
    source: 'url',
    url: value,
  };
}

export async function migrateStorage(
  dependencies: StorageMigrationDependencies,
): Promise<void> {
  const [currentVersion, currentDeviceVersion] = await Promise.all([
    dependencies.sync.get('storageSchemaVersion'),
    dependencies.local.get(DEVICE_STORAGE_SCHEMA_VERSION_KEY),
  ]);
  const shouldMigrateSync = shouldMigrateSchemaVersion(currentVersion);
  const shouldMigrateDevice = shouldMigrateSchemaVersion(currentDeviceVersion);

  if (!shouldMigrateSync && !shouldMigrateDevice) {
    return;
  }

  if (shouldMigrateSync) {
    const [
      gridSettings,
      colorTheme,
      size,
      displaySize,
      iconSize,
      settings,
      backgroundMeta,
      backgroundImage,
    ] = await Promise.all([
      dependencies.sync.get('gridSettings'),
      dependencies.sync.get('colorTheme'),
      dependencies.sync.get('size'),
      dependencies.sync.get('displaySize'),
      dependencies.sync.get('iconSize'),
      dependencies.sync.get('settings'),
      dependencies.sync.get('backgroundMeta'),
      dependencies.sync.get('backgroundImage'),
    ]);
    const updates: Record<string, unknown> = {
      gridSettings: normalizeGridSettings(gridSettings),
      colorTheme: normalizeTheme(colorTheme),
      size: getSize(size, displaySize),
      iconSize: getIconSize(iconSize),
      settings: normalizeSettings(settings),
    };
    const legacyBackground = getLegacyBackground(backgroundImage);

    if (backgroundMeta === undefined && legacyBackground) {
      updates.backgroundMeta = legacyBackground;
    }

    await dependencies.sync.set(updates);
  }

  if (shouldMigrateDevice) {
    const [syncBookmarks, localBookmarks, currentMedia] = await Promise.all([
      dependencies.sync.get('bookmarks'),
      dependencies.local.get('bookmarks'),
      dependencies.loadCurrentMedia(),
    ]);

    if (
      (localBookmarks === undefined || localBookmarks === null) &&
      syncBookmarks !== undefined &&
      syncBookmarks !== null
    ) {
      await dependencies.local.set({ bookmarks: syncBookmarks });
    }

    if (!currentMedia) {
      const legacyMedia = await dependencies.loadLegacyMedia();
      if (legacyMedia) {
        await dependencies.saveCurrentMedia(legacyMedia);
      }
    }

    await dependencies.local.set({
      [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION,
    });
  }

  if (shouldMigrateSync) {
    await dependencies.sync.set({
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    });
  }
}

export async function runStorageMigration(): Promise<void> {
  await migrateStorage({
    sync: storage.sync,
    local: storage.local,
    loadCurrentMedia: () => loadMediaBlob(MEDIA_KEY),
    loadLegacyMedia: () => loadLegacyMediaBlob(MEDIA_KEY),
    saveCurrentMedia: async (blob) => {
      await saveMedia(MEDIA_KEY, blob);
    },
  });
}
