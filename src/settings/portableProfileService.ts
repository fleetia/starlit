import {
  DEFAULT_BOOKMARK_TREE_PREFS,
  type BookmarkTreePrefs,
} from '../bookmarks/storageDecoders';
import {
  DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE,
  findDefaultSceneBookmarkParent,
  migrateLegacySceneCollection,
  createSceneRecoverySnapshotId,
  remapBookmarkPreferences,
  SCENE_RECOVERY_SNAPSHOT_VERSION,
  SCENE_STORAGE_SCHEMA_VERSION,
  type SceneBookmarkGateway,
  type SceneBookmarkNode,
  type SceneCollectionV3,
  type SceneRecoveryBookmarkNodeV1,
  type SceneRecoverySnapshotV1,
  type ScenePresetV1,
} from '../scenes';
import { EMPTY_OVERLAY_SCENE, getOverlayImageLayers } from '../overlays/model';
import { processOverlayMedia } from '../overlays/processOverlayMedia';
import { createChromeSceneBookmarkGateway } from '../platform/bookmarks/sceneBookmarkGateway';
import {
  deleteIndexedRecord,
  loadSharedAsset,
  saveSharedAsset,
  type SharedAssetRecord,
} from '../platform/storage/indexedDbRecords';
import { SHARED_ASSET_STORE_NAME } from '../platform/storage/mediaStorage';
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
  createSelfRestoringTransactionStep as createSelfRestoringStorageStep,
  runStorageTransaction,
} from '../platform/storage/transactionCoordinator';
import {
  BACKUP_SCHEMA_VERSION,
  LEGACY_OVERLAY_BACKUP_SCHEMA_VERSION,
  parseExportData,
  validateOverlayMedia,
  type ImportData,
  type LegacyExportData,
  type V1ExportData,
  type V2ExportData,
  type V3ExportData,
} from './backupSchema';
import type { BackgroundMedia } from './backgroundMedia';
import { DEFAULT_ICON_SIZE, DEFAULT_SIZE } from './defaults';
import { normalizeSettings } from './normalizeSettings';
import {
  PORTABLE_PROFILE_SCHEMA_VERSION,
  getPortableProfileDiff,
  parsePortableProfileV4,
  planPortableProfileImport,
  portableDataUrlToBlob,
  type PortableAsset,
  type PortableBookmarkNode,
  type PortableBookmarkTree,
  type PortableGlobalPreferences,
  type PortableProfileCategories,
  type PortableProfileV4,
  type SceneConflictChoice,
  type SceneImportDiff,
} from './portableProfile';

const DEFAULT_LOCALE = 'ko';
const MAX_ID_GENERATION_ATTEMPTS = 100;

export const DEFAULT_PORTABLE_EXPORT_CATEGORIES: PortableProfileCategories = {
  bookmarkUrls: false,
  media: false,
  scenes: true,
};

type StoredArea = {
  get: (key: string) => Promise<unknown>;
  remove: (keys: string | string[]) => Promise<void>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

type PortableAssetStore = {
  delete: (id: string) => Promise<void>;
  load: (id: string) => Promise<SharedAssetRecord | null>;
  save: (asset: SharedAssetRecord) => Promise<void>;
};

export type PortableProfileServiceDependencies = {
  assets: PortableAssetStore;
  bookmarks: SceneBookmarkGateway;
  createId: () => string;
  local: StoredArea;
  now: () => Date;
  processMedia: typeof processOverlayMedia;
  recovery: SceneRecoveryRepository;
  repository: SceneRepository;
  sync: StoredArea;
};

export type PortableExportOptions = PortableProfileCategories;

export type PortableImportOptions = {
  conflictChoices: Readonly<Record<string, SceneConflictChoice>>;
  destinationParentId?: string;
};

export type PortableImportPreview = {
  diffs: SceneImportDiff[];
  profile: PortableProfileV4;
};

type PreparedBookmarkFolder = {
  containerFolderId: string;
  identityMap: ReadonlyMap<string, string>;
  sceneFolderId: string;
  wasContainerCreated: boolean;
};

type PreparedBookmarkResources = {
  containerFolderId: string | null;
  sceneFolderId: string | null;
  wasContainerCreated: boolean;
};

type PreparedScene = {
  assetIds: string[];
  bookmarkFolder: PreparedBookmarkFolder | null;
  bookmarkResources: PreparedBookmarkResources | null;
  recoverySnapshotId: string | null;
  scene: ScenePresetV1;
  sourceSceneId: string;
};

type LegacyBackupData =
  | LegacyExportData
  | V1ExportData
  | V2ExportData
  | V3ExportData;

type LegacyMediaConversion = {
  assets: Record<string, PortableAsset>;
  backgroundAssetId?: string;
  backgroundMeta: BackgroundMedia | null;
};

function createDefaultDependencies(): PortableProfileServiceDependencies {
  return {
    assets: {
      delete: (id) => deleteIndexedRecord(SHARED_ASSET_STORE_NAME, id),
      load: loadSharedAsset,
      save: saveSharedAsset,
    },
    bookmarks: createChromeSceneBookmarkGateway(),
    createId: () => crypto.randomUUID(),
    local: storage.local,
    now: () => new Date(),
    processMedia: processOverlayMedia,
    recovery: sceneRecoveryRepository,
    repository: sceneRepository,
    sync: storage.sync,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Portable asset could not be encoded.'));
    };
    reader.onerror = () =>
      reject(new Error('Portable asset could not be read.'));
    reader.readAsDataURL(blob);
  });
}

