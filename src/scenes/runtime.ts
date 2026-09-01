import {
  getOverlayMediaKey,
  OVERLAY_IMAGE_MEDIA_KEY_PREFIX,
  OVERLAY_SCENE_STORAGE_KEY,
  parseOverlayScene,
} from '../overlays/model';
import type { OverlayLayer, OverlayScene } from '../overlays/types';
import { createChromeSceneBookmarkGateway } from '../platform/bookmarks/sceneBookmarkGateway';
import {
  deleteIndexedRecord,
  loadSharedAsset,
  saveSharedAsset,
  type SharedAssetRecord,
} from '../platform/storage/indexedDbRecords';
import {
  deleteMediaBatch,
  listMediaKeys,
  loadMediaBlob,
  saveMedia,
  SHARED_ASSET_STORE_NAME,
} from '../platform/storage/mediaStorage';
import {
  sceneRepository,
  type SceneRepository,
} from '../platform/storage/sceneRepository';
import {
  sceneRecoveryRepository,
  type SceneRecoveryRepository,
} from '../platform/storage/sceneRecoveryRepository';
import storage from '../platform/storage/storage';
import {
  createSelfRestoringTransactionStep as createSelfRestoringStep,
  runStorageTransaction,
  type TransactionStep,
} from '../platform/storage/transactionCoordinator';
import { normalizeSettings } from '../settings/normalizeSettings';
import type { BackgroundMedia } from '../settings/backgroundMedia';
import type { Settings } from '../settings/types';
import {
  CHROME_OTHER_BOOKMARKS_FOLDER_ID,
  type SceneBookmarkGateway,
  type SceneBookmarkNode,
} from './bookmarkCopy';
import { parseCanvasSceneV2, parseScenePresetV1 } from './codec';
import {
  migrateLegacySceneCollection,
  migrateOverlaySceneToCanvas,
} from './migration';
import { getSceneReadiness, type SceneReadiness } from './readiness';
import {
  createSceneRecoverySnapshotId,
  SCENE_RECOVERY_SNAPSHOT_VERSION,
  type SceneRecoveryBookmarkNodeV1,
  type SceneRecoveryBookmarkSnapshotV1,
  type SceneRecoverySnapshotV1,
} from './recovery';
import {
  CANVAS_SCENE_VERSION,
  type CanvasSceneV2,
  type LegacySceneSettingsSnapshot,
  type SceneBookmarkCollectionV1,
  type SceneCollectionV3,
  type ScenePresetV1,
} from './types';
import { remapBookmarkPreferences } from './bookmarkIdentity';

export const BACKGROUND_MEDIA_KEY = 'backgroundMedia';
export const SCENE_ASSET_ID_PREFIX = 'scene-asset:';

const SCENE_SETTINGS_STORAGE_KEYS = [
  'backgroundMeta',
  'bookmarkTreePrefs',
  'colorTheme',
  'customCSS',
  'gridSettings',
  'groupPreferences',
  'iconSize',
  'settings',
  'size',
] as const;
const LEGACY_SYNC_SCENE_KEYS = [
  'backgroundImage',
  'bookmarks',
  'displaySize',
] as const;
const SYNC_SCENE_STORAGE_KEYS = [
  ...SCENE_SETTINGS_STORAGE_KEYS,
  ...LEGACY_SYNC_SCENE_KEYS,
] as const;
const LOCAL_SCENE_KEYS = [
  ...SCENE_SETTINGS_STORAGE_KEYS,
  OVERLAY_SCENE_STORAGE_KEY,
] as const;
const MAX_ID_GENERATION_ATTEMPTS = 100;

export type SceneRuntimeSnapshot = LegacySceneSettingsSnapshot & {
  canvas?: CanvasSceneV2;
  overlayScene: OverlayScene;
};

export type SceneSnapshotAssetReferences = {
  backgroundAssetId?: string;
  decorationAssetIds: Readonly<Record<string, string>>;
};

export type CreateScenePresetSnapshotOptions = {
  assetReferences: SceneSnapshotAssetReferences;
  bookmarkCollection: SceneBookmarkCollectionV1;
  createdAt?: number;
  id: string;
  name: string;
  now: number;
};

