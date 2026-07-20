import type { GroupPreference } from '../bookmarks/types';
import type { Locale } from '../i18n/types';
import type { GridSettings } from '../layout/types';
import {
  deleteMedia,
  deleteMediaBatch,
  listMediaKeys,
  loadMediaBlob,
  saveMedia,
} from '../platform/storage/mediaStorage';
import storage from '../platform/storage/storage';
import {
  getOverlayImageLayers,
  getOverlayMediaKey,
  normalizeOverlayScene,
  OVERLAY_IMAGE_MEDIA_KEY_PREFIX,
  OVERLAY_MEDIA_MUTATION_LEASE_KEY_PREFIX,
  OVERLAY_SCENE_STORAGE_KEY,
} from '../overlays/model';
import type { OverlayScene } from '../overlays/types';
import { withOverlayMediaMutationLock } from '../overlays/mediaMutationLock';
import type { StarlitTheme } from '../theme/types';
import {
  BACKUP_SCHEMA_VERSION,
  dataUrlToBlob,
  isBookmarkTreePreferences,
  isFiniteNumber,
  isFaviconMap,
  isGroupPreferences,
  isLocale,
  parseExportData,
  validateOverlayMedia,
  type BookmarkTreePreferences,
  type ExportData,
  type ImportData,
} from './backupSchema';
import type { BackgroundMedia } from './backgroundMedia';
import { DEFAULT_ICON_SIZE, DEFAULT_SIZE } from './defaults';
import type { Settings } from './types';

export { BACKUP_SCHEMA_VERSION } from './backupSchema';
export type {
  BookmarkTreePreferences,
  ExportData,
  ImportData,
  LegacyExportData,
  V2ExportData,
} from './backupSchema';

const MEDIA_KEY = 'backgroundMedia';
const DEFAULT_LOCALE: Locale = 'ko';
const SYNC_SNAPSHOT_KEYS = [
  'gridSettings',
  'settings',
  'colorTheme',
  'size',
  'iconSize',
  'locale',
  'groupPreferences',
  'bookmarkTreePrefs',
  'customCSS',
  'backgroundMeta',
] as const;
const LOCAL_SNAPSHOT_KEYS = ['favicons', OVERLAY_SCENE_STORAGE_KEY] as const;

function createOverlayMutationLeaseKey(): string {
  const nonce = Math.random().toString(36).slice(2);
  return `${OVERLAY_MEDIA_MUTATION_LEASE_KEY_PREFIX}${Date.now().toString(36)}-${nonce}`;
}