function isPortableProfile(data: ImportData): data is PortableProfileV4 {
  return data.schemaVersion === BACKUP_SCHEMA_VERSION;
}

function isVersionedLegacyBackup(
  data: LegacyBackupData,
): data is V2ExportData | V3ExportData {
  return data.schemaVersion === 2 || data.schemaVersion === 3;
}

function getLegacyBackupVersion(data: LegacyBackupData): 1 | 2 | 3 {
  if (data.schemaVersion === LEGACY_OVERLAY_BACKUP_SCHEMA_VERSION) return 3;
  if (data.schemaVersion === 2) return 2;
  return 1;
}

function getLegacyBookmarkTreePrefs(data: LegacyBackupData): BookmarkTreePrefs {
  return isVersionedLegacyBackup(data)
    ? data.bookmarkTreePrefs
    : DEFAULT_BOOKMARK_TREE_PREFS;
}

function getCompatibleFileBackground(
  data: LegacyBackupData,
  sceneId: string,
  occupiedAssetIds: ReadonlySet<string>,
): LegacyMediaConversion {
  const backgroundMeta = data.backgroundMeta;
  if (backgroundMeta === null || backgroundMeta === undefined) {
    return { assets: {}, backgroundMeta: null };
  }
  if (backgroundMeta.source === 'url') {
    return { assets: {}, backgroundMeta };
  }
  if (data.backgroundData === undefined) {
    return { assets: {}, backgroundMeta: null };
  }

  try {
    const blob = portableDataUrlToBlob(data.backgroundData);
    if (!blob.type.startsWith(`${backgroundMeta.type}/`)) {
      return { assets: {}, backgroundMeta: null };
    }

    const assetIdBase = `${sceneId}:background`;
    let assetId = assetIdBase;
    let suffix = 2;
    while (occupiedAssetIds.has(assetId)) {
      assetId = `${assetIdBase}-${suffix}`;
      suffix += 1;
    }
    return {
      assets: {
        [assetId]: {
          dataUrl: data.backgroundData,
          id: assetId,
          mediaType: blob.type,
          name: `Imported background (${backgroundMeta.type})`,
        },
      },
      backgroundAssetId: assetId,
      backgroundMeta,
    };
  } catch {
    return { assets: {}, backgroundMeta: null };
  }
}

function getLegacyOverlayAssets(data: LegacyBackupData): PortableAsset[] {
  if (data.schemaVersion !== LEGACY_OVERLAY_BACKUP_SCHEMA_VERSION) return [];

  return getOverlayImageLayers(data.overlayScene).map((image) => {
    const dataUrl = data.overlayMedia[image.id];
    if (!dataUrl) {
      throw new Error(`Legacy overlay media is missing: ${image.id}`);
    }
    const blob = portableDataUrlToBlob(dataUrl);

    return {
      dataUrl,
      id: image.id,
      mediaType: blob.type,
      name: image.name || image.id,
    };
  });
}

function convertLegacyBackup(
  data: LegacyBackupData,
  now: Date,
): PortableProfileV4 {
  const version = getLegacyBackupVersion(data);
  const sceneId = `legacy-backup-v${version}`;
  const overlayAssets = getLegacyOverlayAssets(data);
  const background = getCompatibleFileBackground(
    data,
    sceneId,
    new Set(overlayAssets.map((asset) => asset.id)),
  );
  const assets = Object.fromEntries([
    ...Object.entries(background.assets),
    ...overlayAssets.map((asset) => [asset.id, asset] as const),
  ]);
  const timestamp = now.getTime();
  const collection = migrateLegacySceneCollection(
    {
      backgroundMeta: background.backgroundMeta,
      bookmarkTreePrefs: getLegacyBookmarkTreePrefs(data),
      colorTheme: data.colorTheme,
      customCSS: data.customCSS ?? '',
      gridSettings: data.gridSettings,
      groupPreferences: isVersionedLegacyBackup(data)
        ? data.groupPreferences
        : [],
      iconSize: isVersionedLegacyBackup(data)
        ? data.iconSize
        : DEFAULT_ICON_SIZE,
      overlayScene:
        data.schemaVersion === LEGACY_OVERLAY_BACKUP_SCHEMA_VERSION
          ? data.overlayScene
          : EMPTY_OVERLAY_SCENE,
      settings: data.settings,
      size: isVersionedLegacyBackup(data) ? data.size : DEFAULT_SIZE,
    },
    {
      ...(background.backgroundAssetId === undefined
        ? {}
        : { backgroundAssetId: background.backgroundAssetId }),
      id: sceneId,
      name: `Imported v${version} setup`,
      now: timestamp,
    },
  );
  const scene = collection.scenes[0];
  if (!scene)
    throw new Error('Legacy backup could not be converted to a Scene.');
  const hasMedia = Object.keys(assets).length > 0;

  return parsePortableProfileV4({
    ...(hasMedia ? { assets } : {}),
    categories: { bookmarkUrls: false, media: hasMedia, scenes: true },
    exportedAt: now.toISOString(),
    globalPreferences: {
      isOpenInNewTab: data.settings.isOpenInNewTab,
      locale: isVersionedLegacyBackup(data) ? data.locale : DEFAULT_LOCALE,
    },
    schemaVersion: PORTABLE_PROFILE_SCHEMA_VERSION,
    scenes: [createPortableScene(scene, new Map())],
  });
}

