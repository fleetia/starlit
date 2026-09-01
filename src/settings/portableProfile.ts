import type { Locale } from '../i18n';
import { MAX_OVERLAY_MEDIA_FILE_SIZE_BYTES } from '../overlays/mediaProcessing';
import { parseScenePresetV1 } from '../scenes/codec';
import { remapBookmarkPreferences } from '../scenes/bookmarkIdentity';
import type { ScenePresetV1 } from '../scenes/types';

export const PORTABLE_PROFILE_SCHEMA_VERSION = 4;

const MAX_PORTABLE_ASSET_BASE64_LENGTH =
  Math.ceil(MAX_OVERLAY_MEDIA_FILE_SIZE_BYTES / 3) * 4;
const MAX_ID_GENERATION_ATTEMPTS = 100;

export type PortableProfileCategories = {
  bookmarkUrls: boolean;
  media: boolean;
  scenes: boolean;
};

export type PortableGlobalPreferences = {
  isOpenInNewTab: boolean;
  locale: Locale;
};

export type PortableBookmarkNode = {
  children?: PortableBookmarkNode[];
  id: string;
  title: string;
  url?: string;
};

export type PortableBookmarkTree = {
  children: PortableBookmarkNode[];
  rootId: string;
};

export type PortableAsset = {
  dataUrl: string;
  id: string;
  mediaType: string;
  name: string;
};

export type PortableProfileV4 = {
  assets?: Record<string, PortableAsset>;
  bookmarks?: Record<string, PortableBookmarkTree>;
  categories: PortableProfileCategories;
  exportedAt: string;
  globalPreferences: PortableGlobalPreferences;
  schemaVersion: typeof PORTABLE_PROFILE_SCHEMA_VERSION;
  scenes: ScenePresetV1[];
};

export type PortableProfileCounts = {
  assets: number;
  bookmarkFolders: number;
  bookmarkUrls: number;
  scenes: number;
  widgets: number;
};

export type SceneImportDiff = {
  assetCount: number;
  bookmarkFolderCount: number;
  bookmarkUrlCount: number;
  changedSections: Array<'appearance' | 'bookmarks' | 'canvas' | 'identity'>;
  existingScene: ScenePresetV1 | null;
  incomingScene: ScenePresetV1;
};

export type SceneConflictChoice = 'add-copy' | 'replace' | 'skip';

export type PlannedSceneImport = {
  mode: 'add' | SceneConflictChoice;
  scene: ScenePresetV1;
  sourceSceneId: string;
};

export function redactCalendarFeedUrls(scene: ScenePresetV1): ScenePresetV1 {
  const redactedScene = structuredClone(scene);
  redactedScene.canvas.layers = redactedScene.canvas.layers.map((layer) =>
    layer.kind === 'widget' && layer.widgetType === 'calendar'
      ? { ...layer, config: { ...layer.config, feedUrl: null } }
      : layer,
  );
  return redactedScene;
}

function createCopiedSceneName(name: string, locale: Locale): string {
  switch (locale) {
    case 'ko':
      return `${name} (복사본)`;
    case 'ja':
      return `${name}（コピー）`;
    case 'en':
      return `${name} (copy)`;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'ko' || value === 'ja';
}

function parseNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value;
}

function parseString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string.`);
  }
  return value;
}

function parseCategories(value: unknown): PortableProfileCategories {
  if (
    !isRecord(value) ||
    typeof value.bookmarkUrls !== 'boolean' ||
    typeof value.media !== 'boolean' ||
    typeof value.scenes !== 'boolean'
  ) {
    throw new Error('categories is invalid.');
  }

  return {
    bookmarkUrls: value.bookmarkUrls,
    media: value.media,
    scenes: value.scenes,
  };
}

function parseGlobalPreferences(value: unknown): PortableGlobalPreferences {
  if (
    !isRecord(value) ||
    !isLocale(value.locale) ||
    typeof value.isOpenInNewTab !== 'boolean'
  ) {
    throw new Error('globalPreferences is invalid.');
  }

  return {
    isOpenInNewTab: value.isOpenInNewTab,
    locale: value.locale,
  };
}

function getSyntheticBookmarkId(indexPath: readonly number[]): string {
  return `node:${indexPath.join('.')}`;
}

function parseBookmarkNode(
  value: unknown,
  path: string,
  indexPath: readonly number[],
): PortableBookmarkNode {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object.`);
  }

  const title = parseString(value.title, `${path}.title`);
  const id =
    value.id === undefined
      ? getSyntheticBookmarkId(indexPath)
      : parseNonEmptyString(value.id, `${path}.id`);
  const url =
    value.url === undefined
      ? undefined
      : parseNonEmptyString(value.url, `${path}.url`);
  const children =
    value.children === undefined
      ? undefined
      : parseBookmarkNodes(value.children, `${path}.children`, indexPath);

  if (url === undefined && children === undefined) {
    return { children: [], id, title };
  }

  if (url !== undefined && children !== undefined) {
    throw new Error(`${path} cannot contain both url and children.`);
  }

  return {
    ...(children === undefined ? {} : { children }),
    id,
    title,
    ...(url === undefined ? {} : { url }),
  };
}