export type SceneStorageAreaAdapter = {
  get: (key: string) => Promise<unknown>;
  remove: (keys: string | string[]) => Promise<void>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

export type SceneMediaAdapter = {
  delete: (keys: readonly string[]) => Promise<void>;
  list: (prefix?: string) => Promise<string[]>;
  load: (key: string) => Promise<Blob | null>;
  save: (key: string, blob: Blob) => Promise<void>;
};

export type SceneAssetAdapter = {
  delete: (assetId: string) => Promise<void>;
  load: (assetId: string) => Promise<SharedAssetRecord | null>;
  save: (asset: SharedAssetRecord) => Promise<void>;
};

export type SceneBookmarkResourceAdapter = {
  create?: SceneBookmarkGateway['create'];
  exists: (folderId: string) => Promise<boolean>;
  getChildren?: SceneBookmarkGateway['getChildren'];
  getSubTree?: SceneBookmarkGateway['getSubTree'];
  removeTree: (folderId: string) => Promise<void>;
};

export type SceneRecoveryAvailability = {
  recoverableAssetIds: ReadonlySet<string>;
  recoverySnapshotIds: ReadonlySet<string>;
};

export type SceneRuntimeDependencies = {
  assets: SceneAssetAdapter;
  bookmarks: SceneBookmarkResourceAdapter;
  createId: () => string;
  getRecoveryAvailability?: (
    scene: ScenePresetV1,
  ) => Promise<SceneRecoveryAvailability>;
  local: SceneStorageAreaAdapter;
  media: SceneMediaAdapter;
  now: () => number;
  recovery?: SceneRecoveryRepository;
  repository: SceneRepository;
  restoreResources?: (scene: ScenePresetV1) => Promise<ScenePresetV1>;
  sync: SceneStorageAreaAdapter;
};

export type CreateSceneOptions = {
  bookmarkCollection: SceneBookmarkCollectionV1;
  id?: string;
  makeActive?: boolean;
  name: string;
};

export type UpdateSceneOptions = {
  name?: string;
};

export type DuplicateSceneOptions = {
  bookmarkCollection: SceneBookmarkCollectionV1;
  id?: string;
  makeActive?: boolean;
  name: string;
};

export type DeleteSceneOptions = {
  deleteAssets?: boolean;
  deleteBookmarkFolder?: boolean;
};

export type SceneRelinkInput = {
  assetIds?: Readonly<Record<string, string>>;
  folder?: {
    id: string;
    path: string[];
  };
};

export type SceneRuntime = {
  applyScene: (sceneId: string) => Promise<SceneCollectionV3>;
  createScene: (
    snapshot: SceneRuntimeSnapshot,
    options: CreateSceneOptions,
  ) => Promise<SceneCollectionV3>;
  deleteScene: (
    sceneId: string,
    options?: DeleteSceneOptions,
  ) => Promise<SceneCollectionV3>;
  duplicateScene: (
    sceneId: string,
    options: DuplicateSceneOptions,
  ) => Promise<SceneCollectionV3>;
  getReadiness: (sceneId: string) => Promise<SceneReadiness>;
  load: () => Promise<SceneCollectionV3>;
  relinkScene: (
    sceneId: string,
    input: SceneRelinkInput,
  ) => Promise<SceneCollectionV3>;
  restoreScene: (sceneId: string) => Promise<SceneCollectionV3>;
  updateScene: (
    sceneId: string,
    snapshot: SceneRuntimeSnapshot,
    options?: UpdateSceneOptions,
  ) => Promise<SceneCollectionV3>;
};

type PreparedSceneAssets = {
  records: SharedAssetRecord[];
  references: SceneSnapshotAssetReferences;
};

type PreloadedScene = {
  assets: Map<string, SharedAssetRecord>;
  readiness: SceneReadiness;
};

type MediaSnapshot = Map<string, Blob>;

type RestoredBookmarkFolder = {
  createdContainerId: string | null;
  folderId: string;
  folderPath: string[];
  identityMap: ReadonlyMap<string, string>;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getSceneAssetIds(scene: ScenePresetV1): string[] {
  const assetIds = scene.canvas.layers.flatMap((layer) =>
    layer.kind === 'decoration' ? [layer.assetId] : [],
  );
  if (scene.appearance.background.source === 'asset') {
    assetIds.push(scene.appearance.background.assetId);
  }
  return [...new Set(assetIds)];
}

function getSceneById(
  collection: SceneCollectionV3,
  sceneId: string,
): ScenePresetV1 {
  const scene = collection.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) {
    throw new Error(`Scene does not exist: ${sceneId}`);
  }
  return scene;
}

function assertSceneOwnedBookmarkCollection(
  collection: SceneBookmarkCollectionV1,
): asserts collection is SceneBookmarkCollectionV1 & {
  folderId: string;
  folderOwnership: 'scene';
} {
  if (collection.folderOwnership !== 'scene' || collection.folderId === null) {
    throw new Error('A new Scene requires a dedicated bookmark folder.');
  }
}

function assertBookmarkFolderIsUnclaimed(
  collection: SceneCollectionV3,
  folderId: string,
  ignoredSceneId?: string,
): void {
  if (
    collection.scenes.some(
      (scene) =>
        scene.id !== ignoredSceneId &&
        scene.bookmarkCollection.folderId === folderId,
    )
  ) {
    throw new Error(`Bookmark folder is already used by a Scene: ${folderId}`);
  }
}

function createUpdatedBookmarkCollection(
  previous: ScenePresetV1,
  snapshot: SceneRuntimeSnapshot,
  collection: SceneCollectionV3,
): SceneBookmarkCollectionV1 {
  const folderId = snapshot.bookmarkTreePrefs.rootId ?? null;
  if (folderId !== null) {
    assertBookmarkFolderIsUnclaimed(collection, folderId, previous.id);
  }

  const keepsSceneOwnership =
    previous.bookmarkCollection.folderOwnership === 'scene' &&
    folderId === previous.bookmarkCollection.folderId;

  return {
    folderId,
    folderOwnership: keepsSceneOwnership ? 'scene' : 'external',
    folderPath: [...snapshot.bookmarkTreePrefs.rootPath],
    groupPreferences: structuredClone(snapshot.groupPreferences),
    ...(keepsSceneOwnership &&
    previous.bookmarkCollection.recoverySnapshotId !== undefined
      ? {
          recoverySnapshotId: previous.bookmarkCollection.recoverySnapshotId,
        }
      : {}),
    siblingOrder: structuredClone(snapshot.bookmarkTreePrefs.siblingOrder),
  };
}

function createRelinkedBookmarkCollection(
  current: SceneBookmarkCollectionV1,
  folder: SceneRelinkInput['folder'],
): SceneBookmarkCollectionV1 {
  const folderId = folder?.id ?? current.folderId;
  const folderOwnership =
    folder !== undefined && folder.id !== current.folderId
      ? 'external'
      : current.folderOwnership;

  return {
    folderId,
    folderOwnership,
    folderPath: folder ? [...folder.path] : [...current.folderPath],
    groupPreferences: structuredClone(current.groupPreferences),
    ...(folderOwnership === 'scene' &&
    folderId !== null &&
    current.recoverySnapshotId !== undefined
      ? { recoverySnapshotId: current.recoverySnapshotId }
      : {}),
    siblingOrder: structuredClone(current.siblingOrder),
  };
}

function createUniqueSceneId(
  collection: SceneCollectionV3,
  dependencies: SceneRuntimeDependencies,
): string {
  const occupiedIds = new Set(collection.scenes.map((scene) => scene.id));
  for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
    const id = dependencies.createId();
    if (id.trim() !== '' && !occupiedIds.has(id)) {
      return id;
    }
  }
  throw new Error('Could not create a unique Scene id.');
}

function resolveNewSceneId(
  requestedId: string | undefined,
  collection: SceneCollectionV3,
  dependencies: SceneRuntimeDependencies,
): string {
  if (requestedId === undefined) {
    return createUniqueSceneId(collection, dependencies);
  }
  if (requestedId.trim() === '') {
    throw new Error('Scene id must not be empty.');
  }
  if (collection.scenes.some((scene) => scene.id === requestedId)) {
    throw new Error(`Scene id already exists: ${requestedId}`);
  }
  return requestedId;
}

function isUsableAssetRecord(
  record: SharedAssetRecord | null,
  assetId: string,
): record is SharedAssetRecord {
  return (
    record !== null &&
    record.id === assetId &&
    record.blob instanceof Blob &&
    record.blob.size > 0
  );
}

function getBookmarkRecoveryGateway(
  bookmarks: SceneBookmarkResourceAdapter,
): SceneBookmarkGateway | null {
  if (!bookmarks.create || !bookmarks.getChildren || !bookmarks.getSubTree) {
    return null;
  }

  return {
    create: bookmarks.create,
    getChildren: bookmarks.getChildren,
    getSubTree: bookmarks.getSubTree,
    removeTree: bookmarks.removeTree,
  };
}

async function loadWritableBookmarkFolder(
  folderId: string,
  gateway: SceneBookmarkGateway,
): Promise<SceneBookmarkNode | null> {
  try {
    const nodes = await gateway.getSubTree(folderId);
    const folder = nodes.find((node) => node.id === folderId);
    if (
      !folder ||
      folder.url !== undefined ||
      folder.unmodifiable === 'managed'
    ) {
      return null;
    }
    return folder;
  } catch {
    return null;
  }
}

function createRecoveryBookmarkNode(
  node: SceneBookmarkNode,
): SceneRecoveryBookmarkNodeV1 {
  if (node.url !== undefined) {
    return { sourceId: node.id, title: node.title, url: node.url };
  }

  return {
    children: (node.children ?? []).map(createRecoveryBookmarkNode),
    sourceId: node.id,
    title: node.title,
  };
}