type StorageAreaAdapter = {
  get: (key: string) => Promise<unknown>;
  remove: (keys: string | string[]) => Promise<void>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

type ImportSnapshot = {
  local: Record<string, unknown>;
  media: Blob | null | undefined;
  overlayMedia: Record<string, Blob> | undefined;
  sync: Record<string, unknown>;
};

function shouldApplyBackground(data: ImportData): boolean {
  if (data.backgroundMeta === undefined) {
    return false;
  }

  return (
    data.backgroundMeta === null ||
    data.backgroundMeta.source === 'url' ||
    data.backgroundData !== undefined
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (): void => {
      if (typeof reader.result !== 'string') {
        reject(new Error('blob 읽기 결과가 문자열이 아닙니다.'));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = (): void => reject(new Error('blob 읽기 실패'));
    reader.readAsDataURL(blob);
  });
}

function getStoredNumber(value: unknown, fallback: number): number {
  return isFiniteNumber(value) ? value : fallback;
}

function getStoredLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

function getStoredGroupPreferences(value: unknown): GroupPreference[] {
  return isGroupPreferences(value) ? value : [];
}

function getStoredBookmarkTreePreferences(
  value: unknown,
): BookmarkTreePreferences {
  return isBookmarkTreePreferences(value)
    ? value
    : { rootPath: [], siblingOrder: {} };
}

function getStoredFavicons(value: unknown): Record<string, string> {
  return isFaviconMap(value) ? value : {};
}

async function snapshotStorageArea(
  area: StorageAreaAdapter,
  keys: readonly string[],
): Promise<Record<string, unknown>> {
  const values = await Promise.all(keys.map((key) => area.get(key)));

  return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
}

async function snapshotOverlayMedia(): Promise<Record<string, Blob>> {
  const keys = await listMediaKeys(OVERLAY_IMAGE_MEDIA_KEY_PREFIX);
  const blobs = await Promise.all(keys.map((key) => loadMediaBlob(key)));

  return Object.fromEntries(
    keys.flatMap((key, index) => {
      const blob = blobs[index];
      return blob ? [[key, blob] as const] : [];
    }),
  );
}

async function createImportSnapshot(
  shouldSnapshotMedia: boolean,
  shouldSnapshotOverlays: boolean,
): Promise<ImportSnapshot> {
  const [syncSnapshot, localSnapshot, mediaSnapshot, overlayMediaSnapshot] =
    await Promise.all([
      snapshotStorageArea(storage.sync, SYNC_SNAPSHOT_KEYS),
      snapshotStorageArea(storage.local, LOCAL_SNAPSHOT_KEYS),
      shouldSnapshotMedia
        ? loadMediaBlob(MEDIA_KEY)
        : Promise.resolve(undefined),
      shouldSnapshotOverlays
        ? snapshotOverlayMedia()
        : Promise.resolve(undefined),
    ]);

  return {
    local: localSnapshot,
    media: mediaSnapshot,
    overlayMedia: overlayMediaSnapshot,
    sync: syncSnapshot,
  };
}

async function restoreStorageArea(
  area: StorageAreaAdapter,
  snapshot: Record<string, unknown>,
): Promise<void> {
  const entries = Object.entries(snapshot);
  const existingEntries = entries.filter(([, value]) => value !== undefined);
  const missingKeys = entries
    .filter(([, value]) => value === undefined)
    .map(([key]) => key);

  if (existingEntries.length > 0) {
    await area.set(Object.fromEntries(existingEntries));
  }

  if (missingKeys.length > 0) {
    await area.remove(missingKeys);
  }
}

async function restoreMedia(media: Blob | null | undefined): Promise<void> {
  if (media === undefined) {
    return;
  }

  if (media) {
    await saveMedia(MEDIA_KEY, media);
    return;
  }

  await deleteMedia(MEDIA_KEY);
}

async function restoreLocalOverlaySnapshot(
  local: Record<string, unknown>,
  media: Record<string, Blob> | undefined,
): Promise<void> {
  if (media === undefined) {
    await restoreStorageArea(storage.local, local);
    return;
  }

  for (const [key, blob] of Object.entries(media)) {
    await saveMedia(key, blob);
  }

  await restoreStorageArea(storage.local, local);
  const restoredMediaKeys = new Set(Object.keys(media));
  const currentMediaKeys = await listMediaKeys(OVERLAY_IMAGE_MEDIA_KEY_PREFIX);
  await deleteMediaBatch(
    currentMediaKeys.filter((key) => !restoredMediaKeys.has(key)),
  );
}

async function restoreImportSnapshot(snapshot: ImportSnapshot): Promise<void> {
  const results = await Promise.allSettled([
    restoreStorageArea(storage.sync, snapshot.sync),
    restoreLocalOverlaySnapshot(snapshot.local, snapshot.overlayMedia),
    restoreMedia(snapshot.media),
  ]);
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );

  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((failure) => failure.reason),
      '가져오기 rollback에 실패했습니다.',
    );
  }
}

