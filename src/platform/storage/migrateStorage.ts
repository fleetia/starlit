import {
  decodeGridSettings,
  normalizeGridSettings,
} from '../../layout/normalizeGridSettings';
import { withExclusiveLock } from '../locks/exclusiveLock';
import { DEFAULT_OVERLAY_SCENE } from '../../overlays/model';
import type { BackgroundMedia } from '../../settings/backgroundMedia';
import { DEFAULT_ICON_SIZE, DEFAULT_SIZE } from '../../settings/defaults';
import { normalizeSettings } from '../../settings/normalizeSettings';
import { decodeTheme, normalizeTheme } from '../../theme/normalizeTheme';
import {
  loadLegacyMediaBlob,
  loadMediaBlob,
  saveMediaBlob,
} from './mediaStorage';
import storage from './storage';
import { STORAGE_SCHEMA_VERSION } from './schema';

export { STORAGE_SCHEMA_VERSION } from './schema';
export { normalizeGridSettings } from '../../layout/normalizeGridSettings';
export { normalizeTheme } from '../../theme/normalizeTheme';
const MEDIA_KEY = 'backgroundMedia';
export const DEVICE_STORAGE_SCHEMA_VERSION_KEY = 'deviceStorageSchemaVersion';
export const LEGACY_SCENE_SETTINGS_SNAPSHOT_KEY = 'legacySceneSettingsV1';
export const LEGACY_SCENE_SCHEMA_VERSION_KEY = 'legacySceneSchemaVersionV1';
export const LEGACY_SYNC_HYDRATION_STATE_KEY = 'legacySyncHydrationStateV1';
export const STORAGE_MIGRATION_LOCK_NAME = 'starlit-storage-migration';
export const DISMISSED_LEGACY_SYNC_HYDRATION_STATE = {
  schemaVersion: 1,
  status: 'dismissed',
} as const;

type StorageAreaAdapter = {
  get: (key: string) => Promise<unknown>;
  remove: (keys: string | string[]) => Promise<void>;
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

function isFutureSchemaVersion(version: unknown): boolean {
  return (
    typeof version === 'number' &&
    Number.isFinite(version) &&
    version > STORAGE_SCHEMA_VERSION
  );
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

export const LEGACY_SYNC_SCENE_KEYS = [
  'backgroundImage',
  'backgroundMeta',
  'bookmarkTreePrefs',
  'bookmarks',
  'colorTheme',
  'customCSS',
  'displaySize',
  'gridSettings',
  'groupPreferences',
  'iconSize',
  'overlayScene',
  'size',
] as const;

export const LEGACY_SYNC_HYDRATION_KEYS = [
  ...LEGACY_SYNC_SCENE_KEYS,
  'settings',
  LEGACY_SCENE_SETTINGS_SNAPSHOT_KEY,
  LEGACY_SCENE_SCHEMA_VERSION_KEY,
] as const;

const HYDRATION_PROFILE_KEYS = [
  'backgroundImage',
  'backgroundMeta',
  'bookmarkTreePrefs',
  'colorTheme',
  'customCSS',
  'displaySize',
  'gridSettings',
  'groupPreferences',
  'iconSize',
  'overlayScene',
  'size',
  'settings',
  'expandedGroupsState',
  'activeSceneId',
  'sceneIndex',
] as const;

type WatchingLegacySyncHydrationState = {
  baseline: Record<string, unknown>;
  protectedKeys: string[];
  schemaVersion: 1;
  status: 'watching';
};

type LegacySyncHydrationState =
  | WatchingLegacySyncHydrationState
  | typeof DISMISSED_LEGACY_SYNC_HYDRATION_STATE;

const OPTIONAL_LOCAL_SCENE_KEYS = [
  'bookmarkTreePrefs',
  'bookmarks',
  'customCSS',
  'groupPreferences',
  'overlayScene',
] as const;

function hasSceneSettings(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.keys(value).some((key) => key !== 'isOpenInNewTab')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLegacySyncHydrationState(
  value: unknown,
): LegacySyncHydrationState | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;
  if (value.status === 'dismissed') {
    return DISMISSED_LEGACY_SYNC_HYDRATION_STATE;
  }
  if (
    value.status !== 'watching' ||
    !isRecord(value.baseline) ||
    !Array.isArray(value.protectedKeys) ||
    !value.protectedKeys.every((key) => typeof key === 'string')
  ) {
    return null;
  }
  return {
    baseline: value.baseline,
    protectedKeys: value.protectedKeys,
    schemaVersion: 1,
    status: 'watching',
  };
}

function areStorageValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => areStorageValuesEqual(value, right[index]))
    );
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.hasOwn(right, key) &&
        areStorageValuesEqual(left[key], right[key]),
    )
  );
}