export async function convertBackupToPortableProfileV4(
  value: unknown,
  now: () => Date = () => new Date(),
): Promise<PortableProfileV4> {
  const data = parseExportData(value);
  if (isPortableProfile(data)) return data;
  if (data.schemaVersion === LEGACY_OVERLAY_BACKUP_SCHEMA_VERSION) {
    await validateOverlayMedia(data);
  }
  return convertLegacyBackup(data, now());
}

function toPortableBookmarkNode(
  node: SceneBookmarkNode,
  indexPath: readonly number[],
  identityMap: Map<string, string>,
): PortableBookmarkNode {
  const id = `node:${indexPath.join('.')}`;
  identityMap.set(node.id, id);
  if (node.url !== undefined) {
    return { id, title: node.title, url: node.url };
  }

  return {
    children: (node.children ?? []).map((child, index) =>
      toPortableBookmarkNode(child, [...indexPath, index], identityMap),
    ),
    id,
    title: node.title,
  };
}

function toPortableBookmarkTree(folder: SceneBookmarkNode): {
  identityMap: ReadonlyMap<string, string>;
  tree: PortableBookmarkTree;
} {
  const identityMap = new Map<string, string>([[folder.id, 'root']]);
  return {
    identityMap,
    tree: {
      children: (folder.children ?? []).map((child, index) =>
        toPortableBookmarkNode(child, [index], identityMap),
      ),
      rootId: 'root',
    },
  };
}

function getSceneAssetIds(scene: ScenePresetV1): string[] {
  const ids = scene.canvas.layers.flatMap((layer) =>
    layer.kind === 'decoration' ? [layer.assetId] : [],
  );
  if (scene.appearance.background.source === 'asset') {
    ids.push(scene.appearance.background.assetId);
  }
  return [...new Set(ids)];
}

function createPortableScene(
  scene: ScenePresetV1,
  bookmarkIdentityMap: ReadonlyMap<string, string>,
): ScenePresetV1 {
  const { recoverySnapshotId: _recoverySnapshotId, ...bookmarkPreferences } =
    scene.bookmarkCollection;
  const remappedPreferences = remapBookmarkPreferences(
    scene.bookmarkCollection,
    bookmarkIdentityMap,
  );
  return {
    ...structuredClone(scene),
    bookmarkCollection: {
      ...bookmarkPreferences,
      ...remappedPreferences,
      folderId: null,
      folderOwnership: 'external',
      folderPath: [],
    },
  };
}

async function readGlobalPreferences(
  sync: StoredArea,
): Promise<PortableGlobalPreferences> {
  const [locale, settings] = await Promise.all([
    sync.get('locale'),
    sync.get('settings'),
  ]);
  const normalizedSettings = normalizeSettings(settings);
  return {
    isOpenInNewTab: normalizedSettings.isOpenInNewTab,
    locale:
      locale === 'en' || locale === 'ja' || locale === 'ko'
        ? locale
        : DEFAULT_LOCALE,
  };
}