async function captureSceneRecoverySnapshot(
  scene: ScenePresetV1,
  dependencies: SceneRuntimeDependencies,
): Promise<SceneRecoverySnapshotV1> {
  const snapshotId = scene.bookmarkCollection.recoverySnapshotId;
  const folderId = scene.bookmarkCollection.folderId;
  const gateway = getBookmarkRecoveryGateway(dependencies.bookmarks);
  if (
    snapshotId === undefined ||
    folderId === null ||
    scene.bookmarkCollection.folderOwnership !== 'scene' ||
    gateway === null
  ) {
    throw new Error('Scene recovery snapshot dependencies are unavailable.');
  }

  const folder = await loadWritableBookmarkFolder(folderId, gateway);
  if (!folder || folder.parentId === undefined) {
    throw new Error('Scene bookmark folder cannot be captured for recovery.');
  }
  const container = await loadWritableBookmarkFolder(folder.parentId, gateway);
  if (!container || container.parentId === undefined) {
    throw new Error(
      'Scene bookmark container cannot be captured for recovery.',
    );
  }

  const assetIds = getSceneAssetIds(scene);
  const records = await Promise.all(
    assetIds.map((assetId) => dependencies.assets.load(assetId)),
  );
  const assets = records.map((record, index) => {
    const assetId = assetIds[index];
    if (!assetId || !isUsableAssetRecord(record, assetId)) {
      throw new Error(
        `Scene asset cannot be captured for recovery: ${assetId}`,
      );
    }
    return { ...record };
  });

  return {
    assets,
    bookmark: {
      containerId: container.id,
      containerTitle: container.title,
      destinationParentId: container.parentId,
      folder: createRecoveryBookmarkNode(folder),
      folderPath: [...scene.bookmarkCollection.folderPath],
    },
    capturedAt: scene.updatedAt,
    id: snapshotId,
    sceneId: scene.id,
    version: SCENE_RECOVERY_SNAPSHOT_VERSION,
  };
}

async function loadSceneRecoverySnapshot(
  scene: ScenePresetV1,
  dependencies: SceneRuntimeDependencies,
): Promise<SceneRecoverySnapshotV1 | null> {
  const snapshotId = scene.bookmarkCollection.recoverySnapshotId;
  if (!dependencies.recovery || snapshotId === undefined) {
    return null;
  }

  try {
    const snapshot = await dependencies.recovery.load(snapshotId);
    return snapshot?.id === snapshotId && snapshot.sceneId === scene.id
      ? snapshot
      : null;
  } catch {
    return null;
  }
}

async function findBookmarkRestoreDestination(
  snapshot: SceneRecoveryBookmarkSnapshotV1,
  gateway: SceneBookmarkGateway,
): Promise<SceneBookmarkNode | null> {
  const destination = await loadWritableBookmarkFolder(
    snapshot.destinationParentId,
    gateway,
  );
  if (destination) {
    return destination;
  }
  if (snapshot.destinationParentId === CHROME_OTHER_BOOKMARKS_FOLDER_ID) {
    return null;
  }

  return loadWritableBookmarkFolder(CHROME_OTHER_BOOKMARKS_FOLDER_ID, gateway);
}

async function canRestoreBookmarkSnapshot(
  snapshot: SceneRecoveryBookmarkSnapshotV1,
  bookmarks: SceneBookmarkResourceAdapter,
): Promise<boolean> {
  const gateway = getBookmarkRecoveryGateway(bookmarks);
  if (!gateway) {
    return false;
  }

  if (await loadWritableBookmarkFolder(snapshot.containerId, gateway)) {
    return true;
  }

  return (await findBookmarkRestoreDestination(snapshot, gateway)) !== null;
}

async function getDefaultRecoveryAvailability(
  scene: ScenePresetV1,
  dependencies: SceneRuntimeDependencies,
): Promise<SceneRecoveryAvailability> {
  const snapshot = await loadSceneRecoverySnapshot(scene, dependencies);
  if (!snapshot) {
    return {
      recoverableAssetIds: new Set(),
      recoverySnapshotIds: new Set(),
    };
  }

  const recoverableAssetIds = new Set(
    snapshot.assets.flatMap((asset) =>
      isUsableAssetRecord(asset, asset.id) ? [asset.id] : [],
    ),
  );
  const canRestoreBookmarks = await canRestoreBookmarkSnapshot(
    snapshot.bookmark,
    dependencies.bookmarks,
  );

  return {
    recoverableAssetIds,
    recoverySnapshotIds: canRestoreBookmarks
      ? new Set([snapshot.id])
      : new Set(),
  };
}

function mergeRecoveryAvailability(
  first: SceneRecoveryAvailability,
  second: SceneRecoveryAvailability | undefined,
): SceneRecoveryAvailability {
  return {
    recoverableAssetIds: new Set([
      ...first.recoverableAssetIds,
      ...(second?.recoverableAssetIds ?? []),
    ]),
    recoverySnapshotIds: new Set([
      ...first.recoverySnapshotIds,
      ...(second?.recoverySnapshotIds ?? []),
    ]),
  };
}

export function projectCanvasSceneToOverlayScene(
  value: CanvasSceneV2,
): OverlayScene {
  const canvas = parseCanvasSceneV2(value);
  return parseOverlayScene({
    layers: canvas.layers.flatMap((layer): OverlayLayer[] => {
      if (layer.kind === 'widget') {
        return [];
      }
      if (layer.kind === 'bookmarks') {
        return [{ kind: 'bookmarks' as const }];
      }

      return [
        {
          anchor: layer.anchor,
          ...(layer.groupId === undefined ? {} : { groupId: layer.groupId }),
          height: layer.frame.height,
          hidden: layer.isHidden,
          id: layer.id,
          kind: 'image' as const,
          locked: layer.isLocked,
          mediaKind: layer.mediaType === 'video' ? 'motion' : 'static',
          name: layer.name,
          offsetX: layer.frame.offsetX,
          offsetY: layer.frame.offsetY,
          playbackMode: layer.playbackMode,
          playbackRate: layer.playbackRate,
          rotationDeg: layer.rotationDeg,
          scale: layer.scale,
          width: layer.frame.width,
        },
      ];
    }),
  });
}

export function projectOverlaySceneToCanvasScene(
  overlayScene: OverlayScene,
  assetIds: Readonly<Record<string, string>> = {},
): CanvasSceneV2 {
  const migrated = migrateOverlaySceneToCanvas(parseOverlayScene(overlayScene));

  return parseCanvasSceneV2({
    ...migrated,
    layers: migrated.layers.map((layer) =>
      layer.kind === 'decoration'
        ? { ...layer, assetId: assetIds[layer.id] ?? layer.assetId }
        : layer,
    ),
  });
}