function isHydrationProfileUnchanged(
  localValues: Record<string, unknown>,
  state: WatchingLegacySyncHydrationState,
): boolean {
  return HYDRATION_PROFILE_KEYS.every((key) => {
    const hasBaselineValue = Object.hasOwn(state.baseline, key);
    const currentValue = localValues[key];
    if (!hasBaselineValue && currentValue === undefined) return true;
    if (
      key === 'overlayScene' &&
      !hasBaselineValue &&
      areStorageValuesEqual(currentValue, DEFAULT_OVERLAY_SCENE)
    ) {
      return true;
    }
    return (
      hasBaselineValue &&
      areStorageValuesEqual(currentValue, state.baseline[key])
    );
  });
}

function createHydrationBaseline(
  values: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    HYDRATION_PROFILE_KEYS.flatMap((key) =>
      values[key] === undefined ? [] : [[key, values[key]]],
    ),
  );
}

function createProtectedHydrationKeys(
  values: Record<string, unknown>,
): string[] {
  const protectedKeys = new Set(
    HYDRATION_PROFILE_KEYS.filter((key) => values[key] !== undefined),
  );
  if (values.backgroundImage !== undefined) {
    protectedKeys.add('backgroundMeta');
  }
  if (values.displaySize !== undefined) protectedKeys.add('size');
  return [...protectedKeys];
}

function hasLegacySyncSceneSource(
  syncValues: Record<string, unknown>,
): boolean {
  return (
    LEGACY_SYNC_SCENE_KEYS.some((key) => syncValues[key] !== undefined) ||
    syncValues[LEGACY_SCENE_SETTINGS_SNAPSHOT_KEY] !== undefined ||
    hasSceneSettings(syncValues.settings)
  );
}

export function hasLegacySyncHydrationChange(
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string,
): boolean {
  return (
    areaName === 'sync' &&
    LEGACY_SYNC_HYDRATION_KEYS.some(
      (key) =>
        Object.hasOwn(changes, key) && changes[key]?.newValue !== undefined,
    )
  );
}

function getGlobalSettings(value: unknown): { isOpenInNewTab: boolean } {
  return { isOpenInNewTab: normalizeSettings(value).isOpenInNewTab };
}

function getLocalFirst(
  localValues: Record<string, unknown>,
  syncValues: Record<string, unknown>,
  key: string,
): unknown {
  return localValues[key] === undefined ? syncValues[key] : localValues[key];
}

async function readStorageValues(
  area: StorageAreaAdapter,
  keys: readonly string[],
): Promise<Record<string, unknown>> {
  const values = await Promise.all(keys.map((key) => area.get(key)));
  return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
}

