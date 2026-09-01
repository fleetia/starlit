import { processOverlayMedia } from '../overlays/processOverlayMedia';
import {
  deleteIndexedRecord,
  loadSharedAsset,
  saveSharedAsset,
  type SharedAssetRecord,
} from '../platform/storage/indexedDbRecords';
import { SHARED_ASSET_STORE_NAME } from '../platform/storage/mediaStorage';
import {
  SCENE_ASSET_ID_PREFIX,
  type ScenePresetV1,
  type SceneRelinkInput,
} from '../scenes';

type RelinkMediaType = 'image' | 'video';

export type RelinkSceneResourcesDependencies = {
  createId: () => string;
  deleteAsset: (assetId: string) => Promise<void>;
  loadAsset: (assetId: string) => Promise<SharedAssetRecord | null>;
  now: () => Date;
  processFile: typeof processOverlayMedia;
  saveAsset: (asset: SharedAssetRecord) => Promise<void>;
};

export type RelinkSceneResourcesInput = {
  assetFiles: Readonly<Record<string, File>>;
  folder?: SceneRelinkInput['folder'];
  relink: (input: SceneRelinkInput) => Promise<void>;
  scene: ScenePresetV1;
};

const MAX_ASSET_ID_ATTEMPTS = 100;

function getRequiredAssetTypes(
  scene: ScenePresetV1,
): Map<string, Set<RelinkMediaType>> {
  const required = new Map<string, Set<RelinkMediaType>>();

  function add(assetId: string, mediaType: RelinkMediaType): void {
    const mediaTypes = required.get(assetId) ?? new Set<RelinkMediaType>();
    mediaTypes.add(mediaType);
    required.set(assetId, mediaTypes);
  }

  if (scene.appearance.background.source === 'asset') {
    add(
      scene.appearance.background.assetId,
      scene.appearance.background.mediaType,
    );
  }
  scene.canvas.layers.forEach((layer) => {
    if (layer.kind === 'decoration') add(layer.assetId, layer.mediaType);
  });

  return required;
}

async function createUniqueAssetId(
  dependencies: RelinkSceneResourcesDependencies,
  occupiedIds: Set<string>,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ASSET_ID_ATTEMPTS; attempt += 1) {
    const nonce = dependencies.createId();
    const assetId = `${SCENE_ASSET_ID_PREFIX}${nonce}`;
    if (
      nonce.trim() !== '' &&
      !occupiedIds.has(assetId) &&
      (await dependencies.loadAsset(assetId)) === null
    ) {
      occupiedIds.add(assetId);
      return assetId;
    }
  }

  throw new Error('Could not create a unique Scene asset id.');
}

async function cleanupAssets(
  assetIds: readonly string[],
  dependencies: RelinkSceneResourcesDependencies,
): Promise<void> {
  const failures: unknown[] = [];
  for (const assetId of [...assetIds].reverse()) {
    try {
      await dependencies.deleteAsset(assetId);
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, 'Scene relink asset cleanup failed.');
  }
}

const DEFAULT_DEPENDENCIES: RelinkSceneResourcesDependencies = {
  createId: () => crypto.randomUUID(),
  deleteAsset: (assetId) =>
    deleteIndexedRecord(SHARED_ASSET_STORE_NAME, assetId),
  loadAsset: loadSharedAsset,
  now: () => new Date(),
  processFile: processOverlayMedia,
  saveAsset: saveSharedAsset,
};

export async function relinkSceneResources(
  { assetFiles, folder, relink, scene }: RelinkSceneResourcesInput,
  dependencies: RelinkSceneResourcesDependencies = DEFAULT_DEPENDENCIES,
): Promise<void> {
  const requiredTypes = getRequiredAssetTypes(scene);
  const assetIds: Record<string, string> = {};
  const createdAssetIds: string[] = [];
  const occupiedIds = new Set<string>();

  try {
    for (const [sourceAssetId, file] of Object.entries(assetFiles)) {
      const expectedTypes = requiredTypes.get(sourceAssetId);
      if (!expectedTypes || expectedTypes.size !== 1) {
        throw new Error(`Scene asset reference is invalid: ${sourceAssetId}`);
      }

      const processed = await dependencies.processFile(file);
      const processedType: RelinkMediaType =
        processed.mediaKind === 'motion' ? 'video' : 'image';
      if (!expectedTypes.has(processedType)) {
        throw new Error(`Replacement media type does not match: ${file.name}`);
      }

      const assetId = await createUniqueAssetId(dependencies, occupiedIds);
      createdAssetIds.push(assetId);
      await dependencies.saveAsset({
        blob: processed.blob,
        createdAt: dependencies.now().toISOString(),
        id: assetId,
        mediaType: processed.blob.type,
        name: file.name,
        size: processed.blob.size,
      });
      assetIds[sourceAssetId] = assetId;
    }

    await relink({
      ...(Object.keys(assetIds).length > 0 ? { assetIds } : {}),
      ...(folder ? { folder } : {}),
    });
  } catch (error) {
    try {
      await cleanupAssets(createdAssetIds, dependencies);
    } catch (cleanupError) {
      const failure = new AggregateError(
        [error, cleanupError],
        'Scene relink and cleanup both failed.',
      );
      failure.cause = error;
      throw failure;
    }
    throw error;
  }
}