export function createScenePresetSnapshot(
  snapshot: SceneRuntimeSnapshot,
  options: CreateScenePresetSnapshotOptions,
): ScenePresetV1 {
  if (
    snapshot.backgroundMeta?.source === 'file' &&
    options.assetReferences.backgroundAssetId === undefined
  ) {
    throw new Error('A file background requires a shared asset reference.');
  }

  const migrated = migrateLegacySceneCollection(
    { ...snapshot, overlayScene: parseOverlayScene(snapshot.overlayScene) },
    {
      backgroundAssetId: options.assetReferences.backgroundAssetId,
      id: options.id,
      name: options.name,
      now: options.now,
    },
  ).scenes[0];
  if (!migrated) {
    throw new Error('Could not create a Scene snapshot.');
  }

  const sourceCanvas = snapshot.canvas
    ? parseCanvasSceneV2(snapshot.canvas)
    : migrated.canvas;
  const layers = sourceCanvas.layers.map((layer) => {
    if (layer.kind !== 'decoration') {
      return layer;
    }
    const assetId = options.assetReferences.decorationAssetIds[layer.id];
    if (!assetId) {
      throw new Error(`Decoration asset is missing: ${layer.id}`);
    }
    return { ...layer, assetId };
  });

  return parseScenePresetV1({
    ...migrated,
    bookmarkCollection: structuredClone(options.bookmarkCollection),
    canvas: { layers, version: CANVAS_SCENE_VERSION },
    createdAt: options.createdAt ?? options.now,
    updatedAt: Math.max(options.createdAt ?? options.now, options.now),
  });
}

function createBackgroundMeta(scene: ScenePresetV1): BackgroundMedia | null {
  const background = scene.appearance.background;
  if (background.source === 'none') {
    return null;
  }
  if (background.source === 'url') {
    return {
      source: 'url',
      type: background.mediaType,
      url: background.url,
    };
  }
  return { source: 'file', type: background.mediaType, url: '' };
}

function createAppliedSettings(
  scene: ScenePresetV1,
  currentValue: unknown,
): Settings {
  const current = normalizeSettings(currentValue);
  const bookmark = scene.appearance.bookmark;
  return {
    fontFamily: scene.appearance.fontFamily,
    ...(bookmark.iconLayout === undefined
      ? {}
      : { iconLayout: bookmark.iconLayout }),
    isExpandView: bookmark.isExpandView,
    isFolderEnabled: bookmark.isFolderEnabled,
    isOpenInNewTab: current.isOpenInNewTab,
    isVisibleOnce: bookmark.isVisibleOnce,
  };
}

function createLocalSceneUpdates(
  scene: ScenePresetV1,
  globalSettings: unknown,
): Record<string, unknown> {
  return {
    backgroundMeta: createBackgroundMeta(scene),
    bookmarkTreePrefs: {
      ...(scene.bookmarkCollection.folderId === null
        ? {}
        : { rootId: scene.bookmarkCollection.folderId }),
      rootPath: [...scene.bookmarkCollection.folderPath],
      siblingOrder: structuredClone(scene.bookmarkCollection.siblingOrder),
    },
    colorTheme: { ...scene.appearance.theme },
    customCSS: scene.appearance.customCSS,
    gridSettings: structuredClone(scene.appearance.gridSettings),
    groupPreferences: structuredClone(
      scene.bookmarkCollection.groupPreferences,
    ),
    iconSize: scene.appearance.iconSize,
    settings: createAppliedSettings(scene, globalSettings),
    size: scene.appearance.size,
  };
}

function createGlobalSettingsUpdate(currentSettings: unknown): {
  settings: Pick<Settings, 'isOpenInNewTab'>;
} {
  const { isOpenInNewTab } = normalizeSettings(currentSettings);
  return { settings: { isOpenInNewTab } };
}

async function snapshotStorageArea(
  area: SceneStorageAreaAdapter,
  keys: readonly string[],
): Promise<Record<string, unknown>> {
  const values = await Promise.all(keys.map((key) => area.get(key)));
  return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
}

async function restoreStorageArea(
  area: SceneStorageAreaAdapter,
  snapshot: Record<string, unknown>,
): Promise<void> {
  const entries = Object.entries(snapshot);
  const values = entries.filter(([, value]) => value !== undefined);
  const missingKeys = entries
    .filter(([, value]) => value === undefined)
    .map(([key]) => key);

  if (values.length > 0) {
    await area.set(Object.fromEntries(values));
  }
  if (missingKeys.length > 0) {
    await area.remove(missingKeys);
  }
}

async function snapshotCurrentMedia(
  media: SceneMediaAdapter,
): Promise<MediaSnapshot> {
  const overlayKeys = await media.list(OVERLAY_IMAGE_MEDIA_KEY_PREFIX);
  const keys = [...new Set([...overlayKeys, BACKGROUND_MEDIA_KEY])];
  const blobs = await Promise.all(keys.map((key) => media.load(key)));
  return new Map(
    keys.flatMap((key, index) => {
      const blob = blobs[index];
      return blob ? [[key, blob] as const] : [];
    }),
  );
}

async function restoreCurrentMedia(
  media: SceneMediaAdapter,
  snapshot: MediaSnapshot,
): Promise<void> {
  const currentOverlayKeys = await media.list(OVERLAY_IMAGE_MEDIA_KEY_PREFIX);
  const currentKeys = new Set([...currentOverlayKeys, BACKGROUND_MEDIA_KEY]);
  const keysToDelete = [...currentKeys].filter((key) => !snapshot.has(key));
  if (keysToDelete.length > 0) {
    await media.delete(keysToDelete);
  }
  for (const [key, blob] of snapshot) {
    await media.save(key, blob);
  }
}

function createDesiredMedia(
  scene: ScenePresetV1,
  assets: ReadonlyMap<string, SharedAssetRecord>,
): MediaSnapshot {
  const desired = new Map<string, Blob>();
  if (scene.appearance.background.source === 'asset') {
    const record = assets.get(scene.appearance.background.assetId);
    if (!record) {
      throw new Error('Preloaded background asset is unavailable.');
    }
    desired.set(BACKGROUND_MEDIA_KEY, record.blob);
  }

  scene.canvas.layers.forEach((layer) => {
    if (layer.kind !== 'decoration') {
      return;
    }
    const record = assets.get(layer.assetId);
    if (!record) {
      throw new Error(`Preloaded decoration asset is unavailable: ${layer.id}`);
    }
    desired.set(getOverlayMediaKey(layer.id), record.blob);
  });
  return desired;
}

async function replaceCurrentMedia(
  media: SceneMediaAdapter,
  desired: MediaSnapshot,
): Promise<void> {
  const currentOverlayKeys = await media.list(OVERLAY_IMAGE_MEDIA_KEY_PREFIX);
  const currentKeys = new Set([...currentOverlayKeys, BACKGROUND_MEDIA_KEY]);
  const keysToDelete = [...currentKeys].filter((key) => !desired.has(key));

  for (const [key, blob] of desired) {
    await media.save(key, blob);
  }
  if (keysToDelete.length > 0) {
    await media.delete(keysToDelete);
  }
}

async function createUniqueAssetId(
  dependencies: SceneRuntimeDependencies,
  occupiedIds: Set<string>,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
    const nonce = dependencies.createId();
    const assetId = `${SCENE_ASSET_ID_PREFIX}${nonce}`;
    if (
      nonce.trim() !== '' &&
      !occupiedIds.has(assetId) &&
      (await dependencies.assets.load(assetId)) === null
    ) {
      occupiedIds.add(assetId);
      return assetId;
    }
  }
  throw new Error('Could not create a unique Scene asset id.');
}

