import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_GRID_SETTINGS } from '../layout/defaults';
import type { SharedAssetRecord } from '../platform/storage/indexedDbRecords';
import { getBookmarkIdKey } from '../bookmarks/bookmarkRoute';
import type { SceneRecoveryRepository } from '../platform/storage/sceneRecoveryRepository';
import type { SceneRepository } from '../platform/storage/sceneRepository';
import { DEFAULT_SETTINGS } from '../settings/defaults';
import { DEFAULT_STARLIT_THEME } from '../theme/defaults';
import type { SceneBookmarkNode } from './bookmarkCopy';
import { parseSceneCollectionV3 } from './codec';
import {
  parseSceneRecoverySnapshotV1,
  type SceneRecoverySnapshotV1,
} from './recovery';
import {
  BACKGROUND_MEDIA_KEY,
  createSceneRuntime,
  type SceneBookmarkResourceAdapter,
  type SceneRuntimeDependencies,
  type SceneRuntimeSnapshot,
} from './runtime';
import type { SceneCollectionV3, ScenePresetV1 } from './types';

const BACKGROUND = new Blob(['recovery-background'], {
  type: 'image/webp',
});

type MemoryRepository = {
  adapter: SceneRepository;
  failNextUpsert: boolean;
  getCollection: () => SceneCollectionV3;
};

type MemoryBookmarks = SceneBookmarkResourceAdapter & {
  nodes: Map<string, SceneBookmarkNode>;
  removeTree: ReturnType<typeof vi.fn<(folderId: string) => Promise<void>>>;
};

type MemoryRecovery = SceneRecoveryRepository & {
  records: Map<string, SceneRecoverySnapshotV1>;
};

type RecoveryHarness = {
  assets: Map<string, SharedAssetRecord>;
  bookmarks: MemoryBookmarks;
  dependencies: SceneRuntimeDependencies;
  recovery: MemoryRecovery;
  repository: MemoryRepository;
};

function createCollection(
  scenes: ScenePresetV1[],
  activeSceneId: string | null = null,
): SceneCollectionV3 {
  return parseSceneCollectionV3({
    activeSceneId,
    scenes,
    storageSchemaVersion: 3,
  });
}

function createMemoryRepository(): MemoryRepository {
  let collection = createCollection([]);
  const memory: MemoryRepository = {
    adapter: {
      deleteScene: async (sceneId): Promise<SceneCollectionV3> => {
        collection = createCollection(
          collection.scenes.filter((scene) => scene.id !== sceneId),
          collection.activeSceneId === sceneId
            ? null
            : collection.activeSceneId,
        );
        return structuredClone(collection);
      },
      load: async (): Promise<SceneCollectionV3> => structuredClone(collection),
      replace: async (next): Promise<void> => {
        collection = structuredClone(next);
      },
      setActiveSceneId: async (sceneId): Promise<SceneCollectionV3> => {
        collection = createCollection(collection.scenes, sceneId);
        return structuredClone(collection);
      },
      upsertScene: async (
        scene,
        makeActive = false,
      ): Promise<SceneCollectionV3> => {
        if (memory.failNextUpsert) {
          memory.failNextUpsert = false;
          throw new Error('repository failed');
        }
        const scenes = collection.scenes.some((item) => item.id === scene.id)
          ? collection.scenes.map((item) =>
              item.id === scene.id ? scene : item,
            )
          : [...collection.scenes, scene];
        collection = createCollection(
          scenes,
          makeActive ? scene.id : collection.activeSceneId,
        );
        return structuredClone(collection);
      },
    },
    failNextUpsert: false,
    getCollection: () => structuredClone(collection),
  };
  return memory;
}