export async function createPortableProfile(
  options: PortableExportOptions = DEFAULT_PORTABLE_EXPORT_CATEGORIES,
  dependencies: PortableProfileServiceDependencies = createDefaultDependencies(),
): Promise<PortableProfileV4> {
  if (!options.scenes && (options.bookmarkUrls || options.media)) {
    throw new Error('Bookmark URLs and media require the Scene category.');
  }

  const collection = await dependencies.repository.load();
  const sourceScenes = options.scenes ? collection.scenes : [];
  const bookmarkIdentityMaps = new Map<string, ReadonlyMap<string, string>>();
  const bookmarks: Record<string, PortableBookmarkTree> = {};
  const assets: Record<string, PortableAsset> = {};

  if (options.bookmarkUrls) {
    for (const sourceScene of sourceScenes) {
      const folderId = sourceScene.bookmarkCollection.folderId;
      if (!folderId) {
        bookmarks[sourceScene.id] = { children: [], rootId: 'root' };
        continue;
      }
      const subtree = await dependencies.bookmarks.getSubTree(folderId);
      const folder = subtree.find((node) => node.id === folderId) ?? subtree[0];
      if (!folder || folder.url !== undefined) {
        throw new Error(
          `Scene bookmark folder is missing: ${sourceScene.name}`,
        );
      }
      const projection = toPortableBookmarkTree(folder);
      bookmarks[sourceScene.id] = projection.tree;
      bookmarkIdentityMaps.set(sourceScene.id, projection.identityMap);
    }
  }

  const scenes = sourceScenes.map((scene) =>
    createPortableScene(scene, bookmarkIdentityMaps.get(scene.id) ?? new Map()),
  );

  if (options.media) {
    const assetIds = [...new Set(scenes.flatMap(getSceneAssetIds))];
    for (const assetId of assetIds) {
      const asset = await dependencies.assets.load(assetId);
      if (!asset) throw new Error(`Scene media is missing: ${assetId}`);
      assets[assetId] = {
        dataUrl: await blobToDataUrl(asset.blob),
        id: asset.id,
        mediaType: asset.mediaType,
        name: asset.name,
      };
    }
  }

  return parsePortableProfileV4({
    ...(options.media ? { assets } : {}),
    ...(options.bookmarkUrls ? { bookmarks } : {}),
    categories: { ...options },
    exportedAt: dependencies.now().toISOString(),
    globalPreferences: await readGlobalPreferences(dependencies.sync),
    schemaVersion: PORTABLE_PROFILE_SCHEMA_VERSION,
    scenes,
  });
}

export async function previewPortableProfileImport(
  value: unknown,
  dependencies: PortableProfileServiceDependencies = createDefaultDependencies(),
): Promise<PortableImportPreview> {
  const profile = await convertBackupToPortableProfileV4(
    value,
    dependencies.now,
  );
  const existing = await dependencies.repository.load();
  return {
    diffs: getPortableProfileDiff(profile, existing.scenes),
    profile,
  };
}

async function createPortableBookmarkChildren(
  nodes: readonly PortableBookmarkNode[],
  parentId: string,
  gateway: SceneBookmarkGateway,
  identityMap: Map<string, string>,
): Promise<void> {
  for (const node of nodes) {
    const created = await gateway.create({
      parentId,
      title: node.title,
      ...(node.url === undefined ? {} : { url: node.url }),
    });
    identityMap.set(node.id, created.id);
    if (node.url === undefined) {
      await createPortableBookmarkChildren(
        node.children ?? [],
        created.id,
        gateway,
        identityMap,
      );
    }
  }
}

async function prepareBookmarkFolder(
  sceneName: string,
  tree: PortableBookmarkTree,
  destinationParentId: string,
  gateway: SceneBookmarkGateway,
  resources: PreparedBookmarkResources,
): Promise<PreparedBookmarkFolder> {
  const children = await gateway.getChildren(destinationParentId);
  let container = children.find(
    (node) =>
      node.url === undefined &&
      node.unmodifiable !== 'managed' &&
      node.title === DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE,
  );
  let wasContainerCreated = false;

  if (!container) {
    container = await gateway.create({
      parentId: destinationParentId,
      title: DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE,
    });
    wasContainerCreated = true;
  }

  resources.containerFolderId = container.id;
  resources.wasContainerCreated = wasContainerCreated;
  try {
    const sceneFolder = await gateway.create({
      parentId: container.id,
      title: sceneName,
    });
    resources.sceneFolderId = sceneFolder.id;
    const identityMap = new Map<string, string>([
      [tree.rootId, sceneFolder.id],
    ]);
    await createPortableBookmarkChildren(
      tree.children,
      sceneFolder.id,
      gateway,
      identityMap,
    );
    return {
      containerFolderId: container.id,
      identityMap,
      sceneFolderId: sceneFolder.id,
      wasContainerCreated,
    };
  } catch (error) {
    try {
      await cleanupBookmarkResources(resources, gateway);
    } catch (cleanupError) {
      throw createImportCleanupError(error, cleanupError);
    }
    throw error;
  }
}

function toRecoveryBookmarkNode(
  node: PortableBookmarkNode,
  identityMap: ReadonlyMap<string, string>,
): SceneRecoveryBookmarkNodeV1 {
  const sourceId = identityMap.get(node.id);
  if (!sourceId) {
    throw new Error(`Imported bookmark identity is missing: ${node.id}`);
  }
  if (node.url !== undefined) {
    return { sourceId, title: node.title, url: node.url };
  }
  return {
    children: (node.children ?? []).map((child) =>
      toRecoveryBookmarkNode(child, identityMap),
    ),
    sourceId,
    title: node.title,
  };
}