function createAssetRecord(
  id: string,
  blob: Blob,
  name: string,
  now: number,
  fallbackMediaType: string,
): SharedAssetRecord {
  if (blob.size <= 0) {
    throw new Error(`Scene media is empty: ${name}`);
  }
  return {
    blob,
    createdAt: new Date(now).toISOString(),
    id,
    mediaType: blob.type || fallbackMediaType,
    name,
    size: blob.size,
  };
}

async function prepareSceneAssets(
  snapshot: SceneRuntimeSnapshot,
  now: number,
  dependencies: SceneRuntimeDependencies,
): Promise<PreparedSceneAssets> {
  const overlayScene = parseOverlayScene(snapshot.overlayScene);
  const canvas = snapshot.canvas
    ? parseCanvasSceneV2(snapshot.canvas)
    : projectOverlaySceneToCanvasScene(overlayScene);
  const occupiedIds = new Set<string>();
  const records: SharedAssetRecord[] = [];
  const decorationAssetIds: Record<string, string> = {};
  let backgroundAssetId: string | undefined;

  if (snapshot.backgroundMeta?.source === 'file') {
    const blob = await dependencies.media.load(BACKGROUND_MEDIA_KEY);
    if (!blob) {
      throw new Error('The current file background is missing.');
    }
    backgroundAssetId = await createUniqueAssetId(dependencies, occupiedIds);
    records.push(
      createAssetRecord(
        backgroundAssetId,
        blob,
        'background',
        now,
        `${snapshot.backgroundMeta.type}/*`,
      ),
    );
  }

  for (const layer of canvas.layers) {
    if (layer.kind !== 'decoration') {
      continue;
    }
    const blob = await dependencies.media.load(getOverlayMediaKey(layer.id));
    if (!blob) {
      throw new Error(`The current decoration media is missing: ${layer.id}`);
    }
    const assetId = await createUniqueAssetId(dependencies, occupiedIds);
    decorationAssetIds[layer.id] = assetId;
    records.push(
      createAssetRecord(
        assetId,
        blob,
        layer.name || layer.id,
        now,
        layer.mediaType === 'video' ? 'video/*' : 'image/*',
      ),
    );
  }

  return {
    records,
    references: {
      ...(backgroundAssetId === undefined ? {} : { backgroundAssetId }),
      decorationAssetIds,
    },
  };
}

async function restoreAssetRecords(
  dependencies: SceneRuntimeDependencies,
  previousRecords: ReadonlyMap<string, SharedAssetRecord | null>,
): Promise<void> {
  for (const [assetId, previous] of [...previousRecords].reverse()) {
    if (previous) {
      await dependencies.assets.save(previous);
    } else {
      await dependencies.assets.delete(assetId);
    }
  }
}

async function createRecoveryBookmarkChildren(
  children: readonly SceneRecoveryBookmarkNodeV1[],
  parentId: string,
  gateway: SceneBookmarkGateway,
  identityMap: Map<string, string>,
): Promise<void> {
  for (const child of children) {
    const created = await gateway.create({
      parentId,
      title: child.title,
      ...(child.url === undefined ? {} : { url: child.url }),
    });
    if (child.sourceId !== undefined) {
      identityMap.set(child.sourceId, created.id);
    }
    if (child.url === undefined) {
      await createRecoveryBookmarkChildren(
        child.children ?? [],
        created.id,
        gateway,
        identityMap,
      );
    }
  }
}

async function rollbackRestoredBookmarkFolder(
  restored: RestoredBookmarkFolder,
  gateway: SceneBookmarkGateway,
): Promise<void> {
  await gateway.removeTree(restored.createdContainerId ?? restored.folderId);
}

async function restoreBookmarkFolderFromSnapshot(
  snapshot: SceneRecoveryBookmarkSnapshotV1,
  bookmarks: SceneBookmarkResourceAdapter,
): Promise<RestoredBookmarkFolder> {
  const gateway = getBookmarkRecoveryGateway(bookmarks);
  if (!gateway) {
    throw new Error('Bookmark recovery is unavailable.');
  }

  let container = await loadWritableBookmarkFolder(
    snapshot.containerId,
    gateway,
  );
  let createdContainerId: string | null = null;
  let createdFolderId: string | null = null;

  try {
    if (!container) {
      const destination = await findBookmarkRestoreDestination(
        snapshot,
        gateway,
      );
      if (!destination) {
        throw new Error('No writable bookmark destination is available.');
      }
      const siblings = await gateway.getChildren(destination.id);
      container =
        siblings.find(
          (node) =>
            node.url === undefined &&
            node.unmodifiable !== 'managed' &&
            node.title === snapshot.containerTitle,
        ) ??
        (await gateway.create({
          parentId: destination.id,
          title: snapshot.containerTitle,
        }));
      if (!siblings.some((node) => node.id === container?.id)) {
        createdContainerId = container.id;
      }
    }

    const folder = await gateway.create({
      parentId: container.id,
      title: snapshot.folder.title,
    });
    createdFolderId = folder.id;
    const identityMap = new Map<string, string>();
    if (snapshot.folder.sourceId !== undefined) {
      identityMap.set(snapshot.folder.sourceId, folder.id);
    }
    await createRecoveryBookmarkChildren(
      snapshot.folder.children ?? [],
      folder.id,
      gateway,
      identityMap,
    );

    return {
      createdContainerId,
      folderId: folder.id,
      folderPath: [...snapshot.folderPath],
      identityMap,
    };
  } catch (error) {
    const cleanupId = createdContainerId ?? createdFolderId;
    if (cleanupId !== null) {
      try {
        await gateway.removeTree(cleanupId);
      } catch (cleanupError) {
        throw new Error(
          `Bookmark recovery failed (${getErrorMessage(error)}) and compensation also failed.`,
          { cause: cleanupError },
        );
      }
    }
    throw error;
  }
}