function createMemoryBookmarks(): MemoryBookmarks {
  const nodes = new Map<string, SceneBookmarkNode>([
    ['2', { id: '2', parentId: '0', title: 'Other bookmarks' }],
    [
      'container',
      {
        id: 'container',
        parentId: '2',
        title: 'Starlit Scenes',
      },
    ],
    [
      'scene-folder',
      { id: 'scene-folder', parentId: 'container', title: 'Focus' },
    ],
    [
      'nested-folder',
      { id: 'nested-folder', parentId: 'scene-folder', title: 'Work' },
    ],
    [
      'nested-bookmark',
      {
        id: 'nested-bookmark',
        parentId: 'nested-folder',
        title: 'Starlit',
        url: 'https://example.com/starlit',
      },
    ],
    [
      'unrelated-folder',
      { id: 'unrelated-folder', parentId: 'container', title: 'Focus' },
    ],
  ]);
  let id = 0;

  function getChildren(id: string): SceneBookmarkNode[] {
    return [...nodes.values()]
      .filter((node) => node.parentId === id)
      .map((node) => ({ ...node }));
  }

  function createSubTree(id: string): SceneBookmarkNode {
    const node = nodes.get(id);
    if (!node) {
      throw new Error(`Bookmark is missing: ${id}`);
    }
    return node.url === undefined
      ? {
          ...node,
          children: getChildren(id).map((child) => createSubTree(child.id)),
        }
      : { ...node };
  }

  function deleteSubTree(id: string): void {
    getChildren(id).forEach((child) => deleteSubTree(child.id));
    nodes.delete(id);
  }

  const removeTree = vi.fn(async (folderId: string): Promise<void> => {
    if (!nodes.has(folderId)) {
      throw new Error(`Bookmark is missing: ${folderId}`);
    }
    deleteSubTree(folderId);
  });

  return {
    create: async (input): Promise<SceneBookmarkNode> => {
      if (!nodes.has(input.parentId)) {
        throw new Error(`Bookmark parent is missing: ${input.parentId}`);
      }
      const node: SceneBookmarkNode = {
        id: `restored-${(id += 1)}`,
        parentId: input.parentId,
        title: input.title,
        ...(input.url === undefined ? {} : { url: input.url }),
      };
      nodes.set(node.id, node);
      return { ...node };
    },
    exists: async (folderId): Promise<boolean> => {
      const node = nodes.get(folderId);
      return Boolean(node && node.url === undefined);
    },
    getChildren: async (folderId): Promise<SceneBookmarkNode[]> =>
      getChildren(folderId),
    getSubTree: async (folderId): Promise<SceneBookmarkNode[]> => [
      createSubTree(folderId),
    ],
    nodes,
    removeTree,
  };
}

function createMemoryRecovery(): MemoryRecovery {
  const records = new Map<string, SceneRecoverySnapshotV1>();
  return {
    delete: async (snapshotId): Promise<void> => {
      records.delete(snapshotId);
    },
    load: async (snapshotId) => records.get(snapshotId) ?? null,
    records,
    save: async (snapshot): Promise<void> => {
      records.set(snapshot.id, parseSceneRecoverySnapshotV1(snapshot));
    },
  };
}

function createRuntimeSnapshot(): SceneRuntimeSnapshot {
  return {
    backgroundMeta: { source: 'file', type: 'image', url: '' },
    bookmarkTreePrefs: {
      rootId: 'scene-folder',
      rootPath: ['Starlit Scenes', 'Focus'],
      siblingOrder: {},
    },
    colorTheme: { ...DEFAULT_STARLIT_THEME },
    customCSS: '',
    gridSettings: structuredClone(DEFAULT_GRID_SETTINGS),
    groupPreferences: [],
    iconSize: 28,
    overlayScene: { layers: [{ kind: 'bookmarks' }] },
    settings: { ...DEFAULT_SETTINGS },
    size: 16,
  };
}

