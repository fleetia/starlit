import type { Locale } from '../i18n/types';
import type {
  GridSettings,
  GroupPreference,
  PersistedSettings,
  Placement,
  Settings,
  StarlitTheme,
} from '../newtab/types';
import {
  normalizeGridSettings,
  normalizeTheme,
} from '../platform/storage/migrateStorage';
import {
  deleteMedia,
  loadMediaBlob,
  saveMedia,
} from '../platform/storage/mediaStorage';
import storage from '../platform/storage/storage';
import { isFontFamily, normalizeSettings } from './normalizeSettings';

export const BACKUP_SCHEMA_VERSION = 2;

const MEDIA_KEY = 'backgroundMedia';
const DEFAULT_SIZE = 16;
const DEFAULT_ICON_SIZE = 28;
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
const LOCAL_SNAPSHOT_KEYS = ['favicons'] as const;

export type BookmarkTreePreferences = {
  rootId?: string;
  rootPath: string[];
  siblingOrder: Record<string, string[]>;
};

type BackgroundMedia = {
  source: 'file' | 'url';
  type: 'image' | 'video';
  url: string;
};

type OptionalBackupData = {
  backgroundData?: string;
  backgroundMeta?: BackgroundMedia | null;
  customCSS?: string;
  favicons?: Record<string, string>;
};

type BackupCoreData = {
  colorTheme: StarlitTheme;
  gridSettings: GridSettings;
  settings: Settings;
};

type ValidCommonData = Record<string, unknown> & BackupCoreData;

export type LegacyExportData = BackupCoreData &
  OptionalBackupData & {
    schemaVersion?: undefined;
  };

export type ExportData = BackupCoreData &
  OptionalBackupData & {
    backgroundMeta: BackgroundMedia | null;
    bookmarkTreePrefs: BookmarkTreePreferences;
    groupPreferences: GroupPreference[];
    iconSize: number;
    locale: Locale;
    schemaVersion: typeof BACKUP_SCHEMA_VERSION;
    size: number;
  };

export type ImportData = ExportData | LegacyExportData;

type StorageAreaAdapter = {
  get: (key: string) => Promise<unknown>;
  remove: (keys: string | string[]) => Promise<void>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

type ImportSnapshot = {
  local: Record<string, unknown>;
  media: Blob | null | undefined;
  sync: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionalFiniteNumber(
  record: Record<string, unknown>,
  key: string,
): boolean {
  return record[key] === undefined || isFiniteNumber(record[key]);
}

function isOptionalString(
  record: Record<string, unknown>,
  key: string,
): boolean {
  return record[key] === undefined || typeof record[key] === 'string';
}

function isPlacement(value: unknown): value is Placement {
  return (
    value === 'top-left' ||
    value === 'top-center' ||
    value === 'top-right' ||
    value === 'center-left' ||
    value === 'center-center' ||
    value === 'center-right' ||
    value === 'bottom-left' ||
    value === 'bottom-center' ||
    value === 'bottom-right'
  );
}

function isMargin(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.top) &&
    isFiniteNumber(value.bottom) &&
    isFiniteNumber(value.left) &&
    isFiniteNumber(value.right)
  );
}

function isGridBackground(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.color === 'string' &&
    typeof value.border === 'string' &&
    typeof value.text === 'string' &&
    isOptionalString(value, 'gridImage')
  );
}

function isGridIcon(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.color === 'string' &&
    typeof value.border === 'string' &&
    typeof value.text === 'string' &&
    isOptionalFiniteNumber(value, 'borderRadius') &&
    isOptionalFiniteNumber(value, 'iconRadius') &&
    isOptionalFiniteNumber(value, 'width') &&
    isOptionalFiniteNumber(value, 'height')
  );
}

function isGridHeading(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return (
    isRecord(value) &&
    typeof value.titleColor === 'string' &&
    isOptionalString(value, 'titleBackgroundColor') &&
    isOptionalFiniteNumber(value, 'titleSize') &&
    typeof value.subtitleColor === 'string' &&
    isOptionalFiniteNumber(value, 'subtitleSize') &&
    typeof value.borderEnabled === 'boolean' &&
    isFiniteNumber(value.borderWidth) &&
    typeof value.borderColor === 'string' &&
    typeof value.subtitleHoverColor === 'string' &&
    isOptionalFiniteNumber(value, 'borderRadius')
  );
}

function isGridFolder(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return (
    isRecord(value) &&
    typeof value.color === 'string' &&
    typeof value.accent === 'string' &&
    typeof value.accentText === 'string' &&
    typeof value.text === 'string' &&
    typeof value.border === 'string'
  );
}