async function cleanupBookmarkResources(
  resources: PreparedBookmarkResources,
  gateway: SceneBookmarkGateway,
): Promise<void> {
  const failures: unknown[] = [];

  if (resources.sceneFolderId) {
    try {
      await gateway.removeTree(resources.sceneFolderId);
      resources.sceneFolderId = null;
    } catch (error) {
      failures.push(error);
    }
  }

  if (resources.wasContainerCreated && resources.containerFolderId) {
    try {
      await gateway.removeTree(resources.containerFolderId);
      resources.containerFolderId = null;
      resources.sceneFolderId = null;
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length > 0) {
    throw new AggregateError(failures, 'Portable bookmark cleanup failed.');
  }
}

function remapSceneAssets(
  scene: ScenePresetV1,
  assetIdMap: ReadonlyMap<string, string>,
): ScenePresetV1 {
  const background = scene.appearance.background;
  return {
    ...scene,
    appearance: {
      ...scene.appearance,
      background:
        background.source === 'asset' && assetIdMap.has(background.assetId)
          ? {
              ...background,
              assetId: assetIdMap.get(background.assetId) ?? background.assetId,
            }
          : background,
    },
    canvas: {
      ...scene.canvas,
      layers: scene.canvas.layers.map((layer) =>
        layer.kind === 'decoration' && assetIdMap.has(layer.assetId)
          ? {
              ...layer,
              assetId: assetIdMap.get(layer.assetId) ?? layer.assetId,
            }
          : layer,
      ),
    },
  };
}

function preserveExistingDeviceAssets(
  incoming: ScenePresetV1,
  existing: ScenePresetV1,
): ScenePresetV1 {
  const existingDecorations = new Map(
    existing.canvas.layers.flatMap((layer) =>
      layer.kind === 'decoration' ? [[layer.id, layer] as const] : [],
    ),
  );
  const incomingBackground = incoming.appearance.background;
  const existingBackground = existing.appearance.background;

  return {
    ...incoming,
    appearance: {
      ...incoming.appearance,
      background:
        incomingBackground.source === 'asset' &&
        existingBackground.source === 'asset' &&
        incomingBackground.mediaType === existingBackground.mediaType
          ? { ...incomingBackground, assetId: existingBackground.assetId }
          : incomingBackground,
    },
    canvas: {
      ...incoming.canvas,
      layers: incoming.canvas.layers.map((layer) => {
        if (layer.kind !== 'decoration') return layer;
        const existingLayer = existingDecorations.get(layer.id);
        return existingLayer?.mediaType === layer.mediaType
          ? { ...layer, assetId: existingLayer.assetId }
          : layer;
      }),
    },
  };
}

async function createUniqueImportedAssetId(
  sceneId: string,
  sourceAssetId: string,
  dependencies: PortableProfileServiceDependencies,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = `profile:${sceneId}:${sourceAssetId}:${dependencies.createId()}`;
    if (
      candidate.trim() !== '' &&
      !(await dependencies.assets.load(candidate))
    ) {
      return candidate;
    }
  }
  throw new Error('Could not create a unique imported asset id.');
}

async function createUniqueRecoverySnapshotId(
  sceneId: string,
  dependencies: PortableProfileServiceDependencies,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = createSceneRecoverySnapshotId(
      `${sceneId}:${dependencies.createId()}`,
    );
    if (
      candidate.trim() !== '' &&
      !(await dependencies.recovery.load(candidate))
    ) {
      return candidate;
    }
  }
  throw new Error('Could not create a unique recovery snapshot id.');
}

