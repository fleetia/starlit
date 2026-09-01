import { parseSceneCollectionV3, parseScenePresetV1 } from '../../scenes/codec';
import {
  SCENE_STORAGE_SCHEMA_VERSION,
  type SceneCollectionV3,
  type ScenePresetV1,
} from '../../scenes/types';
import {
  listIndexedRecords,
  replaceIndexedRecordSet,
} from './indexedDbRecords';
import { SCENE_STORE_NAME } from './mediaStorage';
import storage from './storage';
import {
  createSelfRestoringTransactionStep,
  runStorageTransaction,
} from './transactionCoordinator';

export const SCENE_INDEX_STORAGE_KEY = 'sceneIndex';
export const ACTIVE_SCENE_ID_STORAGE_KEY = 'activeSceneId';
export const SCENE_RECORD_KEY_PREFIX = 'scene:';

type SceneIndexV3 = {
  activeSceneId: string | null;
  sceneIds: string[];
  storageSchemaVersion: typeof SCENE_STORAGE_SCHEMA_VERSION;
};

type SceneRecordAdapter = {
  list: () => Promise<Array<readonly [string, unknown]>>;
  replace: (entries: readonly (readonly [string, unknown])[]) => Promise<void>;
};

type SceneIndexAdapter = {
  get: () => Promise<unknown>;
  remove: () => Promise<void>;
  set: (index: SceneIndexV3) => Promise<void>;
};

export type SceneRepositoryDependencies = {
  index: SceneIndexAdapter;
  records: SceneRecordAdapter;
};

