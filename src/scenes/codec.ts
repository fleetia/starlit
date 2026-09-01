import { normalizeCalendarFeedUrl } from '../calendar/feedUrl';
import { isGridSettings } from '../layout/normalizeGridSettings';
import type { Placement } from '../layout/types';
import { isFontFamily } from '../settings/normalizeSettings';
import { isStarlitTheme } from '../theme/normalizeTheme';
import {
  isValidClockFormat,
  isValidClockTimeZone,
  normalizeClockWidgetConfig,
} from '../widgets/clock';
import {
  CANVAS_SCENE_VERSION,
  SCENE_PRESET_VERSION,
  SCENE_STORAGE_SCHEMA_VERSION,
  type CanvasDecorationLayerV2,
  type CanvasFrame,
  type CanvasLayerV2,
  type CanvasSceneV2,
  type SceneAppearanceSnapshotV1,
  type SceneBackgroundV1,
  type SceneBookmarkAppearanceV1,
  type SceneBookmarkCollectionV1,
  type SceneCollectionV3,
  type ScenePresetV1,
  type WidgetInstance,
} from './types';

const PLACEMENTS: readonly Placement[] = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center-center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];
const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;
const MIN_DECORATION_SCALE = 0.1;
const MAX_DECORATION_SCALE = 4;
const MAX_CALENDAR_EVENTS = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string.`);
  }

  return value;
}

function parseOptionalNonEmptyString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseNonEmptyString(value, field);
}

function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${field} must be a boolean.`);
  }

  return value;
}

function parseFiniteNumber(value: unknown, field: string): number {
  if (!isFiniteNumber(value)) {
    throw new Error(`${field} must be a finite number.`);
  }

  return value;
}

function parsePositiveNumber(value: unknown, field: string): number {
  const number = parseFiniteNumber(value, field);
  if (number <= 0) {
    throw new Error(`${field} must be positive.`);
  }

  return number;
}

function parsePlacement(value: unknown, field: string): Placement {
  if (!PLACEMENTS.some((placement) => placement === value)) {
    throw new Error(`${field} is invalid.`);
  }

  return value as Placement;
}

function parsePlaybackRate(
  value: unknown,
  field: string,
): (typeof PLAYBACK_RATES)[number] {
  if (!PLAYBACK_RATES.some((rate) => rate === value)) {
    throw new Error(`${field} is invalid.`);
  }

  return value as (typeof PLAYBACK_RATES)[number];
}

function parseStringArray(value: unknown, field: string): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string')
  ) {
    throw new Error(`${field} must be a string array.`);
  }

  return [...value];
}

function parseCanvasFrame(value: unknown, field: string): CanvasFrame {
  if (!isRecord(value)) {
    throw new Error(`${field} must be an object.`);
  }

  return {
    height: parsePositiveNumber(value.height, `${field}.height`),
    offsetX: parseFiniteNumber(value.offsetX, `${field}.offsetX`),
    offsetY: parseFiniteNumber(value.offsetY, `${field}.offsetY`),
    width: parsePositiveNumber(value.width, `${field}.width`),
  };
}

function parseDecorationLayer(
  value: Record<string, unknown>,
  index: number,
): CanvasDecorationLayerV2 {
  const field = `canvas.layers[${index}]`;
  const scale = parsePositiveNumber(value.scale, `${field}.scale`);
  if (scale < MIN_DECORATION_SCALE || scale > MAX_DECORATION_SCALE) {
    throw new Error(`${field}.scale is outside the supported range.`);
  }

  if (value.mediaType !== 'image' && value.mediaType !== 'video') {
    throw new Error(`${field}.mediaType is invalid.`);
  }

  if (
    value.playbackMode !== 'active-tab-only' &&
    value.playbackMode !== 'always'
  ) {
    throw new Error(`${field}.playbackMode is invalid.`);
  }

  const playbackRate = parsePlaybackRate(
    value.playbackRate,
    `${field}.playbackRate`,
  );

  const groupId = parseOptionalNonEmptyString(
    value.groupId,
    `${field}.groupId`,
  );

  return {
    anchor: parsePlacement(value.anchor, `${field}.anchor`),
    assetId: parseNonEmptyString(value.assetId, `${field}.assetId`),
    frame: parseCanvasFrame(value.frame, `${field}.frame`),
    ...(groupId === undefined ? {} : { groupId }),
    id: parseNonEmptyString(value.id, `${field}.id`),
    isHidden: parseBoolean(value.isHidden, `${field}.isHidden`),
    isLocked: parseBoolean(value.isLocked, `${field}.isLocked`),
    kind: 'decoration',
    mediaType: value.mediaType,
    name: parseNonEmptyString(value.name, `${field}.name`),
    playbackMode: value.playbackMode,
    playbackRate,
    rotationDeg: parseFiniteNumber(value.rotationDeg, `${field}.rotationDeg`),
    scale,
  };
}

