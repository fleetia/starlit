import {
  isBookmarkTreePrefs,
  isFaviconMap,
  isGroupPreferences,
  type BookmarkTreePrefs,
} from '../bookmarks/storageDecoders';
import type { GroupPreference } from '../bookmarks/types';
import type { Locale } from '../i18n/types';
import {
  isGridSettings,
  normalizeGridSettings,
} from '../layout/normalizeGridSettings';
import type { GridSettings } from '../layout/types';
import { getOverlayImageLayers, parseOverlayScene } from '../overlays/model';
import type { OverlayScene } from '../overlays/types';
import { isStarlitTheme, normalizeTheme } from '../theme/normalizeTheme';
import type { StarlitTheme } from '../theme/types';
import { isBackgroundMedia, type BackgroundMedia } from './backgroundMedia';
import { isFontFamily, normalizeSettings } from './normalizeSettings';
import type { PersistedSettings, Settings } from './types';

export const BACKUP_SCHEMA_VERSION = 3;
const PREVIOUS_BACKUP_SCHEMA_VERSION = 2;

export type BookmarkTreePreferences = BookmarkTreePrefs;

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

type OverlayBackupData = {
  overlayMedia: Record<string, string>;
  overlayScene: OverlayScene;
};

type ValidCommonData = Record<string, unknown> & BackupCoreData;

export type LegacyExportData = BackupCoreData &
  OptionalBackupData & {
    schemaVersion?: undefined;
  };

type VersionedExportData = BackupCoreData &
  OptionalBackupData & {
    backgroundMeta: BackgroundMedia | null;
    bookmarkTreePrefs: BookmarkTreePreferences;
    groupPreferences: GroupPreference[];
    iconSize: number;
    locale: Locale;
    size: number;
  };

export type V2ExportData = VersionedExportData & {
  schemaVersion: typeof PREVIOUS_BACKUP_SCHEMA_VERSION;
};

export type ExportData = VersionedExportData &
  OverlayBackupData & {
    schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  };

export type ImportData = ExportData | LegacyExportData | V2ExportData;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
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

function isBackgroundMeta(value: unknown): value is BackgroundMedia | null {
  return value === null || isBackgroundMedia(value);
}

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'ko' || value === 'ja';
}

export { isFaviconMap, isGroupPreferences };

export function isBookmarkTreePreferences(
  value: unknown,
): value is BookmarkTreePreferences {
  return isBookmarkTreePrefs(value);
}

function parseOverlayBackup(data: Record<string, unknown>): OverlayBackupData {
  let overlayScene: OverlayScene;

  try {
    overlayScene = parseOverlayScene(data.overlayScene);
  } catch (error) {
    throw new Error('잘못된 형식: overlayScene이 올바르지 않습니다.', {
      cause: error,
    });
  }

  if (!isRecord(data.overlayMedia)) {
    throw new Error('잘못된 형식: overlayMedia가 올바르지 않습니다.');
  }

  const overlayMediaValue = data.overlayMedia;
  const imageIds = getOverlayImageLayers(overlayScene).map((image) => image.id);
  const mediaIds = Object.keys(overlayMediaValue);

  if (
    imageIds.length !== mediaIds.length ||
    imageIds.some((id) => !Object.hasOwn(overlayMediaValue, id))
  ) {
    throw new Error(
      '잘못된 형식: overlay image와 media data가 일치하지 않습니다.',
    );
  }

  const overlayMediaEntries: Array<readonly [string, string]> = [];

  for (const id of imageIds) {
    const mediaData = overlayMediaValue[id];
    if (typeof mediaData !== 'string') {
      throw new Error('잘못된 형식: overlay media가 문자열이 아닙니다.');
    }

    const blob = dataUrlToBlob(mediaData);
    if (!blob.type.startsWith('image/')) {
      throw new Error('잘못된 형식: overlay media가 이미지가 아닙니다.');
    }

    overlayMediaEntries.push([id, mediaData]);
  }

  return {
    overlayMedia: Object.fromEntries(overlayMediaEntries),
    overlayScene,
  };
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

export function parseExportData(value: unknown): ImportData {
  if (!isRecord(value)) {
    throw new Error('잘못된 형식: 객체가 아닙니다.');
  }

  if (
    value.schemaVersion !== undefined &&
    value.schemaVersion !== PREVIOUS_BACKUP_SCHEMA_VERSION &&
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

  const versionedData: VersionedExportData = {
    ...coreData,
    ...optionalData,
    backgroundMeta,
    bookmarkTreePrefs: value.bookmarkTreePrefs,
    groupPreferences: value.groupPreferences,
    iconSize: value.iconSize,
    locale: value.locale,
    size: value.size,
  };

  if (value.schemaVersion === PREVIOUS_BACKUP_SCHEMA_VERSION) {
    return {
      ...versionedData,
      schemaVersion: PREVIOUS_BACKUP_SCHEMA_VERSION,
    };
  }

  return {
    ...versionedData,
    ...parseOverlayBackup(value),
    schemaVersion: BACKUP_SCHEMA_VERSION,
  };
}

export function dataUrlToBlob(dataUrl: string): Blob {
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

export async function validateOverlayMedia(data: ExportData): Promise<void> {
  for (const image of getOverlayImageLayers(data.overlayScene)) {
    const mediaData = data.overlayMedia[image.id];
    if (!mediaData) {
      throw new Error(`overlay media가 누락되었습니다: ${image.id}`);
    }

    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(dataUrlToBlob(mediaData));
    } catch (error) {
      throw new Error(`overlay media를 디코딩할 수 없습니다: ${image.name}`, {
        cause: error,
      });
    }

    try {
      if (bitmap.width <= 0 || bitmap.height <= 0) {
        throw new Error(
          `overlay media 크기가 올바르지 않습니다: ${image.name}`,
        );
      }
    } finally {
      bitmap.close();
    }
  }
}