async function restoreSceneFromDefaultSnapshot(
  scene: ScenePresetV1,
  dependencies: SceneRuntimeDependencies,
): Promise<SceneCollectionV3> {
  const snapshot = await loadSceneRecoverySnapshot(scene, dependencies);
  if (!snapshot) {
    throw new Error('Scene recovery snapshot is unavailable.');
  }

  const snapshotAssets = new Map(
    snapshot.assets.map((asset) => [asset.id, asset] as const),
  );
  const previousRecords = new Map<string, SharedAssetRecord | null>();
  const assetsToRestore: SharedAssetRecord[] = [];
  for (const assetId of getSceneAssetIds(scene)) {
    const current = await dependencies.assets.load(assetId);
    if (isUsableAssetRecord(current, assetId)) {
      continue;
    }
    const recoveryAsset = snapshotAssets.get(assetId) ?? null;
    if (!isUsableAssetRecord(recoveryAsset, assetId)) {
      throw new Error(`Scene recovery asset is unavailable: ${assetId}`);
    }
    previousRecords.set(assetId, current);
    assetsToRestore.push(recoveryAsset);
  }

  const folderId = scene.bookmarkCollection.folderId;
  const shouldRestoreFolder =
    folderId !== null && !(await dependencies.bookmarks.exists(folderId));
  if (
    shouldRestoreFolder &&
    !(await canRestoreBookmarkSnapshot(
      snapshot.bookmark,
      dependencies.bookmarks,
    ))
  ) {
    throw new Error('Scene bookmark recovery destination is unavailable.');
  }

  let restoredBookmark: RestoredBookmarkFolder | null = null;
  let nextCollection: SceneCollectionV3 | null = null;
  const assetSteps: TransactionStep[] =
    assetsToRestore.length === 0
      ? []
      : [
          createSelfRestoringStep(
            'Scene recovery asset restore',
            async (): Promise<void> => {
              for (const asset of assetsToRestore) {
                await dependencies.assets.save(asset);
              }
            },
            () => restoreAssetRecords(dependencies, previousRecords),
          ),
        ];
  const bookmarkSteps: TransactionStep[] = shouldRestoreFolder
    ? [
        createSelfRestoringStep(
          'Scene recovery bookmark restore',
          async (): Promise<void> => {
            restoredBookmark = await restoreBookmarkFolderFromSnapshot(
              snapshot.bookmark,
              dependencies.bookmarks,
            );
          },
          async (): Promise<void> => {
            if (restoredBookmark) {
              const gateway = getBookmarkRecoveryGateway(
                dependencies.bookmarks,
              );
              if (!gateway) {
                throw new Error('Bookmark recovery rollback is unavailable.');
              }
              await rollbackRestoredBookmarkFolder(restoredBookmark, gateway);
            }
          },
        ),
      ]
    : [];

  if (assetSteps.length === 0 && bookmarkSteps.length === 0) {
    return dependencies.repository.load();
  }

  await runStorageTransaction({
    commit: async (): Promise<void> => {
      const restored = parseScenePresetV1({
        ...structuredClone(scene),
        bookmarkCollection: restoredBookmark
          ? (() => {
              const preferences =
                restoredBookmark.identityMap.size === 0
                  ? {
                      groupPreferences: structuredClone(
                        scene.bookmarkCollection.groupPreferences,
                      ),
                      siblingOrder: structuredClone(
                        scene.bookmarkCollection.siblingOrder,
                      ),
                    }
                  : remapBookmarkPreferences(
                      scene.bookmarkCollection,
                      restoredBookmark.identityMap,
                    );
              return {
                ...scene.bookmarkCollection,
                ...preferences,
                folderId: restoredBookmark.folderId,
                folderPath: restoredBookmark.folderPath,
              };
            })()
          : scene.bookmarkCollection,
        updatedAt: Math.max(scene.updatedAt, dependencies.now()),
      });
      nextCollection = await dependencies.repository.upsertScene(
        restored,
        false,
      );
    },
    steps: [...assetSteps, ...bookmarkSteps],
  });

  if (nextCollection === null) {
    throw new Error('Scene repository did not save restored resources.');
  }
  return nextCollection;
}

function attachRecoverySnapshot(
  collection: SceneBookmarkCollectionV1,
  sceneId: string,
  dependencies: SceneRuntimeDependencies,
  replaceExisting = false,
): SceneBookmarkCollectionV1 {
  if (!dependencies.recovery) {
    return structuredClone(collection);
  }
  if (collection.folderOwnership !== 'scene' || collection.folderId === null) {
    return {
      ...structuredClone(collection),
      recoverySnapshotId: undefined,
    };
  }

  return {
    ...structuredClone(collection),
    recoverySnapshotId:
      replaceExisting || collection.recoverySnapshotId === undefined
        ? createSceneRecoverySnapshotId(sceneId)
        : collection.recoverySnapshotId,
  };
}

async function restoreRecoveryRecord(
  repository: SceneRecoveryRepository,
  snapshotId: string,
  previous: SceneRecoverySnapshotV1 | null,
): Promise<void> {
  if (previous) {
    await repository.save(previous);
  } else {
    await repository.delete(snapshotId);
  }
}

async function persistSceneWithAssets(
  scene: ScenePresetV1,
  records: readonly SharedAssetRecord[],
  makeActive: boolean,
  dependencies: SceneRuntimeDependencies,
): Promise<SceneCollectionV3> {
  const previousRecords = new Map(
    await Promise.all(
      records.map(
        async (record) =>
          [record.id, await dependencies.assets.load(record.id)] as const,
      ),
    ),
  );
  const recoverySnapshotId = scene.bookmarkCollection.recoverySnapshotId;
  const recoveryRepository = dependencies.recovery;
  const previousRecovery =
    recoveryRepository && recoverySnapshotId
      ? await recoveryRepository.load(recoverySnapshotId)
      : null;
  let collection: SceneCollectionV3 | null = null;
  const assetSteps =
    records.length === 0
      ? []
      : [
          createSelfRestoringStep(
            'Scene asset write',
            async (): Promise<void> => {
              for (const record of records) {
                await dependencies.assets.save(record);
              }
            },
            () => restoreAssetRecords(dependencies, previousRecords),
          ),
        ];
  const recoverySteps: TransactionStep[] =
    recoveryRepository && recoverySnapshotId
      ? [
          createSelfRestoringStep(
            'Scene recovery snapshot write',
            async (): Promise<void> => {
              const snapshot = await captureSceneRecoverySnapshot(
                scene,
                dependencies,
              );
              await recoveryRepository.save(snapshot);
            },
            () =>
              restoreRecoveryRecord(
                recoveryRepository,
                recoverySnapshotId,
                previousRecovery,
              ),
          ),
        ]
      : [];

  await runStorageTransaction({
    commit: async (): Promise<void> => {
      collection = await dependencies.repository.upsertScene(scene, makeActive);
    },
    steps: [...assetSteps, ...recoverySteps],
  });
  if (collection === null) {
    throw new Error('Scene repository did not return the saved collection.');
  }
  return collection;
}

async function deleteOrphanedPreviousSceneAssets(
  previous: ScenePresetV1,
  collection: SceneCollectionV3,
  dependencies: SceneRuntimeDependencies,
): Promise<void> {
  const retainedAssetIds = new Set(collection.scenes.flatMap(getSceneAssetIds));
  const orphanedAssetIds = getSceneAssetIds(previous).filter(
    (assetId) => !retainedAssetIds.has(assetId),
  );
  await runPostCommitCleanup(
    orphanedAssetIds.map(
      (assetId) => () => dependencies.assets.delete(assetId),
    ),
    'Scene asset cleanup failed.',
  );
}

function reportPostCommitCleanupFailures(
  results: readonly PromiseSettledResult<void>[],
  message: string,
): void {
  const failures = results.flatMap((result) =>
    result.status === 'rejected' ? [result.reason as unknown] : [],
  );
  if (failures.length > 0 && typeof globalThis.reportError === 'function') {
    globalThis.reportError(new AggregateError(failures, message));
  }
}

async function runPostCommitCleanup(
  operations: readonly (() => Promise<void>)[],
  message: string,
): Promise<void> {
  const results = await Promise.allSettled(
    operations.map((operation) => Promise.resolve().then(operation)),
  );
  reportPostCommitCleanupFailures(results, message);
}

