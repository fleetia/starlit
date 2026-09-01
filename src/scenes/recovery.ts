import type { SharedAssetRecord } from '../platform/storage/indexedDbRecords';

export const SCENE_RECOVERY_SNAPSHOT_VERSION = 1;
export const SCENE_RECOVERY_SNAPSHOT_ID_PREFIX = 'scene-recovery:';

export type SceneRecoveryBookmarkNodeV1 = {
  children?: SceneRecoveryBookmarkNodeV1[];
  sourceId?: string;
  title: string;
  url?: string;
};

export type SceneRecoveryBookmarkSnapshotV1 = {
  containerId: string;
  containerTitle: string;
  destinationParentId: string;
  folder: SceneRecoveryBookmarkNodeV1;
  folderPath: string[];
};

export type SceneRecoverySnapshotV1 = {
  assets: SharedAssetRecord[];
  bookmark: SceneRecoveryBookmarkSnapshotV1;
  capturedAt: number;
  id: string;
  sceneId: string;
  version: typeof SCENE_RECOVERY_SNAPSHOT_VERSION;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function parseStringArray(value: unknown, field: string): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string')
  ) {
    throw new Error(`${field} must be a string array.`);
  }

  return [...value];
}

function parseBookmarkNode(
  value: unknown,
  field: string,
): SceneRecoveryBookmarkNodeV1 {
  if (!isRecord(value)) {
    throw new Error(`${field} must be an object.`);
  }

  const title = parseString(value.title, `${field}.title`);
  const sourceId =
    value.sourceId === undefined
      ? undefined
      : parseNonEmptyString(value.sourceId, `${field}.sourceId`);
  if (value.url !== undefined) {
    return {
      ...(sourceId === undefined ? {} : { sourceId }),
      title,
      url: parseNonEmptyString(value.url, `${field}.url`),
    };
  }

  if (!Array.isArray(value.children)) {
    throw new Error(`${field}.children must be an array for a folder.`);
  }

  return {
    children: value.children.map((child, index) =>
      parseBookmarkNode(child, `${field}.children[${index}]`),
    ),
    ...(sourceId === undefined ? {} : { sourceId }),
    title,
  };
}

function parseAssetRecord(value: unknown, index: number): SharedAssetRecord {
  const field = `assets[${index}]`;
  if (!isRecord(value) || !(value.blob instanceof Blob)) {
    throw new Error(`${field} must contain a Blob.`);
  }

  const size = value.size;
  if (
    typeof size !== 'number' ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size !== value.blob.size
  ) {
    throw new Error(`${field}.size is invalid.`);
  }

  return {
    blob: value.blob,
    createdAt: parseNonEmptyString(value.createdAt, `${field}.createdAt`),
    id: parseNonEmptyString(value.id, `${field}.id`),
    mediaType: parseNonEmptyString(value.mediaType, `${field}.mediaType`),
    name: parseNonEmptyString(value.name, `${field}.name`),
    size,
  };
}

export function createSceneRecoverySnapshotId(sceneId: string): string {
  const normalizedSceneId = parseNonEmptyString(sceneId, 'sceneId');
  return `${SCENE_RECOVERY_SNAPSHOT_ID_PREFIX}${normalizedSceneId}`;
}

export function parseSceneRecoverySnapshotV1(
  value: unknown,
): SceneRecoverySnapshotV1 {
  if (!isRecord(value) || value.version !== SCENE_RECOVERY_SNAPSHOT_VERSION) {
    throw new Error(
      `Scene recovery snapshot version must be ${SCENE_RECOVERY_SNAPSHOT_VERSION}.`,
    );
  }
  if (!Array.isArray(value.assets)) {
    throw new Error('Scene recovery snapshot assets must be an array.');
  }
  if (!isRecord(value.bookmark)) {
    throw new Error('Scene recovery snapshot bookmark must be an object.');
  }
  if (
    typeof value.capturedAt !== 'number' ||
    !Number.isFinite(value.capturedAt)
  ) {
    throw new Error('Scene recovery snapshot capturedAt must be finite.');
  }

  const assets = value.assets.map(parseAssetRecord);
  const assetIds = assets.map((asset) => asset.id);
  if (new Set(assetIds).size !== assetIds.length) {
    throw new Error('Scene recovery snapshot asset ids must be unique.');
  }

  const folder = parseBookmarkNode(value.bookmark.folder, 'bookmark.folder');
  if (folder.url !== undefined || folder.children === undefined) {
    throw new Error('Scene recovery bookmark root must be a folder.');
  }

  return {
    assets,
    bookmark: {
      containerId: parseNonEmptyString(
        value.bookmark.containerId,
        'bookmark.containerId',
      ),
      containerTitle: parseNonEmptyString(
        value.bookmark.containerTitle,
        'bookmark.containerTitle',
      ),
      destinationParentId: parseNonEmptyString(
        value.bookmark.destinationParentId,
        'bookmark.destinationParentId',
      ),
      folder,
      folderPath: parseStringArray(
        value.bookmark.folderPath,
        'bookmark.folderPath',
      ),
    },
    capturedAt: value.capturedAt,
    id: parseNonEmptyString(value.id, 'id'),
    sceneId: parseNonEmptyString(value.sceneId, 'sceneId'),
    version: SCENE_RECOVERY_SNAPSHOT_VERSION,
  };
}