function isGridSettings(value: unknown): value is GridSettings {
  return (
    isRecord(value) &&
    isFiniteNumber(value.columns) &&
    isOptionalFiniteNumber(value, 'horizontalColumns') &&
    isFiniteNumber(value.rows) &&
    typeof value.gap === 'string' &&
    isOptionalString(value, 'cardGap') &&
    isOptionalFiniteNumber(value, 'masonryColumns') &&
    isPlacement(value.position) &&
    (value.margin === undefined || isMargin(value.margin)) &&
    isGridBackground(value.background) &&
    isGridIcon(value.icon) &&
    isGridHeading(value.heading) &&
    isGridFolder(value.folder)
  );
}

function isSettings(value: unknown): value is PersistedSettings {
  return (
    isRecord(value) &&
    typeof value.isFolderEnabled === 'boolean' &&
    typeof value.isVisibleOnce === 'boolean' &&
    typeof value.isOpenInNewTab === 'boolean' &&
    typeof value.isExpandView === 'boolean' &&
    (value.fontFamily === undefined || isFontFamily(value.fontFamily)) &&
    (value.iconLayout === undefined ||
      value.iconLayout === 'vertical' ||
      value.iconLayout === 'horizontal')
  );
}

function isStarlitTheme(value: unknown): value is StarlitTheme {
  if (!isRecord(value)) {
    return false;
  }

  const keys: readonly (keyof StarlitTheme)[] = [
    'accent',
    'accentText',
    'surface',
    'text',
    'border',
    'hoverBg',
    'hoverText',
    'muted',
  ];

  return keys.every((key) => typeof value[key] === 'string');
}

function isBackgroundMedia(value: unknown): value is BackgroundMedia {
  return (
    isRecord(value) &&
    (value.type === 'image' || value.type === 'video') &&
    (value.source === 'url' || value.source === 'file') &&
    typeof value.url === 'string'
  );
}

function isBackgroundMeta(value: unknown): value is BackgroundMedia | null {
  return value === null || isBackgroundMedia(value);
}

function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'ko' || value === 'ja';
}