function createHarness(): RecoveryHarness {
  const assets = new Map<string, SharedAssetRecord>();
  const bookmarks = createMemoryBookmarks();
  const recovery = createMemoryRecovery();
  const repository = createMemoryRepository();
  const media = new Map([[BACKGROUND_MEDIA_KEY, BACKGROUND]]);
  let id = 0;
  const dependencies: SceneRuntimeDependencies = {
    assets: {
      delete: async (assetId): Promise<void> => {
        assets.delete(assetId);
      },
      load: async (assetId) => assets.get(assetId) ?? null,
      save: async (asset): Promise<void> => {
        assets.set(asset.id, asset);
      },
    },
    bookmarks,
    createId: () => `generated-${(id += 1)}`,
    local: {
      get: async (): Promise<undefined> => undefined,
      remove: async (): Promise<void> => undefined,
      set: async (): Promise<void> => undefined,
    },
    media: {
      delete: async (keys): Promise<void> => {
        keys.forEach((key) => media.delete(key));
      },
      list: async (prefix = '') =>
        [...media.keys()].filter((key) => key.startsWith(prefix)),
      load: async (key) => media.get(key) ?? null,
      save: async (key, blob): Promise<void> => {
        media.set(key, blob);
      },
    },
    now: () => 500,
    recovery,
    repository: repository.adapter,
    sync: {
      get: async (): Promise<undefined> => undefined,
      remove: async (): Promise<void> => undefined,
      set: async (): Promise<void> => undefined,
    },
  };
  return { assets, bookmarks, dependencies, recovery, repository };
}

async function createRecoverableScene(
  harness: RecoveryHarness,
): Promise<ScenePresetV1> {
  const runtime = createSceneRuntime(harness.dependencies);
  const collection = await runtime.createScene(createRuntimeSnapshot(), {
    bookmarkCollection: {
      folderId: 'scene-folder',
      folderOwnership: 'scene',
      folderPath: ['Starlit Scenes', 'Focus'],
      groupPreferences: [
        { key: getBookmarkIdKey('nested-folder'), visible: false },
      ],
      siblingOrder: {
        [getBookmarkIdKey('scene-folder')]: [getBookmarkIdKey('nested-folder')],
      },
    },
    id: 'focus',
    name: 'Focus',
  });
  const scene = collection.scenes[0];
  if (!scene) {
    throw new Error('Scene was not created.');
  }
  return scene;
}

