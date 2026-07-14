import {
  DEFAULT_GRID_SETTINGS,
  DEFAULT_STARLIT_THEME,
  LEGACY_DEFAULT_GRID_SETTINGS,
  LEGACY_DEFAULT_THEME,
} from '../../newtab/defaultOptionValue';
import type { GridSettings, StarlitTheme } from '../../newtab/types';
import type { BackgroundMedia } from '../../settings/useBackgroundImage';
import { loadLegacyMediaBlob, loadMediaBlob, saveMedia } from './mediaStorage';
import storage from './storage';
import { STORAGE_SCHEMA_VERSION } from './schema';

export { STORAGE_SCHEMA_VERSION } from './schema';
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function migrateDefaultLeaves(
  current: unknown,
  legacyDefault: unknown,
  nextDefault: unknown,
): unknown {
  if (isRecord(nextDefault)) {
    const currentRecord = isRecord(current) ? current : {};
    const legacyRecord = isRecord(legacyDefault) ? legacyDefault : {};
    const result: Record<string, unknown> = { ...currentRecord };

    for (const [key, nextValue] of Object.entries(nextDefault)) {
      result[key] = migrateDefaultLeaves(
        currentRecord[key],
        legacyRecord[key],
        nextValue,
      );
    }

    return result;
  }

  if (current === undefined || current === null) {
    return nextDefault;
  }

  if (nextDefault !== undefined && typeof current !== typeof nextDefault) {
    return nextDefault;
  }

  return Object.is(current, legacyDefault) ? nextDefault : current;
}

export function normalizeGridSettings(value: unknown): GridSettings {
  return migrateDefaultLeaves(
    value,
    LEGACY_DEFAULT_GRID_SETTINGS,
    DEFAULT_GRID_SETTINGS,
  ) as GridSettings;
}

export function normalizeTheme(value: unknown): StarlitTheme {
  return migrateDefaultLeaves(
    value,
    LEGACY_DEFAULT_THEME,
    DEFAULT_STARLIT_THEME,
  ) as StarlitTheme;
}

function getFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getSize(size: unknown, displaySize: unknown): number {
  const currentSize = getFiniteNumber(size) ?? getFiniteNumber(displaySize);
  return currentSize === null || currentSize === 20 ? 16 : currentSize;
}

function getIconSize(iconSize: unknown): number {
  const currentSize = getFiniteNumber(iconSize);
  return currentSize === null || currentSize === 32 ? 28 : currentSize;
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
  const shouldMigrateSync = currentVersion !== STORAGE_SCHEMA_VERSION;
  const shouldMigrateDevice = currentDeviceVersion !== STORAGE_SCHEMA_VERSION;

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
      backgroundMeta,
      backgroundImage,
    ] = await Promise.all([
      dependencies.sync.get('gridSettings'),
      dependencies.sync.get('colorTheme'),
      dependencies.sync.get('size'),
      dependencies.sync.get('displaySize'),
      dependencies.sync.get('iconSize'),
      dependencies.sync.get('backgroundMeta'),
      dependencies.sync.get('backgroundImage'),
    ]);
    const updates: Record<string, unknown> = {
      gridSettings: normalizeGridSettings(gridSettings),
      colorTheme: normalizeTheme(colorTheme),
      size: getSize(size, displaySize),
      iconSize: getIconSize(iconSize),
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