async function prepareScene(
  scene: ScenePresetV1,
  sourceSceneId: string,
  profile: PortableProfileV4,
  destinationParentId: string | null,
  dependencies: PortableProfileServiceDependencies,
): Promise<PreparedScene> {
  const createdAssetIds: string[] = [];
  const createdAssets: SharedAssetRecord[] = [];
  const assetIdMap = new Map<string, string>();
  let bookmarkFolder: PreparedBookmarkFolder | null = null;
  const bookmarkResources: PreparedBookmarkResources = {
    containerFolderId: null,
    sceneFolderId: null,
    wasContainerCreated: false,
  };
  let recoverySnapshotId: string | null = null;

  try {
    for (const sourceAssetId of getSceneAssetIds(scene)) {
      const portableAsset = profile.assets?.[sourceAssetId];
      if (!portableAsset) continue;
      const assetId = await createUniqueImportedAssetId(
        scene.id,
        sourceAssetId,
        dependencies,
      );
      const blob = portableDataUrlToBlob(portableAsset.dataUrl);
      const processed = await dependencies.processMedia(
        new File([blob], portableAsset.name, { type: portableAsset.mediaType }),
      );
      const expectedMediaKind = portableAsset.mediaType.startsWith('video/')
        ? 'motion'
        : 'static';
      if (processed.mediaKind !== expectedMediaKind) {
        throw new Error(
          `Imported media type does not match: ${portableAsset.id}`,
        );
      }
      const createdAsset: SharedAssetRecord = {
        blob: processed.blob,
        createdAt: dependencies.now().toISOString(),
        id: assetId,
        mediaType: processed.blob.type,
        name: portableAsset.name,
        size: processed.blob.size,
      };
      createdAssetIds.push(assetId);
      await dependencies.assets.save(createdAsset);
      createdAssets.push(createdAsset);
      assetIdMap.set(sourceAssetId, assetId);
    }

    const bookmarkTree = profile.bookmarks?.[sourceSceneId];
    bookmarkFolder =
      bookmarkTree === undefined
        ? null
        : await prepareBookmarkFolder(
            scene.name,
            bookmarkTree,
            destinationParentId ?? '',
            dependencies.bookmarks,
            bookmarkResources,
          );
    const remappedScene = remapSceneAssets(scene, assetIdMap);
    const bookmarkPreferences = bookmarkFolder
      ? remapBookmarkPreferences(
          remappedScene.bookmarkCollection,
          bookmarkFolder.identityMap,
        )
      : null;
    const preparedScene =
      bookmarkFolder === null
        ? remappedScene
        : {
            ...remappedScene,
            bookmarkCollection: {
              ...remappedScene.bookmarkCollection,
              ...(bookmarkPreferences ?? {}),
              folderId: bookmarkFolder.sceneFolderId,
              folderOwnership: 'scene' as const,
              folderPath: [
                DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE,
                remappedScene.name,
              ],
              recoverySnapshotId: await createUniqueRecoverySnapshotId(
                remappedScene.id,
                dependencies,
              ),
            },
          };

    if (bookmarkFolder && bookmarkTree) {
      const preparedBookmarkFolder = bookmarkFolder;
      recoverySnapshotId =
        preparedScene.bookmarkCollection.recoverySnapshotId ?? null;
      if (!recoverySnapshotId) {
        throw new Error('Imported Scene recovery id could not be created.');
      }
      const snapshot: SceneRecoverySnapshotV1 = {
        assets: createdAssets.map((asset) => ({ ...asset })),
        bookmark: {
          containerId: preparedBookmarkFolder.containerFolderId,
          containerTitle: DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE,
          destinationParentId: destinationParentId ?? '',
          folder: {
            children: bookmarkTree.children.map((node) =>
              toRecoveryBookmarkNode(node, preparedBookmarkFolder.identityMap),
            ),
            sourceId: preparedBookmarkFolder.sceneFolderId,
            title: preparedScene.name,
          },
          folderPath: [...preparedScene.bookmarkCollection.folderPath],
        },
        capturedAt: dependencies.now().getTime(),
        id: recoverySnapshotId,
        sceneId: preparedScene.id,
        version: SCENE_RECOVERY_SNAPSHOT_VERSION,
      };
      await dependencies.recovery.save(snapshot);
    }

    return {
      assetIds: createdAssetIds,
      bookmarkFolder,
      bookmarkResources: bookmarkFolder ? bookmarkResources : null,
      recoverySnapshotId,
      scene: preparedScene,
      sourceSceneId,
    };
  } catch (error) {
    try {
      await cleanupPreparedScenes(
        [
          {
            assetIds: createdAssetIds,
            bookmarkFolder,
            bookmarkResources:
              bookmarkResources.containerFolderId ||
              bookmarkResources.sceneFolderId
                ? bookmarkResources
                : null,
            recoverySnapshotId,
            scene,
            sourceSceneId,
          },
        ],
        dependencies,
      );
    } catch (cleanupError) {
      throw createImportCleanupError(error, cleanupError);
    }
    throw error;
  }
}

async function cleanupPreparedScenes(
  preparedScenes: readonly PreparedScene[],
  dependencies: PortableProfileServiceDependencies,
): Promise<void> {
  const failures: unknown[] = [];
  const recoveryResults = await Promise.allSettled(
    preparedScenes.flatMap((prepared) =>
      prepared.recoverySnapshotId
        ? [dependencies.recovery.delete(prepared.recoverySnapshotId)]
        : [],
    ),
  );
  failures.push(
    ...recoveryResults.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    ),
  );
  const assetResults = await Promise.allSettled(
    preparedScenes.flatMap((prepared) =>
      prepared.assetIds.map(dependencies.assets.delete),
    ),
  );
  failures.push(
    ...assetResults.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    ),
  );

  for (const prepared of [...preparedScenes].reverse()) {
    if (!prepared.bookmarkResources) continue;
    try {
      await cleanupBookmarkResources(
        prepared.bookmarkResources,
        dependencies.bookmarks,
      );
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      'Portable profile resource cleanup failed.',
    );
  }
}

function createImportCleanupError(
  importError: unknown,
  cleanupError: unknown,
): AggregateError {
  return new AggregateError(
    [importError, cleanupError],
    'Portable profile import and cleanup failed.',
    { cause: cleanupError },
  );
}