function parseWidgetLayer(
  value: Record<string, unknown>,
  index: number,
): WidgetInstance {
  const field = `canvas.layers[${index}]`;
  const base = {
    anchor: parsePlacement(value.anchor, `${field}.anchor`),
    frame: parseCanvasFrame(value.frame, `${field}.frame`),
    id: parseNonEmptyString(value.id, `${field}.id`),
    isHidden: parseBoolean(value.isHidden, `${field}.isHidden`),
    isLocked: parseBoolean(value.isLocked, `${field}.isLocked`),
    kind: 'widget' as const,
  };

  if (!isRecord(value.config)) {
    throw new Error(`${field}.config must be an object.`);
  }

  if (value.widgetType === 'clock') {
    const hasLegacyConfig =
      'hourCycle' in value.config || 'showSeconds' in value.config;

    if (hasLegacyConfig) {
      if (
        value.config.hourCycle !== 'locale' &&
        value.config.hourCycle !== 'h12' &&
        value.config.hourCycle !== 'h24'
      ) {
        throw new Error(`${field}.config.hourCycle is invalid.`);
      }

      parseBoolean(value.config.showSeconds, `${field}.config.showSeconds`);

      return {
        ...base,
        config: normalizeClockWidgetConfig(value.config),
        widgetType: 'clock',
      };
    }

    if (
      value.config.appearance !== 'analog' &&
      value.config.appearance !== 'digital'
    ) {
      throw new Error(`${field}.config.appearance is invalid.`);
    }

    if (
      typeof value.config.format !== 'string' ||
      !isValidClockFormat(value.config.format)
    ) {
      throw new Error(`${field}.config.format is invalid.`);
    }

    if (
      value.config.timeZone !== null &&
      typeof value.config.timeZone !== 'string'
    ) {
      throw new Error(`${field}.config.timeZone is invalid.`);
    }

    if (!isValidClockTimeZone(value.config.timeZone)) {
      throw new Error(`${field}.config.timeZone is invalid.`);
    }

    return {
      ...base,
      config: {
        appearance: value.config.appearance,
        format: value.config.format,
        showSecondHand: parseBoolean(
          value.config.showSecondHand,
          `${field}.config.showSecondHand`,
        ),
        timeZone: value.config.timeZone,
      },
      widgetType: 'clock',
    };
  }

  if (
    value.widgetType === 'calendar' ||
    value.widgetType === 'google-calendar'
  ) {
    const maxEvents = parseFiniteNumber(
      value.config.maxEvents,
      `${field}.config.maxEvents`,
    );
    if (
      !Number.isInteger(maxEvents) ||
      maxEvents < 1 ||
      maxEvents > MAX_CALENDAR_EVENTS
    ) {
      throw new Error(`${field}.config.maxEvents is invalid.`);
    }

    const feedUrl = value.config.feedUrl;
    const feedLocation =
      typeof feedUrl === 'string' ? normalizeCalendarFeedUrl(feedUrl) : null;
    if (feedUrl !== undefined && feedUrl !== null && !feedLocation) {
      throw new Error(`${field}.config.feedUrl is invalid.`);
    }

    return {
      ...base,
      config: {
        feedUrl: feedLocation?.url ?? null,
        maxEvents,
        showAllDay: parseBoolean(
          value.config.showAllDay,
          `${field}.config.showAllDay`,
        ),
      },
      widgetType: 'calendar',
    };
  }

  throw new Error(`${field}.widgetType is invalid.`);
}

function parseCanvasLayer(value: unknown, index: number): CanvasLayerV2 {
  if (!isRecord(value)) {
    throw new Error(`canvas.layers[${index}] must be an object.`);
  }

  switch (value.kind) {
    case 'bookmarks':
      if (value.id !== 'bookmarks') {
        throw new Error('The bookmark layer id must be "bookmarks".');
      }
      return { id: 'bookmarks', kind: 'bookmarks' };
    case 'decoration':
      return parseDecorationLayer(value, index);
    case 'widget':
      return parseWidgetLayer(value, index);
    default:
      throw new Error(`canvas.layers[${index}].kind is invalid.`);
  }
}