export async function migrateStorage(
  dependencies: StorageMigrationDependencies,
): Promise<void> {
  const [currentVersion, currentDeviceVersion, rawHydrationState] =
    await Promise.all([
      dependencies.sync.get('storageSchemaVersion'),
      dependencies.local.get(DEVICE_STORAGE_SCHEMA_VERSION_KEY),
      dependencies.local.get(LEGACY_SYNC_HYDRATION_STATE_KEY),
    ]);
  const shouldMigrateSync = shouldMigrateSchemaVersion(currentVersion);
  const canUpdateSync = !isFutureSchemaVersion(currentVersion);
  const canUpdateDevice = !isFutureSchemaVersion(currentDeviceVersion);

  if (!canUpdateSync && !canUpdateDevice) {
    return;
  }

  const storageKeys = [
    ...LEGACY_SYNC_SCENE_KEYS,
    ...HYDRATION_PROFILE_KEYS,
    LEGACY_SCENE_SETTINGS_SNAPSHOT_KEY,
    LEGACY_SCENE_SCHEMA_VERSION_KEY,
  ] as const;
  const [syncValues, localValues] = await Promise.all([
    readStorageValues(dependencies.sync, storageKeys),
    readStorageValues(dependencies.local, storageKeys),
  ]);
  const hasNormalizedSyncedPreferences =
    currentVersion === 2 || syncValues[LEGACY_SCENE_SCHEMA_VERSION_KEY] === 2;
  const syncSceneSettings =
    syncValues[LEGACY_SCENE_SETTINGS_SNAPSHOT_KEY] ?? syncValues.settings;
  const migrationSyncValues: Record<string, unknown> = {
    ...syncValues,
    settings: syncSceneSettings,
  };
  const hydrationState = parseLegacySyncHydrationState(rawHydrationState);
  const hasLegacySource = hasLegacySyncSceneSource(syncValues);
  const canAttemptLateHydration =
    canUpdateDevice &&
    currentDeviceVersion === STORAGE_SCHEMA_VERSION &&
    hydrationState?.status === 'watching' &&
    hasLegacySource;
  const isLateHydrationMigration =
    canAttemptLateHydration &&
    isHydrationProfileUnchanged(localValues, hydrationState);
  if (canAttemptLateHydration && !isLateHydrationMigration) {
    await dependencies.local.set({
      [LEGACY_SYNC_HYDRATION_STATE_KEY]: DISMISSED_LEGACY_SYNC_HYDRATION_STATE,
    });
  }
  const shouldMigrateDevice =
    hydrationState?.status !== 'dismissed' &&
    (shouldMigrateSchemaVersion(currentDeviceVersion) ||
      isLateHydrationMigration);
  const protectedKeys = new Set(
    hydrationState?.status === 'watching'
      ? hydrationState.protectedKeys
      : createProtectedHydrationKeys(localValues),
  );
  if (localValues.bookmarks !== undefined) protectedKeys.add('bookmarks');
  const localUpdates: Record<string, unknown> = {};

  function getMigrationValue(key: string): unknown {
    if (
      isLateHydrationMigration &&
      !protectedKeys.has(key) &&
      migrationSyncValues[key] !== undefined
    ) {
      return migrationSyncValues[key];
    }
    return getLocalFirst(localValues, migrationSyncValues, key);
  }

  if (shouldMigrateDevice) {
    const gridSettings = getMigrationValue('gridSettings');
    const colorTheme = getMigrationValue('colorTheme');
    const size = getMigrationValue('size');
    const displaySize = getMigrationValue('displaySize');
    const iconSize = getMigrationValue('iconSize');
    const settings = getMigrationValue('settings');

    if (shouldMigrateDevice || localValues.gridSettings === undefined) {
      localUpdates.gridSettings = hasNormalizedSyncedPreferences
        ? decodeGridSettings(gridSettings)
        : normalizeGridSettings(gridSettings);
    }
    if (shouldMigrateDevice || localValues.colorTheme === undefined) {
      localUpdates.colorTheme = hasNormalizedSyncedPreferences
        ? decodeTheme(colorTheme)
        : normalizeTheme(colorTheme);
    }
    if (shouldMigrateDevice || localValues.size === undefined) {
      localUpdates.size = hasNormalizedSyncedPreferences
        ? (getFiniteNumber(size) ??
          getFiniteNumber(displaySize) ??
          DEFAULT_SIZE)
        : getSize(size, displaySize);
    }
    if (shouldMigrateDevice || localValues.iconSize === undefined) {
      localUpdates.iconSize = hasNormalizedSyncedPreferences
        ? (getFiniteNumber(iconSize) ?? DEFAULT_ICON_SIZE)
        : getIconSize(iconSize);
    }
    if (shouldMigrateDevice || localValues.settings === undefined) {
      localUpdates.settings = normalizeSettings(settings);
    }

    for (const key of OPTIONAL_LOCAL_SCENE_KEYS) {
      if (
        migrationSyncValues[key] !== undefined &&
        (localValues[key] === undefined ||
          (isLateHydrationMigration && !protectedKeys.has(key)))
      ) {
        localUpdates[key] = migrationSyncValues[key];
      }
    }

    const backgroundMeta = getMigrationValue('backgroundMeta');
    const backgroundImage = getMigrationValue('backgroundImage');
    const legacyBackground = getLegacyBackground(backgroundImage);
    if (
      localValues.backgroundMeta === undefined ||
      (isLateHydrationMigration && !protectedKeys.has('backgroundMeta'))
    ) {
      if (backgroundMeta !== undefined) {
        localUpdates.backgroundMeta = backgroundMeta;
      } else if (legacyBackground) {
        localUpdates.backgroundMeta = legacyBackground;
      }
    }

    if (Object.keys(localUpdates).length > 0) {
      await dependencies.local.set(localUpdates);
    }

    const currentMedia = await dependencies.loadCurrentMedia();
    if (!currentMedia) {
      const legacyMedia = await dependencies.loadLegacyMedia();
      if (legacyMedia) {
        await dependencies.saveCurrentMedia(legacyMedia);
      }
    }

    const nextHydrationState: WatchingLegacySyncHydrationState = {
      baseline: createHydrationBaseline({
        ...localValues,
        ...localUpdates,
      }),
      protectedKeys: [...protectedKeys],
      schemaVersion: 1,
      status: 'watching',
    };
    await dependencies.local.set({
      [LEGACY_SYNC_HYDRATION_STATE_KEY]: nextHydrationState,
    });
  }

  if (canUpdateSync) {
    const syncedSettings = syncValues.settings;
    if (
      syncValues[LEGACY_SCENE_SETTINGS_SNAPSHOT_KEY] === undefined &&
      hasSceneSettings(syncedSettings)
    ) {
      await dependencies.sync.set({
        [LEGACY_SCENE_SETTINGS_SNAPSHOT_KEY]: syncedSettings,
      });
    }
    if (
      syncedSettings !== undefined &&
      (shouldMigrateSync || hasSceneSettings(syncedSettings))
    ) {
      await dependencies.sync.set({
        settings: getGlobalSettings(syncedSettings),
      });
    }
  }

  if (shouldMigrateSync && canUpdateSync) {
    if (currentVersion === 2) {
      await dependencies.sync.set({ [LEGACY_SCENE_SCHEMA_VERSION_KEY]: 2 });
    }
    await dependencies.sync.set({
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    });
  }

  if (shouldMigrateDevice) {
    await dependencies.local.set({
      [DEVICE_STORAGE_SCHEMA_VERSION_KEY]: STORAGE_SCHEMA_VERSION,
    });
  }
}

export async function runStorageMigration(): Promise<void> {
  await withExclusiveLock(STORAGE_MIGRATION_LOCK_NAME, () =>
    migrateStorage({
      sync: storage.sync,
      local: storage.local,
      loadCurrentMedia: () => loadMediaBlob(MEDIA_KEY),
      loadLegacyMedia: () => loadLegacyMediaBlob(MEDIA_KEY),
      saveCurrentMedia: (blob) => saveMediaBlob(MEDIA_KEY, blob),
    }),
  );
}