async function restoreStoredValues(
  storageArea: StoredArea,
  values: Readonly<Record<string, unknown>>,
): Promise<void> {
  const entries = Object.entries(values);
  const keysToRemove = entries.flatMap(([key, value]) =>
    value === undefined || value === null ? [key] : [],
  );
  const valuesToRestore = Object.fromEntries(
    entries.filter(([, value]) => value !== undefined && value !== null),
  );

  if (Object.keys(valuesToRestore).length > 0) {
    await storageArea.set(valuesToRestore);
  }
  if (keysToRemove.length > 0) {
    await storageArea.remove(keysToRemove);
  }
}

function requirePortableBookmarkRelink(scene: ScenePresetV1): ScenePresetV1 {
  const { recoverySnapshotId: _recoverySnapshotId, ...bookmarkCollection } =
    scene.bookmarkCollection;

  return {
    ...scene,
    bookmarkCollection: {
      ...bookmarkCollection,
      folderId: `portable-profile:relink:${encodeURIComponent(scene.id)}`,
      folderOwnership: 'external',
      folderPath: [],
    },
  };
}

function mergePreparedScenes(
  current: SceneCollectionV3,
  planned: ReturnType<typeof planPortableProfileImport>,
  prepared: readonly PreparedScene[],
  preserveDeviceAssets: boolean,
): SceneCollectionV3 {
  const preparedBySource = new Map(
    prepared.map((item) => [item.sourceSceneId, item] as const),
  );
  const scenes = [...current.scenes];
  const replacedSceneIds = new Set<string>();

  for (const item of planned) {
    if (item.mode === 'skip') continue;
    const preparedScene = preparedBySource.get(item.sourceSceneId);
    if (!preparedScene)
      throw new Error(`Prepared Scene is missing: ${item.sourceSceneId}`);
    const scene = preparedScene.scene;
    const index = scenes.findIndex((candidate) => candidate.id === scene.id);
    if (item.mode === 'replace' && index >= 0) {
      replacedSceneIds.add(scene.id);
      const existing = scenes[index];
      const sceneWithDeviceAssets =
        preserveDeviceAssets && existing
          ? preserveExistingDeviceAssets(scene, existing)
          : scene;
      scenes[index] =
        preparedScene.bookmarkFolder === null && existing
          ? {
              ...sceneWithDeviceAssets,
              bookmarkCollection: structuredClone(existing.bookmarkCollection),
            }
          : sceneWithDeviceAssets;
    } else {
      scenes.push(
        preparedScene.bookmarkFolder === null
          ? requirePortableBookmarkRelink(scene)
          : scene,
      );
    }
  }

  return {
    activeSceneId:
      current.activeSceneId !== null &&
      replacedSceneIds.has(current.activeSceneId)
        ? null
        : current.activeSceneId,
    scenes,
    storageSchemaVersion: SCENE_STORAGE_SCHEMA_VERSION,
  };
}

async function cleanupReplacedAssets(
  current: SceneCollectionV3,
  next: SceneCollectionV3,
  planned: ReturnType<typeof planPortableProfileImport>,
  dependencies: PortableProfileServiceDependencies,
): Promise<void> {
  const replacedIds = new Set(
    planned.flatMap((item) => (item.mode === 'replace' ? [item.scene.id] : [])),
  );
  const retainedAssetIds = new Set(next.scenes.flatMap(getSceneAssetIds));
  const orphanedAssetIds = [
    ...new Set(
      current.scenes
        .filter((scene) => replacedIds.has(scene.id))
        .flatMap(getSceneAssetIds)
        .filter((assetId) => !retainedAssetIds.has(assetId)),
    ),
  ];
  const results = await Promise.allSettled(
    orphanedAssetIds.map(dependencies.assets.delete),
  );
  const failures = results.flatMap((result) =>
    result.status === 'rejected' ? [result.reason] : [],
  );
  if (failures.length > 0 && typeof globalThis.reportError === 'function') {
    globalThis.reportError(
      new AggregateError(failures, 'Replaced Scene asset cleanup failed.'),
    );
  }
}

async function refreshPreparedRecoverySnapshots(
  preparedScenes: readonly PreparedScene[],
  next: SceneCollectionV3,
  dependencies: PortableProfileServiceDependencies,
): Promise<void> {
  for (const prepared of preparedScenes) {
    if (!prepared.recoverySnapshotId) continue;
    const snapshot = await dependencies.recovery.load(
      prepared.recoverySnapshotId,
    );
    const scene = next.scenes.find(
      (candidate) => candidate.id === prepared.scene.id,
    );
    if (!snapshot || !scene) {
      throw new Error('Prepared Scene recovery snapshot is missing.');
    }
    const loadedAssets = await Promise.all(
      getSceneAssetIds(scene).map(async (assetId) => {
        const asset = await dependencies.assets.load(assetId);
        return asset ? { ...asset } : null;
      }),
    );
    const assets = loadedAssets.filter(
      (asset): asset is SharedAssetRecord => asset !== null,
    );
    await dependencies.recovery.save({ ...snapshot, assets });
  }
}