export function parseCanvasSceneV2(value: unknown): CanvasSceneV2 {
  if (!isRecord(value) || value.version !== CANVAS_SCENE_VERSION) {
    throw new Error(`Canvas scene version must be ${CANVAS_SCENE_VERSION}.`);
  }

  if (!Array.isArray(value.layers)) {
    throw new Error('Canvas scene must contain a layers array.');
  }

  const layers = value.layers.map(parseCanvasLayer);
  const bookmarkLayers = layers.filter((layer) => layer.kind === 'bookmarks');
  if (bookmarkLayers.length !== 1) {
    throw new Error('Canvas scene must contain exactly one bookmark layer.');
  }

  const layerIds = layers.map((layer) => layer.id);
  if (new Set(layerIds).size !== layerIds.length) {
    throw new Error('Canvas layer ids must be unique.');
  }

  return { layers, version: CANVAS_SCENE_VERSION };
}

function parseSceneBackground(value: unknown): SceneBackgroundV1 {
  if (!isRecord(value)) {
    throw new Error('appearance.background must be an object.');
  }

  if (value.source === 'none') {
    return { source: 'none' };
  }

  if (value.mediaType !== 'image' && value.mediaType !== 'video') {
    throw new Error('appearance.background.mediaType is invalid.');
  }

  if (value.source === 'url') {
    return {
      mediaType: value.mediaType,
      source: 'url',
      url: parseNonEmptyString(value.url, 'appearance.background.url'),
    };
  }

  if (value.source === 'asset') {
    return {
      assetId: parseNonEmptyString(
        value.assetId,
        'appearance.background.assetId',
      ),
      mediaType: value.mediaType,
      source: 'asset',
    };
  }

  throw new Error('appearance.background.source is invalid.');
}

function parseBookmarkAppearance(value: unknown): SceneBookmarkAppearanceV1 {
  if (!isRecord(value)) {
    throw new Error('appearance.bookmark must be an object.');
  }

  if (
    value.iconLayout !== undefined &&
    value.iconLayout !== 'horizontal' &&
    value.iconLayout !== 'vertical'
  ) {
    throw new Error('appearance.bookmark.iconLayout is invalid.');
  }

  return {
    ...(value.iconLayout === undefined ? {} : { iconLayout: value.iconLayout }),
    isExpandView: parseBoolean(
      value.isExpandView,
      'appearance.bookmark.isExpandView',
    ),
    isFolderEnabled: parseBoolean(
      value.isFolderEnabled,
      'appearance.bookmark.isFolderEnabled',
    ),
    isVisibleOnce: parseBoolean(
      value.isVisibleOnce,
      'appearance.bookmark.isVisibleOnce',
    ),
  };
}

function parseAppearance(value: unknown): SceneAppearanceSnapshotV1 {
  if (!isRecord(value)) {
    throw new Error('appearance must be an object.');
  }

  if (!isGridSettings(value.gridSettings)) {
    throw new Error('appearance.gridSettings is invalid.');
  }

  if (!isStarlitTheme(value.theme)) {
    throw new Error('appearance.theme is invalid.');
  }

  if (!isFontFamily(value.fontFamily)) {
    throw new Error('appearance.fontFamily is invalid.');
  }

  if (typeof value.customCSS !== 'string') {
    throw new Error('appearance.customCSS must be a string.');
  }

  return {
    background: parseSceneBackground(value.background),
    bookmark: parseBookmarkAppearance(value.bookmark),
    customCSS: value.customCSS,
    fontFamily: value.fontFamily,
    gridSettings: structuredClone(value.gridSettings),
    iconSize: parsePositiveNumber(value.iconSize, 'appearance.iconSize'),
    size: parsePositiveNumber(value.size, 'appearance.size'),
    theme: { ...value.theme },
  };
}

function parseSiblingOrder(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) {
    throw new Error('bookmarkCollection.siblingOrder must be an object.');
  }

  const entries = Object.entries(value).map(
    ([key, childIds]) =>
      [
        key,
        parseStringArray(childIds, `bookmarkCollection.siblingOrder.${key}`),
      ] as const,
  );
  return Object.fromEntries(entries);
}