async function deleteUnreferencedPreviousRecoverySnapshot(
  previous: ScenePresetV1,
  collection: SceneCollectionV3,
  dependencies: SceneRuntimeDependencies,
): Promise<void> {
  const snapshotId = previous.bookmarkCollection.recoverySnapshotId;
  const recovery = dependencies.recovery;
  if (
    !recovery ||
    snapshotId === undefined ||
    collection.scenes.some(
      (scene) => scene.bookmarkCollection.recoverySnapshotId === snapshotId,
    )
  ) {
    return;
  }

  await runPostCommitCleanup(
    [() => recovery.delete(snapshotId)],
    'Scene recovery snapshot cleanup failed.',
  );
}

async function deleteSceneWithRecovery(
  scene: ScenePresetV1,
  collection: SceneCollectionV3,
  dependencies: SceneRuntimeDependencies,
): Promise<SceneCollectionV3> {
  const snapshotId = scene.bookmarkCollection.recoverySnapshotId;
  const recoveryRepository = dependencies.recovery;
  const isSharedSnapshot = collection.scenes.some(
    (candidate) =>
      candidate.id !== scene.id &&
      candidate.bookmarkCollection.recoverySnapshotId === snapshotId,
  );
  if (!recoveryRepository || snapshotId === undefined || isSharedSnapshot) {
    return dependencies.repository.deleteScene(scene.id);
  }

  const previous = await recoveryRepository.load(snapshotId);
  let nextCollection: SceneCollectionV3 | null = null;
  await runStorageTransaction({
    commit: async (): Promise<void> => {
      nextCollection = await dependencies.repository.deleteScene(scene.id);
    },
    steps: [
      createSelfRestoringStep(
        'Scene recovery snapshot delete',
        () => recoveryRepository.delete(snapshotId),
        () => restoreRecoveryRecord(recoveryRepository, snapshotId, previous),
      ),
    ],
  });
  if (nextCollection === null) {
    throw new Error('Scene repository did not delete the Scene.');
  }
  return nextCollection;
}

async function preloadScene(
  scene: ScenePresetV1,
  dependencies: SceneRuntimeDependencies,
): Promise<PreloadedScene> {
  const assetIds = getSceneAssetIds(scene);
  const records = await Promise.all(
    assetIds.map(
      async (assetId) =>
        [assetId, await dependencies.assets.load(assetId)] as const,
    ),
  );
  const assets = new Map(
    records.flatMap(([assetId, record]) =>
      isUsableAssetRecord(record, assetId) ? [[assetId, record] as const] : [],
    ),
  );
  const folderId = scene.bookmarkCollection.folderId;
  const hasFolder =
    folderId === null ? true : await dependencies.bookmarks.exists(folderId);
  const availableResources = {
    assetIds: new Set(assets.keys()),
    folderIds: new Set<string>(
      hasFolder && folderId !== null ? [folderId] : [],
    ),
  };
  const currentReadiness = getSceneReadiness(scene, availableResources);
  if (currentReadiness.isReady) {
    return { assets, readiness: currentReadiness };
  }

  const [defaultRecovery, injectedRecovery] = await Promise.all([
    getDefaultRecoveryAvailability(scene, dependencies),
    dependencies.getRecoveryAvailability?.(scene),
  ]);
  const recovery = mergeRecoveryAvailability(defaultRecovery, injectedRecovery);
  const readiness = getSceneReadiness(scene, {
    ...availableResources,
    recoverableAssetIds: recovery.recoverableAssetIds,
    recoverySnapshotIds: recovery.recoverySnapshotIds,
  });

  return { assets, readiness };
}

function createDefaultDependencies(): SceneRuntimeDependencies {
  const bookmarkGateway = createChromeSceneBookmarkGateway();

  return {
    assets: {
      delete: (assetId) =>
        deleteIndexedRecord(SHARED_ASSET_STORE_NAME, assetId),
      load: loadSharedAsset,
      save: saveSharedAsset,
    },
    bookmarks: {
      ...bookmarkGateway,
      exists: async (folderId): Promise<boolean> => {
        if (typeof chrome === 'undefined' || !chrome.bookmarks?.getSubTree) {
          return false;
        }
        try {
          const nodes = await chrome.bookmarks.getSubTree(folderId);
          const folder = nodes.find((node) => node.id === folderId);
          return Boolean(folder && folder.url === undefined);
        } catch {
          return false;
        }
      },
    },
    createId: () => crypto.randomUUID(),
    local: storage.local,
    media: {
      delete: deleteMediaBatch,
      list: listMediaKeys,
      load: loadMediaBlob,
      save: async (key, blob): Promise<void> => {
        await saveMedia(key, blob);
      },
    },
    now: () => Date.now(),
    recovery: sceneRecoveryRepository,
    repository: sceneRepository,
    sync: storage.sync,
  };
}