async function cleanupReplacedRecoverySnapshots(
  current: SceneCollectionV3,
  next: SceneCollectionV3,
  planned: ReturnType<typeof planPortableProfileImport>,
  dependencies: PortableProfileServiceDependencies,
): Promise<void> {
  const replacedIds = new Set(
    planned.flatMap((item) => (item.mode === 'replace' ? [item.scene.id] : [])),
  );
  const retainedSnapshotIds = new Set(
    next.scenes.flatMap((scene) =>
      scene.bookmarkCollection.recoverySnapshotId
        ? [scene.bookmarkCollection.recoverySnapshotId]
        : [],
    ),
  );
  const orphanedSnapshotIds = [
    ...new Set(
      current.scenes
        .filter((scene) => replacedIds.has(scene.id))
        .flatMap((scene) =>
          scene.bookmarkCollection.recoverySnapshotId
            ? [scene.bookmarkCollection.recoverySnapshotId]
            : [],
        )
        .filter((snapshotId) => !retainedSnapshotIds.has(snapshotId)),
    ),
  ];
  const results = await Promise.allSettled(
    orphanedSnapshotIds.map(dependencies.recovery.delete),
  );
  const failures = results.flatMap((result) =>
    result.status === 'rejected' ? [result.reason] : [],
  );
  if (failures.length > 0 && typeof globalThis.reportError === 'function') {
    globalThis.reportError(
      new AggregateError(failures, 'Replaced Scene recovery cleanup failed.'),
    );
  }
}

export async function importPortableProfile(
  value: unknown,
  options: PortableImportOptions,
  dependencies: PortableProfileServiceDependencies = createDefaultDependencies(),
): Promise<void> {
  const profile = await convertBackupToPortableProfileV4(
    value,
    dependencies.now,
  );
  const current = await dependencies.repository.load();
  const planned = planPortableProfileImport(
    profile,
    current.scenes,
    options.conflictChoices,
    dependencies.createId,
  );
  const actionable = planned.filter((item) => item.mode !== 'skip');
  const needsBookmarkDestination =
    profile.categories.bookmarkUrls && actionable.length > 0;
  const destinationParentId = needsBookmarkDestination
    ? (options.destinationParentId ??
      (await findDefaultSceneBookmarkParent(dependencies.bookmarks)))
    : null;
  if (needsBookmarkDestination && !destinationParentId) {
    throw new Error('A writable bookmark destination folder is required.');
  }

  const preparedScenes: PreparedScene[] = [];
  let committedCollection: SceneCollectionV3;
  try {
    for (const item of actionable) {
      preparedScenes.push(
        await prepareScene(
          item.scene,
          item.sourceSceneId,
          profile,
          destinationParentId,
          dependencies,
        ),
      );
    }

    const nextCollection = mergePreparedScenes(
      current,
      planned,
      preparedScenes,
      !profile.categories.media,
    );
    await refreshPreparedRecoverySnapshots(
      preparedScenes,
      nextCollection,
      dependencies,
    );
    const [previousLocale, previousSyncSettings, previousLocalSettings] =
      await Promise.all([
        dependencies.sync.get('locale'),
        dependencies.sync.get('settings'),
        dependencies.local.get('settings'),
      ]);
    const currentSettings = normalizeSettings(
      previousLocalSettings ?? previousSyncSettings,
    );
    const importedLocalSettings = {
      ...currentSettings,
      isOpenInNewTab: profile.globalPreferences.isOpenInNewTab,
    };
    const importedSettings = {
      isOpenInNewTab: profile.globalPreferences.isOpenInNewTab,
    };

    await runStorageTransaction({
      commit: () =>
        actionable.length === 0
          ? Promise.resolve()
          : dependencies.repository.replace(nextCollection),
      steps: [
        createSelfRestoringStorageStep(
          'portable local global preferences',
          () => dependencies.local.set({ settings: importedLocalSettings }),
          () =>
            restoreStoredValues(dependencies.local, {
              settings: previousLocalSettings,
            }),
        ),
        createSelfRestoringStorageStep(
          'portable global preferences',
          () =>
            dependencies.sync.set({
              locale: profile.globalPreferences.locale,
              settings: importedSettings,
            }),
          () =>
            restoreStoredValues(dependencies.sync, {
              locale: previousLocale,
              settings: previousSyncSettings,
            }),
        ),
      ],
    });
    committedCollection = nextCollection;
  } catch (error) {
    try {
      await cleanupPreparedScenes(preparedScenes, dependencies);
    } catch (cleanupError) {
      throw createImportCleanupError(error, cleanupError);
    }
    throw error;
  }

  if (profile.categories.media) {
    await cleanupReplacedAssets(
      current,
      committedCollection,
      planned,
      dependencies,
    );
  }
  await cleanupReplacedRecoverySnapshots(
    current,
    committedCollection,
    planned,
    dependencies,
  );
}