function parseGroupPreferences(
  value: unknown,
): SceneBookmarkCollectionV1['groupPreferences'] {
  if (!Array.isArray(value)) {
    throw new Error('bookmarkCollection.groupPreferences must be an array.');
  }

  const preferences = value.map((preference, index) => {
    if (!isRecord(preference)) {
      throw new Error(
        `bookmarkCollection.groupPreferences[${index}] must be an object.`,
      );
    }

    return {
      key: parseNonEmptyString(
        preference.key,
        `bookmarkCollection.groupPreferences[${index}].key`,
      ),
      visible: parseBoolean(
        preference.visible,
        `bookmarkCollection.groupPreferences[${index}].visible`,
      ),
    };
  });
  const keys = preferences.map((preference) => preference.key);
  if (new Set(keys).size !== keys.length) {
    throw new Error('Bookmark group preference keys must be unique.');
  }

  return preferences;
}

function parseBookmarkCollection(value: unknown): SceneBookmarkCollectionV1 {
  if (!isRecord(value)) {
    throw new Error('bookmarkCollection must be an object.');
  }

  if (
    value.folderOwnership !== 'external' &&
    value.folderOwnership !== 'scene'
  ) {
    throw new Error('bookmarkCollection.folderOwnership is invalid.');
  }

  const folderId =
    value.folderId === null
      ? null
      : parseNonEmptyString(value.folderId, 'bookmarkCollection.folderId');
  if (value.folderOwnership === 'scene' && folderId === null) {
    throw new Error('A scene-owned bookmark collection requires a folder id.');
  }

  const recoverySnapshotId = parseOptionalNonEmptyString(
    value.recoverySnapshotId,
    'bookmarkCollection.recoverySnapshotId',
  );

  return {
    folderId,
    folderOwnership: value.folderOwnership,
    folderPath: parseStringArray(
      value.folderPath,
      'bookmarkCollection.folderPath',
    ),
    groupPreferences: parseGroupPreferences(value.groupPreferences),
    ...(recoverySnapshotId === undefined ? {} : { recoverySnapshotId }),
    siblingOrder: parseSiblingOrder(value.siblingOrder),
  };
}

export function parseScenePresetV1(value: unknown): ScenePresetV1 {
  if (!isRecord(value) || value.version !== SCENE_PRESET_VERSION) {
    throw new Error(`Scene preset version must be ${SCENE_PRESET_VERSION}.`);
  }

  const createdAt = parseFiniteNumber(value.createdAt, 'createdAt');
  const updatedAt = parseFiniteNumber(value.updatedAt, 'updatedAt');
  if (createdAt < 0 || updatedAt < createdAt) {
    throw new Error('Scene timestamps are invalid.');
  }

  return {
    appearance: parseAppearance(value.appearance),
    bookmarkCollection: parseBookmarkCollection(value.bookmarkCollection),
    canvas: parseCanvasSceneV2(value.canvas),
    createdAt,
    id: parseNonEmptyString(value.id, 'id'),
    name: parseNonEmptyString(value.name, 'name'),
    updatedAt,
    version: SCENE_PRESET_VERSION,
  };
}

export function parseSceneCollectionV3(value: unknown): SceneCollectionV3 {
  if (
    !isRecord(value) ||
    value.storageSchemaVersion !== SCENE_STORAGE_SCHEMA_VERSION
  ) {
    throw new Error(
      `Scene storage schema version must be ${SCENE_STORAGE_SCHEMA_VERSION}.`,
    );
  }

  if (!Array.isArray(value.scenes)) {
    throw new Error('Scene collection must contain a scenes array.');
  }

  const scenes = value.scenes.map(parseScenePresetV1);
  const sceneIds = scenes.map((scene) => scene.id);
  if (new Set(sceneIds).size !== sceneIds.length) {
    throw new Error('Scene ids must be unique.');
  }

  const activeSceneId =
    value.activeSceneId === null
      ? null
      : parseNonEmptyString(value.activeSceneId, 'activeSceneId');
  if (activeSceneId !== null && !sceneIds.includes(activeSceneId)) {
    throw new Error('The active scene does not exist in the collection.');
  }

  return {
    activeSceneId,
    scenes,
    storageSchemaVersion: SCENE_STORAGE_SCHEMA_VERSION,
  };
}