async function applyImport(data: ImportData): Promise<void> {
  const syncUpdates: Record<string, unknown> = {
    colorTheme: data.colorTheme,
    gridSettings: data.gridSettings,
    settings: data.settings,
  };
  const isBackgroundApplicable = shouldApplyBackground(data);

  if (data.schemaVersion !== undefined) {
    syncUpdates.size = data.size;
    syncUpdates.iconSize = data.iconSize;
    syncUpdates.locale = data.locale;
    syncUpdates.groupPreferences = data.groupPreferences;
    syncUpdates.bookmarkTreePrefs = data.bookmarkTreePrefs;
  }

  if (data.customCSS !== undefined) {
    syncUpdates.customCSS = data.customCSS;
  }

  if (isBackgroundApplicable) {
    syncUpdates.backgroundMeta = data.backgroundMeta;
  }

  if (data.schemaVersion === BACKUP_SCHEMA_VERSION) {
    const imageLayers = getOverlayImageLayers(data.overlayScene);
    const previousMediaKeys = await listMediaKeys(
      OVERLAY_IMAGE_MEDIA_KEY_PREFIX,
    );
    const occupiedMediaKeys = new Set(previousMediaKeys);
    const importedImageIds = new Map<string, string>();

    imageLayers.forEach((image) => {
      let importedId = crypto.randomUUID();
      while (occupiedMediaKeys.has(getOverlayMediaKey(importedId))) {
        importedId = crypto.randomUUID();
      }
      occupiedMediaKeys.add(getOverlayMediaKey(importedId));
      importedImageIds.set(image.id, importedId);
    });

    for (const image of imageLayers) {
      const mediaData = data.overlayMedia[image.id];
      if (!mediaData) {
        throw new Error(`overlay media가 누락되었습니다: ${image.id}`);
      }

      const importedId = importedImageIds.get(image.id);
      if (!importedId) {
        throw new Error(`overlay id 생성에 실패했습니다: ${image.id}`);
      }

      await saveMedia(getOverlayMediaKey(importedId), dataUrlToBlob(mediaData));
    }

    const importedScene: OverlayScene = {
      layers: data.overlayScene.layers.map((layer) => {
        if (layer.kind !== 'image') {
          return layer;
        }

        const importedId = importedImageIds.get(layer.id);
        if (!importedId) {
          throw new Error(`overlay id 생성에 실패했습니다: ${layer.id}`);
        }

        return { ...layer, id: importedId };
      }),
    };
    await storage.local.set({
      [OVERLAY_SCENE_STORAGE_KEY]: importedScene,
    });
    await deleteMediaBatch(previousMediaKeys);
  }

  await storage.sync.set(syncUpdates);

  if (isBackgroundApplicable) {
    if (
      data.backgroundMeta?.source === 'file' &&
      data.backgroundData !== undefined
    ) {
      await saveMedia(MEDIA_KEY, dataUrlToBlob(data.backgroundData));
    } else {
      await deleteMedia(MEDIA_KEY);
    }
  }

  if (data.favicons !== undefined) {
    const existing = getStoredFavicons(await storage.local.get('favicons'));
    await storage.local.set({
      favicons: { ...existing, ...data.favicons },
    });
  }
}

export function exportToJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function importFromJson(file: File): Promise<ImportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (): void => {
      if (typeof reader.result !== 'string') {
        reject(new Error('파일 읽기 결과가 문자열이 아닙니다.'));
        return;
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(reader.result);
      } catch {
        reject(new Error('잘못된 JSON 파일입니다.'));
        return;
      }

      try {
        resolve(parseExportData(parsed));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (): void => reject(new Error('파일 읽기 실패'));
    reader.readAsText(file);
  });
}