export function createSceneRuntime(
  dependencies: SceneRuntimeDependencies,
): SceneRuntime {
  async function createScene(
    snapshot: SceneRuntimeSnapshot,
    options: CreateSceneOptions,
  ): Promise<SceneCollectionV3> {
    assertSceneOwnedBookmarkCollection(options.bookmarkCollection);
    const current = await dependencies.repository.load();
    const folderId = options.bookmarkCollection.folderId;
    assertBookmarkFolderIsUnclaimed(current, folderId);
    const sceneId = resolveNewSceneId(options.id, current, dependencies);
    const now = dependencies.now();
    const prepared = await prepareSceneAssets(snapshot, now, dependencies);
    const scene = createScenePresetSnapshot(snapshot, {
      assetReferences: prepared.references,
      bookmarkCollection: attachRecoverySnapshot(
        options.bookmarkCollection,
        sceneId,
        dependencies,
        true,
      ),
      id: sceneId,
      name: options.name,
      now,
    });
    return persistSceneWithAssets(
      scene,
      prepared.records,
      options.makeActive ?? true,
      dependencies,
    );
  }

  async function updateScene(
    sceneId: string,
    snapshot: SceneRuntimeSnapshot,
    options: UpdateSceneOptions = {},
  ): Promise<SceneCollectionV3> {
    const current = await dependencies.repository.load();
    const previous = getSceneById(current, sceneId);
    const now = Math.max(dependencies.now(), previous.updatedAt);
    const bookmarkCollection = createUpdatedBookmarkCollection(
      previous,
      snapshot,
      current,
    );
    const prepared = await prepareSceneAssets(snapshot, now, dependencies);
    const scene = createScenePresetSnapshot(snapshot, {
      assetReferences: prepared.references,
      bookmarkCollection: attachRecoverySnapshot(
        bookmarkCollection,
        previous.id,
        dependencies,
      ),
      createdAt: previous.createdAt,
      id: previous.id,
      name: options.name ?? previous.name,
      now,
    });
    const next = await persistSceneWithAssets(
      scene,
      prepared.records,
      false,
      dependencies,
    );
    await Promise.all([
      deleteOrphanedPreviousSceneAssets(previous, next, dependencies),
      deleteUnreferencedPreviousRecoverySnapshot(previous, next, dependencies),
    ]);
    return next;
  }

  async function duplicateScene(
    sceneId: string,
    options: DuplicateSceneOptions,
  ): Promise<SceneCollectionV3> {
    assertSceneOwnedBookmarkCollection(options.bookmarkCollection);
    const current = await dependencies.repository.load();
    const source = getSceneById(current, sceneId);
    const folderId = options.bookmarkCollection.folderId;
    assertBookmarkFolderIsUnclaimed(current, folderId);
    const duplicateId = resolveNewSceneId(options.id, current, dependencies);
    const now = dependencies.now();
    const duplicate = parseScenePresetV1({
      ...structuredClone(source),
      bookmarkCollection: attachRecoverySnapshot(
        options.bookmarkCollection,
        duplicateId,
        dependencies,
        true,
      ),
      createdAt: now,
      id: duplicateId,
      name: options.name,
      updatedAt: now,
    });
    return persistSceneWithAssets(
      duplicate,
      [],
      options.makeActive ?? true,
      dependencies,
    );
  }

  async function getReadinessForId(sceneId: string): Promise<SceneReadiness> {
    const collection = await dependencies.repository.load();
    const scene = getSceneById(collection, sceneId);
    return (await preloadScene(scene, dependencies)).readiness;
  }

  async function applyScene(sceneId: string): Promise<SceneCollectionV3> {
    const collection = await dependencies.repository.load();
    const scene = getSceneById(collection, sceneId);
    const preloaded = await preloadScene(scene, dependencies);
    if (!preloaded.readiness.isReady) {
      throw new Error('Scene resources are missing.', {
        cause: preloaded.readiness,
      });
    }

    const [syncSnapshot, localSnapshot, mediaSnapshot] = await Promise.all([
      snapshotStorageArea(dependencies.sync, SYNC_SCENE_STORAGE_KEYS),
      snapshotStorageArea(dependencies.local, LOCAL_SCENE_KEYS),
      snapshotCurrentMedia(dependencies.media),
    ]);
    const desiredMedia = createDesiredMedia(scene, preloaded.assets);
    const overlayScene = projectCanvasSceneToOverlayScene(scene.canvas);
    const localUpdates = {
      ...createLocalSceneUpdates(scene, syncSnapshot.settings),
      [OVERLAY_SCENE_STORAGE_KEY]: overlayScene,
    };
    const globalSettingsUpdate = createGlobalSettingsUpdate(
      syncSnapshot.settings,
    );
    let nextCollection: SceneCollectionV3 | null = null;

    await runStorageTransaction({
      commit: async (): Promise<void> => {
        nextCollection = await dependencies.repository.setActiveSceneId(
          scene.id,
        );
      },
      steps: [
        createSelfRestoringStep(
          'Scene media apply',
          () => replaceCurrentMedia(dependencies.media, desiredMedia),
          () => restoreCurrentMedia(dependencies.media, mediaSnapshot),
        ),
        createSelfRestoringStep(
          'Scene local state apply',
          () => dependencies.local.set(localUpdates),
          () => restoreStorageArea(dependencies.local, localSnapshot),
        ),
        createSelfRestoringStep(
          'Scene global settings write',
          () => dependencies.sync.set(globalSettingsUpdate),
          () => restoreStorageArea(dependencies.sync, syncSnapshot),
        ),
      ],
    });

    if (nextCollection === null) {
      throw new Error('Scene repository did not activate the Scene.');
    }
    return nextCollection;
  }

  async function relinkScene(
    sceneId: string,
    input: SceneRelinkInput,
  ): Promise<SceneCollectionV3> {
    const collection = await dependencies.repository.load();
    const current = getSceneById(collection, sceneId);
    const assetIds = input.assetIds ?? {};
    if (input.folder) {
      assertBookmarkFolderIsUnclaimed(collection, input.folder.id, current.id);
    }
    const background =
      current.appearance.background.source === 'asset'
        ? {
            ...current.appearance.background,
            assetId:
              assetIds[current.appearance.background.assetId] ??
              current.appearance.background.assetId,
          }
        : current.appearance.background;
    const scene = parseScenePresetV1({
      ...structuredClone(current),
      appearance: { ...current.appearance, background },
      bookmarkCollection: createRelinkedBookmarkCollection(
        current.bookmarkCollection,
        input.folder,
      ),
      canvas: {
        ...current.canvas,
        layers: current.canvas.layers.map((layer) =>
          layer.kind === 'decoration'
            ? { ...layer, assetId: assetIds[layer.assetId] ?? layer.assetId }
            : layer,
        ),
      },
      updatedAt: Math.max(current.updatedAt, dependencies.now()),
    });
    const readiness = (await preloadScene(scene, dependencies)).readiness;
    if (!readiness.isReady) {
      throw new Error('Relinked Scene resources are still missing.', {
        cause: readiness,
      });
    }
    const next = await persistSceneWithAssets(scene, [], false, dependencies);
    await deleteUnreferencedPreviousRecoverySnapshot(
      current,
      next,
      dependencies,
    );
    return next;
  }

  async function restoreScene(sceneId: string): Promise<SceneCollectionV3> {
    const collection = await dependencies.repository.load();
    const current = getSceneById(collection, sceneId);
    if (!dependencies.restoreResources) {
      if (!dependencies.recovery) {
        throw new Error('Scene restore is not configured.');
      }
      return restoreSceneFromDefaultSnapshot(current, dependencies);
    }
    const restored = parseScenePresetV1(
      await dependencies.restoreResources(current),
    );
    if (restored.id !== current.id) {
      throw new Error('A restored Scene must keep its original id.');
    }
    const readiness = (await preloadScene(restored, dependencies)).readiness;
    if (!readiness.isReady) {
      throw new Error('Restored Scene resources are still missing.', {
        cause: readiness,
      });
    }
    return dependencies.repository.upsertScene(
      parseScenePresetV1({
        ...restored,
        updatedAt: Math.max(
          current.updatedAt,
          restored.createdAt,
          restored.updatedAt,
          dependencies.now(),
        ),
      }),
      false,
    );
  }

  async function deleteScene(
    sceneId: string,
    options: DeleteSceneOptions = {},
  ): Promise<SceneCollectionV3> {
    const current = await dependencies.repository.load();
    const scene = getSceneById(current, sceneId);
    const next = await deleteSceneWithRecovery(scene, current, dependencies);

    if (options.deleteAssets ?? true) {
      await deleteOrphanedPreviousSceneAssets(scene, next, dependencies);
    }
    if (
      options.deleteBookmarkFolder &&
      scene.bookmarkCollection.folderOwnership === 'scene' &&
      scene.bookmarkCollection.folderId !== null &&
      !next.scenes.some(
        (retainedScene) =>
          retainedScene.bookmarkCollection.folderId ===
          scene.bookmarkCollection.folderId,
      )
    ) {
      const folderId = scene.bookmarkCollection.folderId;
      await runPostCommitCleanup(
        [() => dependencies.bookmarks.removeTree(folderId)],
        'Scene bookmark folder cleanup failed.',
      );
    }
    return next;
  }

  return {
    applyScene,
    createScene,
    deleteScene,
    duplicateScene,
    getReadiness: getReadinessForId,
    load: dependencies.repository.load,
    relinkScene,
    restoreScene,
    updateScene,
  };
}

export const sceneRuntime = createSceneRuntime(createDefaultDependencies());