beforeEach((): void => {
  vi.clearAllMocks();
});

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('default Scene recovery snapshot', () => {
  it('restores a missing Scene-owned folder and shared media without overwriting siblings', async () => {
    const harness = createHarness();
    const scene = await createRecoverableScene(harness);
    const runtime = createSceneRuntime(harness.dependencies);
    const background = scene.appearance.background;
    if (background.source !== 'asset') {
      throw new Error('Expected an asset background.');
    }

    expect(scene.bookmarkCollection.recoverySnapshotId).toBe(
      'scene-recovery:focus',
    );
    expect(harness.recovery.records.get('scene-recovery:focus')).toMatchObject({
      assets: [{ id: background.assetId }],
      bookmark: {
        containerId: 'container',
        folder: { sourceId: 'scene-folder', title: 'Focus' },
      },
      sceneId: 'focus',
    });

    harness.assets.delete(background.assetId);
    await harness.bookmarks.removeTree('scene-folder');
    harness.bookmarks.removeTree.mockClear();

    await expect(runtime.getReadiness(scene.id)).resolves.toMatchObject({
      availableActions: ['relink', 'restore'],
      canRestore: true,
      isReady: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          kind: 'asset',
          resourceId: background.assetId,
        }),
        expect.objectContaining({
          kind: 'bookmark-folder',
          resourceId: 'scene-folder',
        }),
      ]),
    });

    const restoredCollection = await runtime.restoreScene(scene.id);
    const restored = restoredCollection.scenes[0];
    const restoredFolderId = restored?.bookmarkCollection.folderId;
    expect(restoredFolderId).toMatch(/^restored-/);
    expect(restoredFolderId).not.toBe('scene-folder');
    expect(harness.bookmarks.nodes.has('unrelated-folder')).toBe(true);
    expect(
      [...harness.bookmarks.nodes.values()].filter(
        (node) => node.parentId === 'container' && node.title === 'Focus',
      ),
    ).toHaveLength(2);
    expect(
      [...harness.bookmarks.nodes.values()].some(
        (node) => node.parentId === restoredFolderId && node.title === 'Work',
      ),
    ).toBe(true);
    const restoredNested = [...harness.bookmarks.nodes.values()].find(
      (node) => node.parentId === restoredFolderId && node.title === 'Work',
    );
    expect(restored?.bookmarkCollection.groupPreferences).toEqual([
      { key: getBookmarkIdKey(restoredNested?.id ?? ''), visible: false },
    ]);
    expect(restored?.bookmarkCollection.siblingOrder).toEqual({
      [getBookmarkIdKey(restoredFolderId ?? '')]: [
        getBookmarkIdKey(restoredNested?.id ?? ''),
      ],
    });
    await expect(
      harness.assets.get(background.assetId)?.blob.text(),
    ).resolves.toBe('recovery-background');
    await expect(runtime.getReadiness(scene.id)).resolves.toMatchObject({
      isReady: true,
    });
  });

  it('compensates restored assets and bookmark nodes when the Scene record commit fails', async () => {
    const harness = createHarness();
    const scene = await createRecoverableScene(harness);
    const runtime = createSceneRuntime(harness.dependencies);
    const background = scene.appearance.background;
    if (background.source !== 'asset') {
      throw new Error('Expected an asset background.');
    }

    harness.assets.delete(background.assetId);
    await harness.bookmarks.removeTree('scene-folder');
    harness.bookmarks.removeTree.mockClear();
    const nodeIdsBeforeRestore = [...harness.bookmarks.nodes.keys()].sort();
    harness.repository.failNextUpsert = true;

    await expect(runtime.restoreScene(scene.id)).rejects.toThrow(
      'repository failed',
    );

    expect(harness.assets.has(background.assetId)).toBe(false);
    expect([...harness.bookmarks.nodes.keys()].sort()).toEqual(
      nodeIdsBeforeRestore,
    );
    expect(harness.bookmarks.removeTree).toHaveBeenCalledTimes(1);
    expect(
      harness.repository.getCollection().scenes[0]?.bookmarkCollection.folderId,
    ).toBe('scene-folder');
  });

  it('overwrites the same recovery snapshot when a Scene keeps its owned folder', async () => {
    const harness = createHarness();
    const scene = await createRecoverableScene(harness);
    const runtime = createSceneRuntime(harness.dependencies);
    const previousBackground = scene.appearance.background;
    if (previousBackground.source !== 'asset') {
      throw new Error('Expected an asset background.');
    }

    const next = await runtime.updateScene('focus', createRuntimeSnapshot());
    const updated = next.scenes[0];
    const updatedBackground = updated?.appearance.background;
    if (!updated || updatedBackground?.source !== 'asset') {
      throw new Error('Expected an updated asset background.');
    }

    expect(updated.bookmarkCollection.recoverySnapshotId).toBe(
      'scene-recovery:focus',
    );
    expect(updatedBackground.assetId).not.toBe(previousBackground.assetId);
    expect(harness.recovery.records.get('scene-recovery:focus')).toMatchObject({
      assets: [{ id: updatedBackground.assetId }],
      sceneId: 'focus',
    });
    expect(
      harness.recovery.records
        .get('scene-recovery:focus')
        ?.assets.some((asset) => asset.id === previousBackground.assetId),
    ).toBe(false);
  });

  it('restores the previous recovery snapshot when an owned-folder update commit fails', async () => {
    const harness = createHarness();
    const scene = await createRecoverableScene(harness);
    const recovery = harness.recovery.records.get('scene-recovery:focus');
    if (!recovery) throw new Error('Expected a Scene recovery snapshot.');
    const previousRecovery = structuredClone(recovery);
    harness.repository.failNextUpsert = true;
    const runtime = createSceneRuntime(harness.dependencies);

    await expect(
      runtime.updateScene('focus', createRuntimeSnapshot()),
    ).rejects.toThrow('repository failed');

    const restoredRecovery = harness.recovery.records.get(
      'scene-recovery:focus',
    );
    expect(restoredRecovery?.assets.map((asset) => asset.id)).toEqual(
      previousRecovery.assets.map((asset) => asset.id),
    );
    expect(restoredRecovery?.bookmark).toEqual(previousRecovery.bookmark);
    await expect(restoredRecovery?.assets[0]?.blob.text()).resolves.toBe(
      'recovery-background',
    );
    expect(harness.repository.getCollection().scenes[0]).toEqual(scene);
  });

  it('deletes an unreferenced recovery snapshot after moving to an external folder', async () => {
    const harness = createHarness();
    await createRecoverableScene(harness);
    const runtime = createSceneRuntime(harness.dependencies);
    const snapshot = createRuntimeSnapshot();
    snapshot.bookmarkTreePrefs = {
      rootId: 'unrelated-folder',
      rootPath: ['Starlit Scenes', 'External'],
      siblingOrder: {},
    };

    const next = await runtime.updateScene('focus', snapshot);

    expect(next.scenes[0]?.bookmarkCollection).toMatchObject({
      folderId: 'unrelated-folder',
      folderOwnership: 'external',
    });
    expect(
      next.scenes[0]?.bookmarkCollection.recoverySnapshotId,
    ).toBeUndefined();
    expect(harness.recovery.records.has('scene-recovery:focus')).toBe(false);
  });

  it('keeps the external-folder update committed when old recovery cleanup fails', async () => {
    const harness = createHarness();
    await createRecoverableScene(harness);
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    vi.spyOn(harness.recovery, 'delete').mockRejectedValueOnce(
      new Error('recovery cleanup failed'),
    );
    const runtime = createSceneRuntime(harness.dependencies);
    const snapshot = createRuntimeSnapshot();
    snapshot.bookmarkTreePrefs = {
      rootId: 'unrelated-folder',
      rootPath: ['Starlit Scenes', 'External'],
      siblingOrder: {},
    };

    const next = await runtime.updateScene('focus', snapshot);

    expect(next.scenes[0]?.bookmarkCollection.folderOwnership).toBe('external');
    expect(harness.recovery.records.has('scene-recovery:focus')).toBe(true);
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Scene recovery snapshot cleanup failed.',
      }),
    );
  });

  it('clears and deletes the old recovery snapshot when relinking to another folder', async () => {
    const harness = createHarness();
    const scene = await createRecoverableScene(harness);
    const runtime = createSceneRuntime(harness.dependencies);

    const next = await runtime.relinkScene(scene.id, {
      folder: {
        id: 'unrelated-folder',
        path: ['Starlit Scenes', 'External'],
      },
    });

    expect(next.scenes[0]?.bookmarkCollection).toMatchObject({
      folderId: 'unrelated-folder',
      folderOwnership: 'external',
    });
    expect(
      next.scenes[0]?.bookmarkCollection.recoverySnapshotId,
    ).toBeUndefined();
    expect(harness.recovery.records.has('scene-recovery:focus')).toBe(false);
  });

  it('recaptures replacement assets before committing an asset-only relink', async () => {
    const harness = createHarness();
    const scene = await createRecoverableScene(harness);
    const background = scene.appearance.background;
    if (background.source !== 'asset') {
      throw new Error('Expected an asset background.');
    }
    const replacementBlob = new Blob(['replacement-background'], {
      type: 'image/webp',
    });
    harness.assets.set('replacement-background', {
      blob: replacementBlob,
      createdAt: '2026-01-01T00:00:00.000Z',
      id: 'replacement-background',
      mediaType: replacementBlob.type,
      name: 'replacement.webp',
      size: replacementBlob.size,
    });
    const runtime = createSceneRuntime(harness.dependencies);

    const next = await runtime.relinkScene(scene.id, {
      assetIds: { [background.assetId]: 'replacement-background' },
    });

    expect(next.scenes[0]?.bookmarkCollection.recoverySnapshotId).toBe(
      'scene-recovery:focus',
    );
    expect(harness.recovery.records.get('scene-recovery:focus')).toMatchObject({
      assets: [{ id: 'replacement-background' }],
    });

    harness.assets.delete('replacement-background');
    await expect(runtime.getReadiness(scene.id)).resolves.toMatchObject({
      canRestore: true,
      isReady: false,
    });
    await runtime.restoreScene(scene.id);
    await expect(
      harness.assets.get('replacement-background')?.blob.text(),
    ).resolves.toBe('replacement-background');
  });
});