function parseBookmarkNodes(
  value: unknown,
  path: string,
  parentIndexPath: readonly number[] = [],
): PortableBookmarkNode[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array.`);
  }
  return value.map((node, index) =>
    parseBookmarkNode(node, `${path}[${index}]`, [...parentIndexPath, index]),
  );
}

function collectPortableBookmarkIds(
  nodes: readonly PortableBookmarkNode[],
  ids: string[] = [],
): string[] {
  for (const node of nodes) {
    ids.push(node.id);
    collectPortableBookmarkIds(node.children ?? [], ids);
  }
  return ids;
}

function parseBookmarkTree(value: unknown, path: string): PortableBookmarkTree {
  const rootId = 'root';
  const tree = Array.isArray(value)
    ? { children: parseBookmarkNodes(value, path), rootId }
    : (() => {
        if (!isRecord(value)) {
          throw new Error(`${path} must be a bookmark tree.`);
        }
        return {
          children: parseBookmarkNodes(value.children, `${path}.children`),
          rootId: parseNonEmptyString(value.rootId, `${path}.rootId`),
        };
      })();
  const ids = [tree.rootId, ...collectPortableBookmarkIds(tree.children)];
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${path} bookmark ids must be unique.`);
  }
  return tree;
}

function parseBookmarks(
  value: unknown,
  sceneIds: ReadonlySet<string>,
): Record<string, PortableBookmarkTree> {
  if (!isRecord(value)) {
    throw new Error('bookmarks must be an object.');
  }

  const bookmarks = Object.fromEntries(
    Object.entries(value).map(([sceneId, nodes]) => {
      if (!sceneIds.has(sceneId)) {
        throw new Error(`bookmarks references an unknown Scene: ${sceneId}`);
      }
      return [sceneId, parseBookmarkTree(nodes, `bookmarks.${sceneId}`)];
    }),
  );

  for (const sceneId of sceneIds) {
    if (!(sceneId in bookmarks)) {
      throw new Error(`bookmarks is missing Scene data: ${sceneId}`);
    }
  }

  return bookmarks;
}

function parseAssets(value: unknown): Record<string, PortableAsset> {
  if (!isRecord(value)) {
    throw new Error('assets must be an object.');
  }

  return Object.fromEntries(
    Object.entries(value).map(([id, assetValue]) => {
      if (!isRecord(assetValue) || assetValue.id !== id) {
        throw new Error(`assets.${id} is invalid.`);
      }

      const asset: PortableAsset = {
        dataUrl: parseNonEmptyString(
          assetValue.dataUrl,
          `assets.${id}.dataUrl`,
        ),
        id,
        mediaType: parseNonEmptyString(
          assetValue.mediaType,
          `assets.${id}.mediaType`,
        ),
        name: parseNonEmptyString(assetValue.name, `assets.${id}.name`),
      };

      const blob = portableDataUrlToBlob(asset.dataUrl);
      if (blob.type !== asset.mediaType) {
        throw new Error(`assets.${id}.dataUrl is invalid.`);
      }
      if (blob.size > MAX_OVERLAY_MEDIA_FILE_SIZE_BYTES) {
        throw new Error(`assets.${id} exceeds the media size limit.`);
      }
      if (!blob.type.startsWith('image/') && !blob.type.startsWith('video/')) {
        throw new Error(`assets.${id}.mediaType is unsupported.`);
      }

      return [id, asset];
    }),
  );
}

export function portableDataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/i.exec(dataUrl);
  const mediaType = match?.[1];
  const base64 = match?.[2];
  if (!mediaType || base64 === undefined || base64.length % 4 !== 0) {
    throw new Error('Portable asset data URL is invalid.');
  }
  if (base64.length > MAX_PORTABLE_ASSET_BASE64_LENGTH) {
    throw new Error('Portable asset exceeds the media size limit.');
  }

  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new Error('Portable asset base64 data could not be decoded.');
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mediaType });
}