async function createFullExport(
  gridSettings: GridSettings,
  settings: Settings,
  colorTheme: StarlitTheme,
  backgroundMeta: BackgroundMedia | null | undefined,
  customCSS?: string,
): Promise<ExportData> {
  const [
    storedSize,
    storedIconSize,
    storedLocale,
    storedGroups,
    storedTree,
    storedFavicons,
    storedOverlayScene,
  ] = await Promise.all([
    storage.sync.get('size'),
    storage.sync.get('iconSize'),
    storage.sync.get('locale'),
    storage.sync.get('groupPreferences'),
    storage.sync.get('bookmarkTreePrefs'),
    storage.local.get('favicons'),
    storage.local.get(OVERLAY_SCENE_STORAGE_KEY),
  ]);
  const favicons = getStoredFavicons(storedFavicons);
  const overlayScene = normalizeOverlayScene(storedOverlayScene);
  const overlayMediaEntries: Array<readonly [string, string]> = [];

  for (const image of getOverlayImageLayers(overlayScene)) {
    const blob = await loadMediaBlob(getOverlayMediaKey(image.id));
    if (!blob) {
      throw new Error(`overlay image file이 없습니다: ${image.name}`);
    }

    overlayMediaEntries.push([image.id, await blobToDataUrl(blob)]);
  }
  const overlayMedia = Object.fromEntries(overlayMediaEntries);

  const data: ExportData = {
    backgroundMeta: backgroundMeta ?? null,
    bookmarkTreePrefs: getStoredBookmarkTreePreferences(storedTree),
    colorTheme,
    gridSettings,
    groupPreferences: getStoredGroupPreferences(storedGroups),
    iconSize: getStoredNumber(storedIconSize, DEFAULT_ICON_SIZE),
    locale: getStoredLocale(storedLocale),
    overlayMedia,
    overlayScene,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    settings,
    size: getStoredNumber(storedSize, DEFAULT_SIZE),
  };

  if (customCSS !== undefined) {
    data.customCSS = customCSS;
  }

  if (backgroundMeta?.source === 'file') {
    const blob = await loadMediaBlob(MEDIA_KEY);

    if (blob) {
      data.backgroundData = await blobToDataUrl(blob);
    }
  }

  if (Object.keys(favicons).length > 0) {
    data.favicons = favicons;
  }

  return data;
}

export function exportFull(
  gridSettings: GridSettings,
  settings: Settings,
  colorTheme: StarlitTheme,
  backgroundMeta: BackgroundMedia | null | undefined,
  customCSS?: string,
): Promise<ExportData> {
  return withOverlayMediaMutationLock(() =>
    createFullExport(
      gridSettings,
      settings,
      colorTheme,
      backgroundMeta,
      customCSS,
    ),
  );
}

async function applyImportWithRollback(data: ImportData): Promise<void> {
  const snapshot = await createImportSnapshot(
    shouldApplyBackground(data),
    data.schemaVersion === BACKUP_SCHEMA_VERSION,
  );

  try {
    await applyImport(data);
  } catch (error) {
    try {
      await restoreImportSnapshot(snapshot);
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        '가져오기와 rollback에 모두 실패했습니다.',
        { cause: rollbackError },
      );
    }

    throw error;
  }
}

export async function importFull(data: ImportData): Promise<void> {
  const validatedData = parseExportData(data);
  if (validatedData.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    await applyImportWithRollback(validatedData);
    return;
  }

  await validateOverlayMedia(validatedData);

  await withOverlayMediaMutationLock(async (): Promise<void> => {
    const mutationLeaseKey = createOverlayMutationLeaseKey();
    await storage.local.set({
      [mutationLeaseKey]: { updatedAt: Date.now() },
    });

    let importFailure: unknown;
    let hasImportFailed = false;
    try {
      await applyImportWithRollback(validatedData);
    } catch (error) {
      hasImportFailed = true;
      importFailure = error;
    }

    try {
      await storage.local.remove(mutationLeaseKey);
    } catch (cleanupError) {
      if (hasImportFailed) {
        throw new AggregateError(
          [importFailure, cleanupError],
          '가져오기 실패 후 media mutation lease 정리에도 실패했습니다.',
          { cause: cleanupError },
        );
      }

      if (typeof globalThis.reportError === 'function') {
        globalThis.reportError(cleanupError);
      }
    }

    if (hasImportFailed) {
      throw importFailure;
    }
  });
}
