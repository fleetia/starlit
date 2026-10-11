import type { BookmarkTreePrefs } from '../bookmarks/storageDecoders';
import type { GroupPreference } from '../bookmarks/types';
import type { GridSettings, Placement } from '../layout/types';
import type { Settings } from '../settings/types';
import type { BackgroundMedia } from '../settings/backgroundMedia';
import type { FontFamily, StarlitTheme } from '../theme/types';

export const SCENE_PRESET_VERSION = 1;
export const CANVAS_SCENE_VERSION = 2;
export const SCENE_STORAGE_SCHEMA_VERSION = 3;

export type CanvasFrame = {
  height: number;
  offsetX: number;
  offsetY: number;
  width: number;
};

export type CanvasBookmarkLayerV2 = {
  id: 'bookmarks';
  kind: 'bookmarks';
};

export type CanvasDecorationLayerV2 = {
  anchor: Placement;
  assetId: string;
  frame: CanvasFrame;
  groupId?: string;
  id: string;
  isHidden: boolean;
  isLocked: boolean;
  kind: 'decoration';
  mediaType: 'image' | 'video';
  name: string;
  playbackMode: 'active-tab-only' | 'always';
  playbackRate: 0.5 | 1 | 1.5 | 2;
  rotationDeg: number;
  scale: number;
};

export type ClockWidgetConfig = {
  appearance: 'analog' | 'digital';
  format: string;
  showSecondHand: boolean;
  timeZone: string | null;
};

export type CalendarWidgetConfig = {
  feedUrl: string | null;
  maxEvents: number;
  showAllDay: boolean;
};

type WidgetInstanceBase = {
  anchor: Placement;
  frame: CanvasFrame;
  id: string;
  isHidden: boolean;
  isLocked: boolean;
  kind: 'widget';
};

export type ClockWidgetInstance = WidgetInstanceBase & {
  config: ClockWidgetConfig;
  widgetType: 'clock';
};

export type CalendarWidgetInstance = WidgetInstanceBase & {
  config: CalendarWidgetConfig;
  widgetType: 'calendar';
};

export type WidgetInstance = CalendarWidgetInstance | ClockWidgetInstance;

export type CanvasLayerV2 =
  | CanvasBookmarkLayerV2
  | CanvasDecorationLayerV2
  | WidgetInstance;

export type CanvasSceneV2 = {
  layers: CanvasLayerV2[];
  version: typeof CANVAS_SCENE_VERSION;
};

export type SceneBackgroundV1 =
  | { source: 'none' }
  | {
      mediaType: 'image' | 'video';
      source: 'url';
      url: string;
    }
  | {
      assetId: string;
      mediaType: 'image' | 'video';
      source: 'asset';
    };

export type SceneBookmarkAppearanceV1 = Pick<
  Settings,
  'iconLayout' | 'isExpandView' | 'isFolderEnabled' | 'isVisibleOnce'
>;

export type SceneAppearanceSnapshotV1 = {
  background: SceneBackgroundV1;
  bookmark: SceneBookmarkAppearanceV1;
  customCSS: string;
  fontFamily: FontFamily;
  gridSettings: GridSettings;
  iconSize: number;
  size: number;
  theme: StarlitTheme;
};

export type SceneBookmarkCollectionV1 = {
  folderId: string | null;
  folderOwnership: 'external' | 'scene';
  folderPath: string[];
  groupPreferences: GroupPreference[];
  recoverySnapshotId?: string;
  siblingOrder: BookmarkTreePrefs['siblingOrder'];
};

export type ScenePresetV1 = {
  appearance: SceneAppearanceSnapshotV1;
  bookmarkCollection: SceneBookmarkCollectionV1;
  canvas: CanvasSceneV2;
  createdAt: number;
  id: string;
  name: string;
  updatedAt: number;
  version: typeof SCENE_PRESET_VERSION;
};

export type SceneCollectionV3 = {
  activeSceneId: string | null;
  scenes: ScenePresetV1[];
  storageSchemaVersion: typeof SCENE_STORAGE_SCHEMA_VERSION;
};

export type LegacySceneSettingsSnapshot = {
  backgroundMeta: BackgroundMedia | null;
  bookmarkTreePrefs: BookmarkTreePrefs;
  colorTheme: StarlitTheme;
  customCSS: string;
  gridSettings: GridSettings;
  groupPreferences: GroupPreference[];
  iconSize: number;
  settings: Settings;
  size: number;
};