export function parsePortableProfileV4(value: unknown): PortableProfileV4 {
  if (!isRecord(value)) {
    throw new Error('Portable profile must be an object.');
  }
  if (value.schemaVersion !== PORTABLE_PROFILE_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schemaVersion: ${String(value.schemaVersion)}`,
    );
  }

  const categories = parseCategories(value.categories);
  if (!categories.scenes && (categories.bookmarkUrls || categories.media)) {
    throw new Error('Bookmark URLs and media require the Scene category.');
  }
  if (!Array.isArray(value.scenes)) {
    throw new Error('scenes must be an array.');
  }
  const scenes = value.scenes.map((scene) =>
    redactCalendarFeedUrls(parseScenePresetV1(scene)),
  );
  const sceneIds = scenes.map((scene) => scene.id);
  if (new Set(sceneIds).size !== sceneIds.length) {
    throw new Error('Scene ids must be unique.');
  }
  if (!categories.scenes && scenes.length > 0) {
    throw new Error(
      'scenes must be empty when the Scene category is excluded.',
    );
  }

  const bookmarkSet = new Set(sceneIds);
  const bookmarks = categories.bookmarkUrls
    ? parseBookmarks(value.bookmarks, bookmarkSet)
    : undefined;
  const assets = categories.media ? parseAssets(value.assets) : undefined;
  const normalizedScenes = scenes.map((scene) => {
    const tree = bookmarks?.[scene.id];
    const ids = tree
      ? [tree.rootId, ...collectPortableBookmarkIds(tree.children)]
      : [];
    const identityMap = new Map(ids.map((id) => [id, id] as const));
    const preferences = remapBookmarkPreferences(
      scene.bookmarkCollection,
      identityMap,
    );
    return parseScenePresetV1({
      ...scene,
      bookmarkCollection: {
        ...scene.bookmarkCollection,
        ...preferences,
      },
    });
  });

  if (assets) {
    for (const scene of normalizedScenes) {
      const expectedAssets = [
        ...(scene.appearance.background.source === 'asset'
          ? [
              {
                id: scene.appearance.background.assetId,
                mediaType: scene.appearance.background.mediaType,
              },
            ]
          : []),
        ...scene.canvas.layers.flatMap((layer) =>
          layer.kind === 'decoration'
            ? [{ id: layer.assetId, mediaType: layer.mediaType }]
            : [],
        ),
      ];

      for (const expected of expectedAssets) {
        const asset = assets[expected.id];
        if (!asset) {
          throw new Error(`Scene media is missing: ${expected.id}`);
        }
        if (!asset.mediaType.startsWith(`${expected.mediaType}/`)) {
          throw new Error(`Scene media type does not match: ${expected.id}`);
        }
      }
    }
  }

  if (!categories.bookmarkUrls && value.bookmarks !== undefined) {
    throw new Error(
      'bookmarks must be omitted when bookmark URLs are excluded.',
    );
  }
  if (!categories.media && value.assets !== undefined) {
    throw new Error('assets must be omitted when media is excluded.');
  }

  const exportedAt = parseNonEmptyString(value.exportedAt, 'exportedAt');
  if (!Number.isFinite(Date.parse(exportedAt))) {
    throw new Error('exportedAt must be an ISO date string.');
  }

  return {
    ...(assets === undefined ? {} : { assets }),
    ...(bookmarks === undefined ? {} : { bookmarks }),
    categories,
    exportedAt,
    globalPreferences: parseGlobalPreferences(value.globalPreferences),
    schemaVersion: PORTABLE_PROFILE_SCHEMA_VERSION,
    scenes: normalizedScenes,
  };
}

function countBookmarkNodes(nodes: readonly PortableBookmarkNode[]): {
  folders: number;
  urls: number;
} {
  return nodes.reduce(
    (counts, node) => {
      if (node.url !== undefined) {
        return { ...counts, urls: counts.urls + 1 };
      }
      const childCounts = countBookmarkNodes(node.children ?? []);
      return {
        folders: counts.folders + childCounts.folders + 1,
        urls: counts.urls + childCounts.urls,
      };
    },
    { folders: 0, urls: 0 },
  );
}

export function getPortableProfileCounts(
  profile: PortableProfileV4,
): PortableProfileCounts {
  const bookmarkCounts = Object.values(profile.bookmarks ?? {}).reduce(
    (counts, tree) => {
      const next = countBookmarkNodes(tree.children);
      return {
        folders: counts.folders + next.folders,
        urls: counts.urls + next.urls,
      };
    },
    { folders: 0, urls: 0 },
  );

  return {
    assets: Object.keys(profile.assets ?? {}).length,
    bookmarkFolders: bookmarkCounts.folders,
    bookmarkUrls: bookmarkCounts.urls,
    scenes: profile.scenes.length,
    widgets: profile.scenes.reduce(
      (count, scene) =>
        count +
        scene.canvas.layers.filter((layer) => layer.kind !== 'bookmarks')
          .length,
      0,
    ),
  };
}

function isEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getSceneAssetIds(scene: ScenePresetV1): string[] {
  const decorationAssets = scene.canvas.layers.flatMap((layer) =>
    layer.kind === 'decoration' ? [layer.assetId] : [],
  );
  const backgroundAssets =
    scene.appearance.background.source === 'asset'
      ? [scene.appearance.background.assetId]
      : [];
  return [...new Set([...decorationAssets, ...backgroundAssets])];
}

export function getPortableProfileDiff(
  profile: PortableProfileV4,
  existingScenes: readonly ScenePresetV1[],
): SceneImportDiff[] {
  const existingById = new Map(
    existingScenes.map((scene) => [scene.id, scene] as const),
  );

  return profile.scenes.map((incomingScene) => {
    const existingScene = existingById.get(incomingScene.id) ?? null;
    const bookmarkCounts = countBookmarkNodes(
      profile.bookmarks?.[incomingScene.id]?.children ?? [],
    );
    const changedSections: SceneImportDiff['changedSections'] = [];

    if (existingScene) {
      if (!isEqual(existingScene.appearance, incomingScene.appearance)) {
        changedSections.push('appearance');
      }
      if (
        !isEqual(
          remapBookmarkPreferences(existingScene.bookmarkCollection, new Map()),
          remapBookmarkPreferences(incomingScene.bookmarkCollection, new Map()),
        ) ||
        profile.categories.bookmarkUrls
      ) {
        changedSections.push('bookmarks');
      }
      if (!isEqual(existingScene.canvas, incomingScene.canvas)) {
        changedSections.push('canvas');
      }
      if (
        existingScene.name !== incomingScene.name ||
        existingScene.createdAt !== incomingScene.createdAt
      ) {
        changedSections.push('identity');
      }
    } else {
      changedSections.push('appearance', 'bookmarks', 'canvas', 'identity');
    }

    return {
      assetCount: getSceneAssetIds(incomingScene).filter((id) =>
        Object.hasOwn(profile.assets ?? {}, id),
      ).length,
      bookmarkFolderCount: bookmarkCounts.folders,
      bookmarkUrlCount: bookmarkCounts.urls,
      changedSections,
      existingScene,
      incomingScene,
    };
  });
}

export function planPortableProfileImport(
  profile: PortableProfileV4,
  existingScenes: readonly ScenePresetV1[],
  conflictChoices: Readonly<Record<string, SceneConflictChoice>>,
  createId: () => string = () => crypto.randomUUID(),
): PlannedSceneImport[] {
  const existingIds = new Set(existingScenes.map((scene) => scene.id));

  return profile.scenes.flatMap((scene): PlannedSceneImport[] => {
    if (!existingIds.has(scene.id)) {
      existingIds.add(scene.id);
      return [{ mode: 'add', scene, sourceSceneId: scene.id }];
    }

    const mode = conflictChoices[scene.id] ?? 'skip';
    if (mode === 'skip') {
      return [{ mode, scene, sourceSceneId: scene.id }];
    }
    if (mode === 'replace') {
      return [{ mode, scene, sourceSceneId: scene.id }];
    }

    let id: string | null = null;
    for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
      const candidate = createId();
      if (candidate.trim() !== '' && !existingIds.has(candidate)) {
        id = candidate;
        break;
      }
    }
    if (id === null) {
      throw new Error('Could not create a unique copied Scene id.');
    }
    existingIds.add(id);
    return [
      {
        mode,
        scene: {
          ...scene,
          id,
          name: createCopiedSceneName(
            scene.name,
            profile.globalPreferences.locale,
          ),
        },
        sourceSceneId: scene.id,
      },
    ];
  });
}

export function getPortableProfilePrivacyWarning(
  categories: PortableProfileCategories,
): 'bookmarks-and-media' | 'bookmarks' | 'media' | null {
  if (categories.bookmarkUrls && categories.media) return 'bookmarks-and-media';
  if (categories.bookmarkUrls) return 'bookmarks';
  if (categories.media) return 'media';
  return null;
}
