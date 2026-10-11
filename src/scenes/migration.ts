import {
  getOverlayImageMediaKind,
  getOverlayImagePlaybackMode,
  getOverlayImagePlaybackRate,
  getOverlayImageScale,
  isOverlayImageHidden,
  isOverlayImageLocked,
  normalizeOverlayScene,
} from '../overlays/model';
import type { OverlayImageLayer } from '../overlays/types';
import {
  CANVAS_SCENE_VERSION,
  SCENE_PRESET_VERSION,
  SCENE_STORAGE_SCHEMA_VERSION,
  type CanvasDecorationLayerV2,
  type CanvasSceneV2,
  type LegacySceneSettingsSnapshot,
  type SceneBackgroundV1,
  type SceneCollectionV3,
  type ScenePresetV1,
} from './types';
import { parseSceneCollectionV3 } from './codec';

const LEGACY_BACKGROUND_ASSET_ID = 'backgroundMedia';

export type LegacySceneMigrationInput = LegacySceneSettingsSnapshot & {
  overlayScene: unknown;
};

export type LegacySceneMigrationOptions = {
  backgroundAssetId?: string;
  id: string;
  name: string;
  now: number;
};

function migrateBackground(
  input: LegacySceneMigrationInput['backgroundMeta'],
  backgroundAssetId: string,
): SceneBackgroundV1 {
  if (input === null) {
    return { source: 'none' };
  }

  if (input.source === 'url') {
    if (input.url.trim() === '') {
      return { source: 'none' };
    }

    return {
      mediaType: input.type,
      source: 'url',
      url: input.url,
    };
  }

  return {
    assetId: backgroundAssetId,
    mediaType: input.type,
    source: 'asset',
  };
}

function migrateOverlayImage(
  image: OverlayImageLayer,
): CanvasDecorationLayerV2 {
  return {
    anchor: image.anchor,
    assetId: image.id,
    frame: {
      height: image.height,
      offsetX: image.offsetX,
      offsetY: image.offsetY,
      width: image.width,
    },
    ...(image.groupId === undefined ? {} : { groupId: image.groupId }),
    id: image.id,
    isHidden: isOverlayImageHidden(image),
    isLocked: isOverlayImageLocked(image),
    kind: 'decoration',
    mediaType: getOverlayImageMediaKind(image) === 'motion' ? 'video' : 'image',
    name: image.name || image.id,
    playbackMode: getOverlayImagePlaybackMode(image),
    playbackRate: getOverlayImagePlaybackRate(image),
    rotationDeg: image.rotationDeg,
    scale: getOverlayImageScale(image),
  };
}

export function migrateOverlaySceneToCanvas(value: unknown): CanvasSceneV2 {
  const overlayScene = normalizeOverlayScene(value);

  return {
    layers: overlayScene.layers.map((layer) =>
      layer.kind === 'bookmarks'
        ? { id: 'bookmarks' as const, kind: 'bookmarks' as const }
        : migrateOverlayImage(layer),
    ),
    version: CANVAS_SCENE_VERSION,
  };
}

export function migrateLegacySceneCollection(
  input: LegacySceneMigrationInput,
  options: LegacySceneMigrationOptions,
): SceneCollectionV3 {
  const backgroundAssetId =
    options.backgroundAssetId ?? LEGACY_BACKGROUND_ASSET_ID;
  const bookmark = {
    ...(input.settings.iconLayout === undefined
      ? {}
      : { iconLayout: input.settings.iconLayout }),
    isExpandView: input.settings.isExpandView,
    isFolderEnabled: input.settings.isFolderEnabled,
    isVisibleOnce: input.settings.isVisibleOnce,
  };
  const siblingOrder = Object.fromEntries(
    Object.entries(input.bookmarkTreePrefs.siblingOrder).map(
      ([key, childIds]) => [key, [...childIds]],
    ),
  );
  const scene: ScenePresetV1 = {
    appearance: {
      background: migrateBackground(input.backgroundMeta, backgroundAssetId),
      bookmark,
      customCSS: input.customCSS,
      fontFamily: input.settings.fontFamily,
      gridSettings: structuredClone(input.gridSettings),
      iconSize: input.iconSize,
      size: input.size,
      theme: { ...input.colorTheme },
    },
    bookmarkCollection: {
      folderId: input.bookmarkTreePrefs.rootId ?? null,
      folderOwnership: 'external',
      folderPath: [...input.bookmarkTreePrefs.rootPath],
      groupPreferences: input.groupPreferences.map((preference) => ({
        ...preference,
      })),
      siblingOrder,
    },
    canvas: migrateOverlaySceneToCanvas(input.overlayScene),
    createdAt: options.now,
    id: options.id,
    name: options.name,
    updatedAt: options.now,
    version: SCENE_PRESET_VERSION,
  };

  return parseSceneCollectionV3({
    activeSceneId: scene.id,
    scenes: [scene],
    storageSchemaVersion: SCENE_STORAGE_SCHEMA_VERSION,
  });
}