function isGroupPreferences(value: unknown): value is GroupPreference[] {
  return (
    Array.isArray(value) &&
    value.every(
      (preference) =>
        isRecord(preference) &&
        typeof preference.key === 'string' &&
        typeof preference.visible === 'boolean',
    )
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isBookmarkTreePreferences(
  value: unknown,
): value is BookmarkTreePreferences {
  return (
    isRecord(value) &&
    (value.rootId === undefined || typeof value.rootId === 'string') &&
    isStringArray(value.rootPath) &&
    isRecord(value.siblingOrder) &&
    Object.values(value.siblingOrder).every(isStringArray)
  );
}

function isFaviconMap(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((favicon) => typeof favicon === 'string')
  );
}

function validateCommonFields(
  data: Record<string, unknown>,
): asserts data is ValidCommonData {
  if (!isGridSettings(data.gridSettings)) {
    throw new Error('잘못된 형식: gridSettings가 올바르지 않습니다.');
  }

  if (!isSettings(data.settings)) {
    throw new Error('잘못된 형식: settings가 올바르지 않습니다.');
  }

  if (!isStarlitTheme(data.colorTheme)) {
    throw new Error('잘못된 형식: colorTheme이 올바르지 않습니다.');
  }

  if (data.customCSS !== undefined && typeof data.customCSS !== 'string') {
    throw new Error('잘못된 형식: customCSS가 문자열이 아닙니다.');
  }

  if (
    data.backgroundMeta !== undefined &&
    !isBackgroundMeta(data.backgroundMeta)
  ) {
    throw new Error('잘못된 형식: backgroundMeta가 올바르지 않습니다.');
  }

  if (
    data.backgroundData !== undefined &&
    typeof data.backgroundData !== 'string'
  ) {
    throw new Error('잘못된 형식: backgroundData가 문자열이 아닙니다.');
  }

  if (typeof data.backgroundData === 'string') {
    dataUrlToBlob(data.backgroundData);
  }

  if (data.backgroundData !== undefined) {
    if (
      !isBackgroundMedia(data.backgroundMeta) ||
      data.backgroundMeta.source !== 'file'
    ) {
      throw new Error(
        '잘못된 형식: backgroundData에는 file 배경 정보가 필요합니다.',
      );
    }
  }

  if (data.favicons !== undefined && !isFaviconMap(data.favicons)) {
    throw new Error('잘못된 형식: favicons가 올바르지 않습니다.');
  }
}

function getOptionalBackupData(
  data: Record<string, unknown>,
): OptionalBackupData {
  const optionalData: OptionalBackupData = {};

  if (typeof data.customCSS === 'string') {
    optionalData.customCSS = data.customCSS;
  }

  if (isBackgroundMeta(data.backgroundMeta)) {
    optionalData.backgroundMeta = data.backgroundMeta;
  }

  if (typeof data.backgroundData === 'string') {
    optionalData.backgroundData = data.backgroundData;
  }

  if (isFaviconMap(data.favicons)) {
    optionalData.favicons = data.favicons;
  }

  return optionalData;
}

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

function parseExportData(value: unknown): ImportData {
  if (!isRecord(value)) {
    throw new Error('잘못된 형식: 객체가 아닙니다.');
  }

  if (
    value.schemaVersion !== undefined &&
    value.schemaVersion !== BACKUP_SCHEMA_VERSION
  ) {
    throw new Error(
      `지원하지 않는 schemaVersion: ${String(value.schemaVersion)}`,
    );
  }

  validateCommonFields(value);

  const coreData: BackupCoreData = {
    colorTheme: value.colorTheme,
    gridSettings: value.gridSettings,
    settings: normalizeSettings(value.settings),
  };
  const optionalData = getOptionalBackupData(value);

  if (value.schemaVersion === undefined) {
    return {
      ...coreData,
      ...optionalData,
      colorTheme: normalizeTheme(coreData.colorTheme),
      gridSettings: normalizeGridSettings(coreData.gridSettings),
    };
  }

  const backgroundMeta = value.backgroundMeta;

  if (!isFiniteNumber(value.size)) {
    throw new Error('잘못된 형식: size가 유한한 숫자가 아닙니다.');
  }

  if (!isFiniteNumber(value.iconSize)) {
    throw new Error('잘못된 형식: iconSize가 유한한 숫자가 아닙니다.');
  }

  if (!isLocale(value.locale)) {
    throw new Error('잘못된 형식: locale이 올바르지 않습니다.');
  }

  if (!isGroupPreferences(value.groupPreferences)) {
    throw new Error('잘못된 형식: groupPreferences가 올바르지 않습니다.');
  }

  if (!isBookmarkTreePreferences(value.bookmarkTreePrefs)) {
    throw new Error('잘못된 형식: bookmarkTreePrefs가 올바르지 않습니다.');
  }

  if (
    !Object.hasOwn(value, 'backgroundMeta') ||
    !isBackgroundMeta(backgroundMeta)
  ) {
    throw new Error('잘못된 형식: backgroundMeta가 누락되었습니다.');
  }

  return {
    ...coreData,
    ...optionalData,
    backgroundMeta,
    bookmarkTreePrefs: value.bookmarkTreePrefs,
    groupPreferences: value.groupPreferences,
    iconSize: value.iconSize,
    locale: value.locale,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    size: value.size,
  };
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

function dataUrlToBlob(dataUrl: string): Blob {
  const separatorIndex = dataUrl.indexOf(',');

  if (separatorIndex < 0) {
    throw new Error('잘못된 base64 데이터입니다.');
  }

  const header = dataUrl.slice(0, separatorIndex);
  const base64 = dataUrl.slice(separatorIndex + 1);
  const headerMatch = /^data:([^;,]*);base64$/i.exec(header);

  if (
    !headerMatch ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) ||
    base64.length % 4 !== 0
  ) {
    throw new Error('잘못된 base64 데이터입니다.');
  }

  let binary: string;

  try {
    binary = atob(base64);
  } catch {
    throw new Error('base64 디코딩에 실패했습니다.');
  }

  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], {
    type: headerMatch[1] || 'application/octet-stream',
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

async function createImportSnapshot(
  shouldSnapshotMedia: boolean,
): Promise<ImportSnapshot> {
  const [syncSnapshot, localSnapshot, mediaSnapshot] = await Promise.all([
    snapshotStorageArea(storage.sync, SYNC_SNAPSHOT_KEYS),
    snapshotStorageArea(storage.local, LOCAL_SNAPSHOT_KEYS),
    shouldSnapshotMedia ? loadMediaBlob(MEDIA_KEY) : Promise.resolve(undefined),
  ]);

  return {
    local: localSnapshot,
    media: mediaSnapshot,
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

async function restoreImportSnapshot(snapshot: ImportSnapshot): Promise<void> {
  const results = await Promise.allSettled([
    restoreStorageArea(storage.sync, snapshot.sync),
    restoreStorageArea(storage.local, snapshot.local),
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

  if (data.schemaVersion === BACKUP_SCHEMA_VERSION) {
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

export async function exportFull(
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
  ] = await Promise.all([
    storage.sync.get('size'),
    storage.sync.get('iconSize'),
    storage.sync.get('locale'),
    storage.sync.get('groupPreferences'),
    storage.sync.get('bookmarkTreePrefs'),
    storage.local.get('favicons'),
  ]);
  const favicons = getStoredFavicons(storedFavicons);
  const data: ExportData = {
    backgroundMeta: backgroundMeta ?? null,
    bookmarkTreePrefs: getStoredBookmarkTreePreferences(storedTree),
    colorTheme,
    gridSettings,
    groupPreferences: getStoredGroupPreferences(storedGroups),
    iconSize: getStoredNumber(storedIconSize, DEFAULT_ICON_SIZE),
    locale: getStoredLocale(storedLocale),
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

export async function importFull(data: ImportData): Promise<void> {
  const validatedData = parseExportData(data);
  const snapshot = await createImportSnapshot(
    shouldApplyBackground(validatedData),
  );

  try {
    await applyImport(validatedData);
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