export type SceneRepository = {
  deleteScene: (sceneId: string) => Promise<SceneCollectionV3>;
  load: () => Promise<SceneCollectionV3>;
  replace: (collection: SceneCollectionV3) => Promise<void>;
  setActiveSceneId: (sceneId: string | null) => Promise<SceneCollectionV3>;
  upsertScene: (
    scene: ScenePresetV1,
    makeActive?: boolean,
  ) => Promise<SceneCollectionV3>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSceneIndex(value: unknown): SceneIndexV3 | null {
  if (value === undefined || value === null) return null;
  if (
    !isRecord(value) ||
    value.storageSchemaVersion !== SCENE_STORAGE_SCHEMA_VERSION ||
    (value.activeSceneId !== null && typeof value.activeSceneId !== 'string') ||
    !Array.isArray(value.sceneIds) ||
    !value.sceneIds.every((id) => typeof id === 'string')
  ) {
    throw new Error('Stored Scene index is invalid or unsupported.');
  }

  const sceneIds = [...new Set(value.sceneIds)];
  if (value.activeSceneId !== null && !sceneIds.includes(value.activeSceneId)) {
    throw new Error('Stored active Scene is missing from the Scene index.');
  }

  return {
    activeSceneId: value.activeSceneId,
    sceneIds,
    storageSchemaVersion: SCENE_STORAGE_SCHEMA_VERSION,
  };
}

function getSceneRecordKey(sceneId: string): string {
  return `${SCENE_RECORD_KEY_PREFIX}${sceneId}`;
}

function createSceneIndex(collection: SceneCollectionV3): SceneIndexV3 {
  return {
    activeSceneId: collection.activeSceneId,
    sceneIds: collection.scenes.map((scene) => scene.id),
    storageSchemaVersion: SCENE_STORAGE_SCHEMA_VERSION,
  };
}

function toSceneEntries(
  collection: SceneCollectionV3,
): Array<readonly [string, unknown]> {
  return collection.scenes.map(
    (scene) => [getSceneRecordKey(scene.id), scene] as const,
  );
}

async function restoreSceneIndex(
  adapter: SceneIndexAdapter,
  previous: SceneIndexV3 | null,
): Promise<void> {
  if (previous) {
    await adapter.set(previous);
    return;
  }

  await adapter.remove();
}

export function createSceneRepository(
  dependencies: SceneRepositoryDependencies,
): SceneRepository {
  async function load(): Promise<SceneCollectionV3> {
    const [rawIndex, rawEntries] = await Promise.all([
      dependencies.index.get(),
      dependencies.records.list(),
    ]);
    const index = parseSceneIndex(rawIndex);
    const parsedEntries = new Map(
      rawEntries.flatMap(([key, value]) => {
        if (!key.startsWith(SCENE_RECORD_KEY_PREFIX)) return [];
        const scene = parseScenePresetV1(value);
        return [[scene.id, scene] as const];
      }),
    );
    const sceneIds = index?.sceneIds ?? [...parsedEntries.keys()].sort();
    const scenes = sceneIds.map((id) => {
      const scene = parsedEntries.get(id);
      if (!scene) throw new Error(`Scene record is missing: ${id}`);
      return scene;
    });

    return parseSceneCollectionV3({
      activeSceneId: index?.activeSceneId ?? null,
      scenes,
      storageSchemaVersion: SCENE_STORAGE_SCHEMA_VERSION,
    });
  }

  async function replace(collection: SceneCollectionV3): Promise<void> {
    const validatedCollection = parseSceneCollectionV3(collection);
    const [previousEntries, rawPreviousIndex] = await Promise.all([
      dependencies.records.list(),
      dependencies.index.get(),
    ]);
    const previousIndex = parseSceneIndex(rawPreviousIndex);
    const indexStep = createSelfRestoringTransactionStep(
      'Scene index',
      () => dependencies.index.set(createSceneIndex(validatedCollection)),
      () => restoreSceneIndex(dependencies.index, previousIndex),
    );

    await runStorageTransaction({
      commit: indexStep.apply,
      steps: [
        createSelfRestoringTransactionStep(
          'Scene records',
          () =>
            dependencies.records.replace(toSceneEntries(validatedCollection)),
          () => dependencies.records.replace(previousEntries),
        ),
      ],
    });
  }

  async function upsertScene(
    scene: ScenePresetV1,
    makeActive = false,
  ): Promise<SceneCollectionV3> {
    const validatedScene = parseScenePresetV1(scene);
    const current = await load();
    const existingIndex = current.scenes.findIndex(
      (candidate) => candidate.id === validatedScene.id,
    );
    const scenes = [...current.scenes];

    if (existingIndex < 0) scenes.push(validatedScene);
    else scenes[existingIndex] = validatedScene;

    const next = parseSceneCollectionV3({
      activeSceneId: makeActive ? validatedScene.id : current.activeSceneId,
      scenes,
      storageSchemaVersion: SCENE_STORAGE_SCHEMA_VERSION,
    });
    await replace(next);
    return next;
  }

  async function deleteScene(sceneId: string): Promise<SceneCollectionV3> {
    const current = await load();
    const next = parseSceneCollectionV3({
      activeSceneId:
        current.activeSceneId === sceneId ? null : current.activeSceneId,
      scenes: current.scenes.filter((scene) => scene.id !== sceneId),
      storageSchemaVersion: SCENE_STORAGE_SCHEMA_VERSION,
    });
    await replace(next);
    return next;
  }

  async function setActiveSceneId(
    sceneId: string | null,
  ): Promise<SceneCollectionV3> {
    const current = await load();
    if (
      sceneId !== null &&
      !current.scenes.some((scene) => scene.id === sceneId)
    ) {
      throw new Error(`Scene does not exist: ${sceneId}`);
    }

    const next = parseSceneCollectionV3({
      ...current,
      activeSceneId: sceneId,
    });
    const rawPreviousIndex = await dependencies.index.get();
    const previousIndex = parseSceneIndex(rawPreviousIndex);
    await createSelfRestoringTransactionStep(
      'Active Scene index',
      () => dependencies.index.set(createSceneIndex(next)),
      () => restoreSceneIndex(dependencies.index, previousIndex),
    ).apply();
    return next;
  }

  return { deleteScene, load, replace, setActiveSceneId, upsertScene };
}

export const sceneRepository = createSceneRepository({
  index: {
    get: () => storage.local.get(SCENE_INDEX_STORAGE_KEY),
    remove: () =>
      storage.local.remove([
        ACTIVE_SCENE_ID_STORAGE_KEY,
        SCENE_INDEX_STORAGE_KEY,
      ]),
    set: (index) =>
      storage.local.set({
        [ACTIVE_SCENE_ID_STORAGE_KEY]: index.activeSceneId,
        [SCENE_INDEX_STORAGE_KEY]: index,
      }),
  },
  records: {
    list: async () =>
      (await listIndexedRecords(SCENE_STORE_NAME)).filter(([key]) =>
        key.startsWith(SCENE_RECORD_KEY_PREFIX),
      ),
    replace: (entries) =>
      replaceIndexedRecordSet(
        SCENE_STORE_NAME,
        SCENE_RECORD_KEY_PREFIX,
        entries,
      ),
  },
});
