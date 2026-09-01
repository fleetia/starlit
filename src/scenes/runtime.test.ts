import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_GRID_SETTINGS } from '../layout/defaults';
import type { OverlayScene } from '../overlays/types';
import type { SharedAssetRecord } from '../platform/storage/indexedDbRecords';
import type { SceneRepository } from '../platform/storage/sceneRepository';
import { DEFAULT_SETTINGS } from '../settings/defaults';
import { DEFAULT_STARLIT_THEME } from '../theme/defaults';
import { parseSceneCollectionV3 } from './codec';
import {
  BACKGROUND_MEDIA_KEY,
  createScenePresetSnapshot,
  createSceneRuntime,
  projectCanvasSceneToOverlayScene,
  projectOverlaySceneToCanvasScene,
  type SceneAssetAdapter,
  type SceneBookmarkResourceAdapter,
  type SceneMediaAdapter,
  type SceneRuntimeDependencies,
  type SceneRuntimeSnapshot,
  type SceneStorageAreaAdapter,
} from './runtime';
import { createSceneFixture } from './testFixtures';
import type {
  CanvasDecorationLayerV2,
  CanvasSceneV2,
  SceneCollectionV3,
  ScenePresetV1,
} from './types';

const OLD_BACKGROUND = new Blob(['old-background'], { type: 'image/webp' });
const OLD_DECORATION = new Blob(['old-decoration'], { type: 'image/webp' });
const NEW_BACKGROUND = new Blob(['new-background'], { type: 'video/webm' });
const NEW_DECORATION = new Blob(['new-decoration'], { type: 'video/webm' });

type MemoryArea = {
  adapter: SceneStorageAreaAdapter;
  failNextSetAfterWrite: boolean;
  state: Record<string, unknown>;
};

type MemoryMedia = {
  adapter: SceneMediaAdapter;
  failNextSaveAfterWrite: boolean;
  state: Map<string, Blob>;
};

type MemoryAssets = {
  adapter: SceneAssetAdapter;
  failSaveNumber: number | null;
  saveCount: number;
  state: Map<string, SharedAssetRecord>;
};

type RuntimeHarness = {
  activeEvents: string[];
  assets: MemoryAssets;
  bookmarks: SceneBookmarkResourceAdapter & {
    existingIds: Set<string>;
    removeTree: ReturnType<typeof vi.fn<(folderId: string) => Promise<void>>>;
  };
  dependencies: SceneRuntimeDependencies;
  events: string[];
  getCollection: () => SceneCollectionV3;
  local: MemoryArea;
  media: MemoryMedia;
  repository: SceneRepository;
  sync: MemoryArea;
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

function createMemoryArea(
  initial: Record<string, unknown>,
  events: string[],
  label: string,
): MemoryArea {
  const area: MemoryArea = {
    adapter: {
      get: async (key) => area.state[key],
      remove: async (keys) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        keyList.forEach((key) => delete area.state[key]);
      },
      set: async (items) => {
        events.push(label);
        Object.assign(area.state, items);
        if (area.failNextSetAfterWrite) {
          area.failNextSetAfterWrite = false;
          throw new Error(`${label} failed`);
        }
      },
    },
    failNextSetAfterWrite: false,
    state: structuredClone(initial),
  };
  return area;
}

function createMemoryMedia(
  initial: ReadonlyMap<string, Blob>,
  events: string[],
): MemoryMedia {
  const media: MemoryMedia = {
    adapter: {
      delete: async (keys) => {
        events.push('media');
        keys.forEach((key) => media.state.delete(key));
      },
      list: async (prefix = '') =>
        [...media.state.keys()].filter((key) => key.startsWith(prefix)),
      load: async (key) => media.state.get(key) ?? null,
      save: async (key, blob) => {
        events.push('media');
        media.state.set(key, blob);
        if (media.failNextSaveAfterWrite) {
          media.failNextSaveAfterWrite = false;
          throw new Error('media failed');
        }
      },
    },
    failNextSaveAfterWrite: false,
    state: new Map(initial),
  };
  return media;
}

function createMemoryAssets(
  initial: ReadonlyMap<string, SharedAssetRecord>,
): MemoryAssets {
  const assets: MemoryAssets = {
    adapter: {
      delete: async (assetId) => {
        assets.state.delete(assetId);
      },
      load: async (assetId) => assets.state.get(assetId) ?? null,
      save: async (asset) => {
        assets.saveCount += 1;
        assets.state.set(asset.id, asset);
        if (assets.failSaveNumber === assets.saveCount) {
          throw new Error('asset failed');
        }
      },
    },
    failSaveNumber: null,
    saveCount: 0,
    state: new Map(initial),
  };
  return assets;
}

function createMemoryRepository(
  initial: SceneCollectionV3,
  events: string[],
  activeEvents: string[],
): { getCollection: () => SceneCollectionV3; repository: SceneRepository } {
  let collection = structuredClone(initial);
  const repository: SceneRepository = {
    deleteScene: async (sceneId) => {
      collection = createCollection(
        collection.scenes.filter((scene) => scene.id !== sceneId),
        collection.activeSceneId === sceneId ? null : collection.activeSceneId,
      );
      return structuredClone(collection);
    },
    load: async () => structuredClone(collection),
    replace: async (next) => {
      collection = structuredClone(next);
    },
    setActiveSceneId: async (sceneId) => {
      const event = `active:${sceneId ?? 'null'}`;
      events.push(event);
      activeEvents.push(event);
      collection = createCollection(collection.scenes, sceneId);
      return structuredClone(collection);
    },
    upsertScene: async (scene, makeActive = false) => {
      const scenes = collection.scenes.some((item) => item.id === scene.id)
        ? collection.scenes.map((item) => (item.id === scene.id ? scene : item))
        : [...collection.scenes, scene];
      collection = createCollection(
        scenes,
        makeActive ? scene.id : collection.activeSceneId,
      );
      return structuredClone(collection);
    },
  };
  return {
    getCollection: () => structuredClone(collection),
    repository,
  };
}

function createAsset(id: string, blob: Blob, name = id): SharedAssetRecord {
  return {
    blob,
    createdAt: '2026-01-01T00:00:00.000Z',
    id,
    mediaType: blob.type,
    name,
    size: blob.size,
  };
}

function createDecoration(
  id: string,
  assetId: string,
): CanvasDecorationLayerV2 {
  return {
    anchor: 'bottom-right',
    assetId,
    frame: { height: 100, offsetX: 20, offsetY: 30, width: 120 },
    groupId: 'night',
    id,
    isHidden: true,
    isLocked: true,
    kind: 'decoration',
    mediaType: 'video',
    name: 'Moon',
    playbackMode: 'active-tab-only',
    playbackRate: 1.5,
    rotationDeg: 15,
    scale: 1.2,
  };
}

function createCanvasWithClock(decorationAssetId: string): CanvasSceneV2 {
  return {
    layers: [
      {
        anchor: 'top-right',
        config: { hourCycle: 'h24', showSeconds: true },
        frame: { height: 80, offsetX: 10, offsetY: 10, width: 180 },
        id: 'clock',
        isHidden: false,
        isLocked: false,
        kind: 'widget',
        widgetType: 'clock',
      },
      createDecoration('current-decoration', decorationAssetId),
      { id: 'bookmarks', kind: 'bookmarks' },
    ],
    version: 2,
  };
}

function createSceneWithResources(id = 'scene-target'): ScenePresetV1 {
  const base = createSceneFixture({ id, name: 'Night' });
  return createSceneFixture({
    ...base,
    appearance: {
      ...base.appearance,
      background: {
        assetId: 'asset-background',
        mediaType: 'video',
        source: 'asset',
      },
    },
    bookmarkCollection: {
      ...base.bookmarkCollection,
      folderId: 'scene-folder',
      folderOwnership: 'scene',
    },
    canvas: {
      layers: [
        createDecoration('decoration-new', 'asset-decoration'),
        { id: 'bookmarks', kind: 'bookmarks' },
      ],
      version: 2,
    },
  });
}

function createRuntimeSnapshot(
  overlayScene: OverlayScene = {
    layers: [
      { kind: 'bookmarks' },
      {
        anchor: 'bottom-right',
        height: 100,
        id: 'current-decoration',
        kind: 'image',
        mediaKind: 'motion',
        name: 'Current moon',
        offsetX: 10,
        offsetY: 20,
        playbackMode: 'active-tab-only',
        playbackRate: 1,
        rotationDeg: 0,
        width: 100,
      },
    ],
  },
): SceneRuntimeSnapshot {
  return {
    backgroundMeta: { source: 'file', type: 'video', url: '' },
    bookmarkTreePrefs: {
      rootId: 'current-folder',
      rootPath: ['Current'],
      siblingOrder: {},
    },
    colorTheme: { ...DEFAULT_STARLIT_THEME },
    customCSS: '',
    gridSettings: structuredClone(DEFAULT_GRID_SETTINGS),
    groupPreferences: [],
    iconSize: 28,
    overlayScene,
    settings: { ...DEFAULT_SETTINGS, isOpenInNewTab: true },
    size: 16,
  };
}

function createHarness(initial: SceneCollectionV3): RuntimeHarness {
  const events: string[] = [];
  const activeEvents: string[] = [];
  const sync = createMemoryArea(
    {
      backgroundMeta: {
        source: 'url',
        type: 'image',
        url: 'https://legacy.example/private-background.jpg',
      },
      backgroundImage: 'https://legacy.example/background.jpg',
      bookmarkTreePrefs: { rootPath: ['Old'], siblingOrder: {} },
      bookmarks: [
        { title: 'Legacy private URL', url: 'https://legacy.example/private' },
      ],
      colorTheme: { ...DEFAULT_STARLIT_THEME },
      customCSS: '.old {}',
      displaySize: 20,
      gridSettings: structuredClone(DEFAULT_GRID_SETTINGS),
      groupPreferences: [{ key: 'Old', visible: true }],
      iconSize: 24,
      locale: 'ko',
      settings: { ...DEFAULT_SETTINGS, isOpenInNewTab: true },
      size: 14,
    },
    events,
    'sync',
  );
  const local = createMemoryArea(
    { overlayScene: { layers: [{ kind: 'bookmarks' }] } },
    events,
    'local',
  );
  const media = createMemoryMedia(
    new Map([
      [BACKGROUND_MEDIA_KEY, OLD_BACKGROUND],
      ['overlayImage:old-decoration', OLD_DECORATION],
    ]),
    events,
  );
  const assets = createMemoryAssets(
    new Map([
      ['asset-background', createAsset('asset-background', NEW_BACKGROUND)],
      ['asset-decoration', createAsset('asset-decoration', NEW_DECORATION)],
    ]),
  );
  const memoryRepository = createMemoryRepository(
    initial,
    events,
    activeEvents,
  );
  const removeTree = vi.fn<(folderId: string) => Promise<void>>();
  const bookmarks = {
    existingIds: new Set(['scene-folder']),
    exists: async (folderId: string) => bookmarks.existingIds.has(folderId),
    removeTree,
  };
  let id = 0;
  const dependencies: SceneRuntimeDependencies = {
    assets: assets.adapter,
    bookmarks,
    createId: () => `generated-${(id += 1)}`,
    local: local.adapter,
    media: media.adapter,
    now: () => 500,
    repository: memoryRepository.repository,
    sync: sync.adapter,
  };
  return {
    activeEvents,
    assets,
    bookmarks,
    dependencies,
    events,
    getCollection: memoryRepository.getCollection,
    local,
    media,
    repository: memoryRepository.repository,
    sync,
  };
}

function snapshotHarness(harness: RuntimeHarness): {
  local: Record<string, unknown>;
  media: Array<[string, Blob]>;
  sync: Record<string, unknown>;
} {
  return {
    local: structuredClone(harness.local.state),
    media: [...harness.media.state.entries()],
    sync: structuredClone(harness.sync.state),
  };
}

beforeEach((): void => {
  vi.clearAllMocks();
});

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('Scene compatibility projection', () => {
  it('preserves legacy-compatible layer order and motion editing fields', () => {
    const canvas: CanvasSceneV2 = {
      layers: [
        createDecoration('front', 'shared-front'),
        {
          anchor: 'top-right',
          config: { hourCycle: 'locale', showSeconds: false },
          frame: { height: 80, offsetX: 10, offsetY: 10, width: 180 },
          id: 'clock',
          isHidden: false,
          isLocked: false,
          kind: 'widget',
          widgetType: 'clock',
        },
        { id: 'bookmarks', kind: 'bookmarks' },
        createDecoration('back', 'shared-back'),
      ],
      version: 2,
    };

    const overlay = projectCanvasSceneToOverlayScene(canvas);

    expect(overlay.layers.map((layer) => layer.kind)).toEqual([
      'image',
      'bookmarks',
      'image',
    ]);
    expect(overlay.layers[0]).toMatchObject({
      groupId: 'night',
      hidden: true,
      locked: true,
      mediaKind: 'motion',
      playbackMode: 'active-tab-only',
      playbackRate: 1.5,
    });
    expect(
      projectOverlaySceneToCanvasScene(overlay, {
        back: 'shared-back',
        front: 'shared-front',
      }).layers,
    ).toMatchObject([
      { assetId: 'shared-front', id: 'front', kind: 'decoration' },
      { id: 'bookmarks', kind: 'bookmarks' },
      { assetId: 'shared-back', id: 'back', kind: 'decoration' },
    ]);
  });

  it('preserves the current canvas while refreshing decoration assets', () => {
    const snapshot = createRuntimeSnapshot();
    snapshot.canvas = createCanvasWithClock('stale-decoration');
    const scene = createScenePresetSnapshot(snapshot, {
      assetReferences: {
        backgroundAssetId: 'background',
        decorationAssetIds: { 'current-decoration': 'decoration' },
      },
      bookmarkCollection: {
        folderId: 'dedicated',
        folderOwnership: 'scene',
        folderPath: ['Starlit Scenes', 'Focus'],
        groupPreferences: [],
        siblingOrder: {},
      },
      id: 'focus',
      name: 'Focus',
      now: 100,
    });

    expect(scene.appearance.bookmark).not.toHaveProperty('isOpenInNewTab');
    expect(scene.canvas.layers).toMatchObject([
      {
        config: { hourCycle: 'h24', showSeconds: true },
        id: 'clock',
        kind: 'widget',
        widgetType: 'clock',
      },
      {
        assetId: 'decoration',
        id: 'current-decoration',
        kind: 'decoration',
      },
      { id: 'bookmarks', kind: 'bookmarks' },
    ]);
  });
});

describe('Scene runtime transactions', () => {
  it('compensates shared assets when snapshot persistence fails', async () => {
    const harness = createHarness(createCollection([]));
    harness.media.state.set(BACKGROUND_MEDIA_KEY, NEW_BACKGROUND);
    harness.media.state.set('overlayImage:current-decoration', NEW_DECORATION);
    harness.assets.state.clear();
    harness.assets.failSaveNumber = 2;
    const upsert = vi.spyOn(harness.repository, 'upsertScene');
    const runtime = createSceneRuntime(harness.dependencies);

    await expect(
      runtime.createScene(createRuntimeSnapshot(), {
        bookmarkCollection: {
          folderId: 'scene-folder',
          folderOwnership: 'scene',
          folderPath: ['Starlit Scenes', 'Focus'],
          groupPreferences: [],
          siblingOrder: {},
        },
        id: 'new-scene',
        name: 'Focus',
      }),
    ).rejects.toThrow('asset failed');

    expect(harness.assets.state).toEqual(new Map());
    expect(upsert).not.toHaveBeenCalled();
    expect(harness.getCollection().activeSceneId).toBeNull();
  });

  it('rejects a new Scene id collision before copying shared assets', async () => {
    const existing = createSceneWithResources('existing');
    const harness = createHarness(createCollection([existing]));
    const saveAsset = vi.spyOn(harness.assets.adapter, 'save');
    const runtime = createSceneRuntime(harness.dependencies);

    await expect(
      runtime.createScene(createRuntimeSnapshot(), {
        bookmarkCollection: {
          folderId: 'new-folder',
          folderOwnership: 'scene',
          folderPath: ['Starlit Scenes', 'New'],
          groupPreferences: [],
          siblingOrder: {},
        },
        id: 'existing',
        name: 'New',
      }),
    ).rejects.toThrow('Scene id already exists');

    expect(saveAsset).not.toHaveBeenCalled();
    expect(harness.getCollection().scenes).toHaveLength(1);
  });

  it('updates an existing Scene and duplicates it with an independent bookmark folder', async () => {
    const source = createSceneWithResources('source');
    const harness = createHarness(createCollection([source], 'source'));
    harness.media.state.set(BACKGROUND_MEDIA_KEY, NEW_BACKGROUND);
    harness.media.state.set('overlayImage:current-decoration', NEW_DECORATION);
    const runtime = createSceneRuntime(harness.dependencies);
    const snapshot = createRuntimeSnapshot();
    snapshot.canvas = createCanvasWithClock('stale-decoration');

    const updated = await runtime.updateScene('source', snapshot, {
      name: 'Updated',
    });
    const updatedScene = updated.scenes[0];

    expect(updatedScene).toMatchObject({
      bookmarkCollection: {
        folderId: 'current-folder',
        folderOwnership: 'external',
        folderPath: ['Current'],
      },
      createdAt: source.createdAt,
      id: 'source',
      name: 'Updated',
      updatedAt: 500,
    });
    expect(updated.activeSceneId).toBe('source');
    expect(harness.assets.state.size).toBe(2);
    expect(updatedScene?.canvas.layers.map((layer) => layer.kind)).toEqual([
      'widget',
      'decoration',
      'bookmarks',
    ]);
    const updatedDecoration = updatedScene?.canvas.layers.find(
      (layer) => layer.kind === 'decoration',
    );
    expect(updatedDecoration).toMatchObject({
      id: 'current-decoration',
      kind: 'decoration',
    });
    expect(updatedDecoration?.assetId).not.toBe('stale-decoration');
    expect(
      updatedDecoration === undefined
        ? undefined
        : harness.assets.state.get(updatedDecoration.assetId)?.blob,
    ).toBe(NEW_DECORATION);

    const duplicated = await runtime.duplicateScene('source', {
      bookmarkCollection: {
        folderId: 'copy-folder',
        folderOwnership: 'scene',
        folderPath: ['Starlit Scenes', 'Copy'],
        groupPreferences: [],
        siblingOrder: {},
      },
      id: 'copy',
      name: 'Copy',
    });
    const copy = duplicated.scenes.find((scene) => scene.id === 'copy');

    expect(copy?.bookmarkCollection.folderId).toBe('copy-folder');
    expect(copy?.canvas).toEqual(updatedScene?.canvas);
    expect(duplicated.activeSceneId).toBe('copy');
    expect(harness.assets.state.size).toBe(2);
  });

  it('deletes orphaned previous assets only after the Scene update commits', async () => {
    const source = createSceneWithResources('source');
    const harness = createHarness(createCollection([source], 'source'));
    harness.media.state.set(BACKGROUND_MEDIA_KEY, NEW_BACKGROUND);
    harness.media.state.set('overlayImage:current-decoration', NEW_DECORATION);
    const upsertScene = vi.spyOn(harness.repository, 'upsertScene');
    const deleteAsset = vi.spyOn(harness.assets.adapter, 'delete');
    const runtime = createSceneRuntime(harness.dependencies);

    const updated = await runtime.updateScene(
      'source',
      createRuntimeSnapshot(),
    );

    expect(deleteAsset).toHaveBeenCalledWith('asset-background');
    expect(deleteAsset).toHaveBeenCalledWith('asset-decoration');
    expect(upsertScene.mock.invocationCallOrder[0]).toBeLessThan(
      deleteAsset.mock.invocationCallOrder[0] ?? 0,
    );
    expect(harness.assets.state.has('asset-background')).toBe(false);
    expect(harness.assets.state.has('asset-decoration')).toBe(false);
    const updatedScene = updated.scenes[0];
    if (!updatedScene) {
      throw new Error('Updated Scene is missing.');
    }
    const updatedAssetIds = new Set([
      ...(updatedScene.appearance.background.source === 'asset'
        ? [updatedScene.appearance.background.assetId]
        : []),
      ...updatedScene.canvas.layers.flatMap((layer) =>
        layer.kind === 'decoration' ? [layer.assetId] : [],
      ),
    ]);
    expect(new Set(harness.assets.state.keys())).toEqual(updatedAssetIds);
  });

  it('keeps an updated Scene committed when post-commit asset cleanup partially fails', async () => {
    const source = createSceneWithResources('source');
    const harness = createHarness(createCollection([source], 'source'));
    harness.media.state.set(BACKGROUND_MEDIA_KEY, NEW_BACKGROUND);
    harness.media.state.set('overlayImage:current-decoration', NEW_DECORATION);
    const cleanupError = new Error('asset cleanup failed');
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    const deleteAsset = vi
      .spyOn(harness.assets.adapter, 'delete')
      .mockImplementation(async (assetId): Promise<void> => {
        if (assetId === 'asset-background') throw cleanupError;
        harness.assets.state.delete(assetId);
      });
    const runtime = createSceneRuntime(harness.dependencies);

    const updated = await runtime.updateScene(
      'source',
      createRuntimeSnapshot(),
    );

    const updatedScene = updated.scenes[0];
    if (!updatedScene) throw new Error('Updated Scene is missing.');
    expect(updatedScene.appearance.background).not.toMatchObject({
      assetId: 'asset-background',
    });
    expect(deleteAsset).toHaveBeenCalledWith('asset-background');
    expect(deleteAsset).toHaveBeenCalledWith('asset-decoration');
    expect(harness.assets.state.has('asset-background')).toBe(true);
    expect(harness.assets.state.has('asset-decoration')).toBe(false);
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Scene asset cleanup failed.' }),
    );
  });

  it('retains previous assets that another Scene still references', async () => {
    const source = createSceneWithResources('source');
    const shared = createSceneWithResources('shared');
    const harness = createHarness(createCollection([source, shared], 'source'));
    harness.media.state.set(BACKGROUND_MEDIA_KEY, NEW_BACKGROUND);
    harness.media.state.set('overlayImage:current-decoration', NEW_DECORATION);
    const deleteAsset = vi.spyOn(harness.assets.adapter, 'delete');
    const runtime = createSceneRuntime(harness.dependencies);

    await runtime.updateScene('source', createRuntimeSnapshot());

    expect(deleteAsset).not.toHaveBeenCalledWith('asset-background');
    expect(deleteAsset).not.toHaveBeenCalledWith('asset-decoration');
    expect(harness.assets.state.has('asset-background')).toBe(true);
    expect(harness.assets.state.has('asset-decoration')).toBe(true);
  });

  it('keeps previous assets when the Scene update transaction rolls back', async () => {
    const source = createSceneWithResources('source');
    const harness = createHarness(createCollection([source], 'source'));
    harness.media.state.set(BACKGROUND_MEDIA_KEY, NEW_BACKGROUND);
    harness.media.state.set('overlayImage:current-decoration', NEW_DECORATION);
    vi.spyOn(harness.repository, 'upsertScene').mockRejectedValueOnce(
      new Error('repository failed'),
    );
    const deleteAsset = vi.spyOn(harness.assets.adapter, 'delete');
    const runtime = createSceneRuntime(harness.dependencies);

    await expect(
      runtime.updateScene('source', createRuntimeSnapshot()),
    ).rejects.toThrow('repository failed');

    expect(deleteAsset).not.toHaveBeenCalledWith('asset-background');
    expect(deleteAsset).not.toHaveBeenCalledWith('asset-decoration');
    expect([...harness.assets.state.keys()].sort()).toEqual([
      'asset-background',
      'asset-decoration',
    ]);
  });

  it('saves active Scene Content preferences and rejects a folder owned by another Scene', async () => {
    const source = createSceneWithResources('source');
    const occupied = createSceneFixture({
      bookmarkCollection: {
        ...createSceneFixture().bookmarkCollection,
        folderId: 'occupied-folder',
      },
      id: 'occupied',
    });
    const harness = createHarness(
      createCollection([source, occupied], 'source'),
    );
    harness.media.state.set(BACKGROUND_MEDIA_KEY, NEW_BACKGROUND);
    harness.media.state.set('overlayImage:current-decoration', NEW_DECORATION);
    const runtime = createSceneRuntime(harness.dependencies);
    const snapshot = createRuntimeSnapshot();
    snapshot.bookmarkTreePrefs = {
      rootId: 'current-folder',
      rootPath: ['Other bookmarks', 'Current'],
      siblingOrder: { Current: ['Second', 'First'] },
    };
    snapshot.groupPreferences = [{ key: 'Current / First', visible: false }];

    const updated = await runtime.updateScene('source', snapshot);

    expect(updated.scenes.find((scene) => scene.id === 'source')).toMatchObject(
      {
        bookmarkCollection: {
          folderId: 'current-folder',
          folderOwnership: 'external',
          folderPath: ['Other bookmarks', 'Current'],
          groupPreferences: [{ key: 'Current / First', visible: false }],
          siblingOrder: { Current: ['Second', 'First'] },
        },
      },
    );

    snapshot.bookmarkTreePrefs = {
      rootId: 'occupied-folder',
      rootPath: ['Starlit Scenes', 'Occupied'],
      siblingOrder: {},
    };
    await expect(runtime.updateScene('source', snapshot)).rejects.toThrow(
      'Bookmark folder is already used by a Scene: occupied-folder',
    );
  });

  it('writes activeSceneId only after media and local runtime state', async () => {
    const scene = createSceneWithResources();
    const harness = createHarness(createCollection([scene]));
    const syncBefore = structuredClone(harness.sync.state);
    const runtime = createSceneRuntime(harness.dependencies);

    const result = await runtime.applyScene(scene.id);

    expect(result.activeSceneId).toBe(scene.id);
    expect(harness.activeEvents).toEqual([`active:${scene.id}`]);
    expect(harness.events.at(-1)).toBe(`active:${scene.id}`);
    expect(harness.local.state.settings).toMatchObject({
      fontFamily: scene.appearance.fontFamily,
      isOpenInNewTab: true,
    });
    expect(harness.sync.state).toEqual({
      ...syncBefore,
      settings: { isOpenInNewTab: true },
    });
    expect(harness.local.state.overlayScene).toMatchObject({
      layers: [
        {
          hidden: true,
          id: 'decoration-new',
          locked: true,
          mediaKind: 'motion',
        },
        { kind: 'bookmarks' },
      ],
    });
    expect(harness.media.state.get(BACKGROUND_MEDIA_KEY)).toBe(NEW_BACKGROUND);
    expect(harness.media.state.get('overlayImage:decoration-new')).toBe(
      NEW_DECORATION,
    );
    expect(harness.media.state.has('overlayImage:old-decoration')).toBe(false);
  });

  it('keeps new Scene data out of sync while preserving the v1 migration source', async () => {
    const base = createSceneWithResources();
    const privateUrl = 'https://private.example/background.jpg?token=secret';
    const scene = createSceneFixture({
      ...base,
      appearance: {
        ...base.appearance,
        background: {
          mediaType: 'image',
          source: 'url',
          url: privateUrl,
        },
        customCSS: '.private-scene { color: hotpink; }',
        iconSize: 40,
        size: 18,
      },
      bookmarkCollection: {
        ...base.bookmarkCollection,
        folderId: 'private-folder',
        folderPath: ['Other bookmarks', 'Private'],
        groupPreferences: [{ key: 'Private / Work', visible: false }],
        siblingOrder: { Private: ['Work', 'Personal'] },
      },
      name: 'Private',
    });
    const harness = createHarness(createCollection([scene]));
    harness.bookmarks.existingIds.add('private-folder');
    const syncBefore = structuredClone(harness.sync.state);
    const syncSet = vi.spyOn(harness.sync.adapter, 'set');
    const runtime = createSceneRuntime(harness.dependencies);

    await runtime.applyScene(scene.id);

    expect(syncSet).toHaveBeenCalledTimes(1);
    expect(syncSet).toHaveBeenCalledWith({
      settings: { isOpenInNewTab: true },
    });
    expect(JSON.stringify(syncSet.mock.calls)).not.toContain(privateUrl);
    expect(JSON.stringify(syncSet.mock.calls)).not.toContain('.private-scene');
    expect(JSON.stringify(syncSet.mock.calls)).not.toContain('private-folder');
    expect(harness.sync.state).toEqual({
      ...syncBefore,
      settings: { isOpenInNewTab: true },
    });
    expect(JSON.stringify(harness.sync.state)).not.toContain(privateUrl);
    expect(JSON.stringify(harness.sync.state)).not.toContain('.private-scene');
    expect(JSON.stringify(harness.sync.state)).not.toContain('private-folder');
    expect(harness.local.state).toMatchObject({
      backgroundMeta: {
        source: 'url',
        type: 'image',
        url: privateUrl,
      },
      bookmarkTreePrefs: {
        rootId: 'private-folder',
        rootPath: ['Other bookmarks', 'Private'],
        siblingOrder: { Private: ['Work', 'Personal'] },
      },
      customCSS: '.private-scene { color: hotpink; }',
      groupPreferences: [{ key: 'Private / Work', visible: false }],
      iconSize: 40,
      settings: {
        fontFamily: scene.appearance.fontFamily,
        isOpenInNewTab: true,
      },
      size: 18,
    });
  });

  it.each(['media', 'sync', 'local'] as const)(
    'restores all runtime snapshots when %s writes then fails',
    async (failurePoint) => {
      const scene = createSceneWithResources();
      const harness = createHarness(createCollection([scene]));
      const before = snapshotHarness(harness);
      if (failurePoint === 'media') {
        harness.media.failNextSaveAfterWrite = true;
      } else if (failurePoint === 'sync') {
        harness.sync.failNextSetAfterWrite = true;
      } else {
        harness.local.failNextSetAfterWrite = true;
      }
      const runtime = createSceneRuntime(harness.dependencies);

      await expect(runtime.applyScene(scene.id)).rejects.toThrow(
        `${failurePoint} failed`,
      );

      expect(harness.sync.state).toEqual(before.sync);
      expect(harness.local.state).toEqual(before.local);
      expect([...harness.media.state.entries()]).toEqual(before.media);
      expect(harness.activeEvents).toEqual([]);
      expect(harness.getCollection().activeSceneId).toBeNull();
    },
  );

  it('blocks apply before writes and exposes relink when resources are missing', async () => {
    const scene = createSceneWithResources();
    const harness = createHarness(createCollection([scene]));
    harness.assets.state.delete('asset-decoration');
    harness.bookmarks.existingIds.clear();
    const syncSet = vi.spyOn(harness.sync.adapter, 'set');
    const runtime = createSceneRuntime(harness.dependencies);

    await expect(runtime.getReadiness(scene.id)).resolves.toMatchObject({
      availableActions: ['relink'],
      isReady: false,
    });
    await expect(runtime.applyScene(scene.id)).rejects.toThrow(
      'Scene resources are missing',
    );

    expect(syncSet).not.toHaveBeenCalled();
    expect(harness.activeEvents).toEqual([]);
  });

  it('relinks every missing folder and asset before saving the Scene', async () => {
    const base = createSceneWithResources();
    const missing = createSceneFixture({
      ...base,
      appearance: {
        ...base.appearance,
        background: {
          assetId: 'missing-background',
          mediaType: 'video',
          source: 'asset',
        },
      },
      bookmarkCollection: {
        ...base.bookmarkCollection,
        folderId: 'missing-folder',
      },
      canvas: {
        layers: [
          createDecoration('decoration-new', 'missing-decoration'),
          { id: 'bookmarks', kind: 'bookmarks' },
        ],
        version: 2,
      },
    });
    const harness = createHarness(createCollection([missing]));
    const runtime = createSceneRuntime(harness.dependencies);

    const next = await runtime.relinkScene(missing.id, {
      assetIds: {
        'missing-background': 'asset-background',
        'missing-decoration': 'asset-decoration',
      },
      folder: { id: 'scene-folder', path: ['Starlit Scenes', 'Night'] },
    });

    expect(next.scenes[0]?.appearance.background).toMatchObject({
      assetId: 'asset-background',
    });
    expect(next.scenes[0]?.bookmarkCollection.folderId).toBe('scene-folder');
    expect(next.scenes[0]?.bookmarkCollection.folderOwnership).toBe('external');
    expect(
      next.scenes[0]?.canvas.layers.find(
        (layer) => layer.id === 'decoration-new',
      ),
    ).toMatchObject({ assetId: 'asset-decoration' });
  });

  it('does not relink a Scene to a bookmark folder referenced by another Scene', async () => {
    const missing = createSceneWithResources('missing');
    const occupied = createSceneFixture({
      bookmarkCollection: {
        ...createSceneFixture().bookmarkCollection,
        folderId: 'occupied-folder',
      },
      id: 'occupied',
    });
    const harness = createHarness(createCollection([missing, occupied]));
    const runtime = createSceneRuntime(harness.dependencies);

    await expect(
      runtime.relinkScene(missing.id, {
        folder: { id: 'occupied-folder', path: ['Occupied'] },
      }),
    ).rejects.toThrow(
      'Bookmark folder is already used by a Scene: occupied-folder',
    );
  });

  it('exposes and applies an injected recovery snapshot', async () => {
    const base = createSceneWithResources();
    const missing = createSceneFixture({
      ...base,
      bookmarkCollection: {
        ...base.bookmarkCollection,
        folderId: 'missing-folder',
        recoverySnapshotId: 'recovery-snapshot',
      },
    });
    const harness = createHarness(createCollection([missing]));
    harness.dependencies.getRecoveryAvailability = async () => ({
      recoverableAssetIds: new Set(),
      recoverySnapshotIds: new Set(['recovery-snapshot']),
    });
    harness.dependencies.restoreResources = async (scene) => ({
      ...scene,
      bookmarkCollection: {
        ...scene.bookmarkCollection,
        folderId: 'scene-folder',
      },
    });
    const runtime = createSceneRuntime(harness.dependencies);

    await expect(runtime.getReadiness(missing.id)).resolves.toMatchObject({
      availableActions: ['relink', 'restore'],
      canRestore: true,
      isReady: false,
    });
    const next = await runtime.restoreScene(missing.id);

    expect(next.scenes[0]?.bookmarkCollection.folderId).toBe('scene-folder');
  });

  it('keeps bookmark folders and assets still shared by another Scene', async () => {
    const keepScene = createSceneWithResources('keep');
    const cleanupScene = createSceneWithResources('cleanup');
    const harness = createHarness(
      createCollection([keepScene, cleanupScene], 'keep'),
    );
    const deleteAsset = vi.spyOn(harness.assets.adapter, 'delete');
    const runtime = createSceneRuntime(harness.dependencies);

    await runtime.deleteScene('cleanup');

    expect(deleteAsset).not.toHaveBeenCalled();
    expect(harness.bookmarks.removeTree).not.toHaveBeenCalled();
  });

  it('retains explicitly selected resources when another Scene still references them', async () => {
    const shared = createSceneWithResources('shared');
    const cleanup = createSceneWithResources('cleanup');
    const harness = createHarness(createCollection([shared, cleanup]));
    const deleteAsset = vi.spyOn(harness.assets.adapter, 'delete');
    const runtime = createSceneRuntime(harness.dependencies);

    await runtime.deleteScene('cleanup', {
      deleteAssets: true,
      deleteBookmarkFolder: true,
    });

    expect(deleteAsset).not.toHaveBeenCalled();
    expect(harness.bookmarks.removeTree).not.toHaveBeenCalled();
  });

  it('deletes unshared assets by default and the folder only when requested', async () => {
    const base = createSceneWithResources('cleanup');
    const cleanup = createSceneFixture({
      ...base,
      appearance: {
        ...base.appearance,
        background: {
          assetId: 'unique-background',
          mediaType: 'video',
          source: 'asset',
        },
      },
      bookmarkCollection: {
        ...base.bookmarkCollection,
        folderId: 'unique-folder',
      },
      canvas: {
        layers: [
          createDecoration('unique-decoration', 'unique-decoration-asset'),
          { id: 'bookmarks', kind: 'bookmarks' },
        ],
        version: 2,
      },
    });
    const harness = createHarness(createCollection([cleanup]));
    const deleteAsset = vi.spyOn(harness.assets.adapter, 'delete');
    const runtime = createSceneRuntime(harness.dependencies);

    await runtime.deleteScene('cleanup', {
      deleteBookmarkFolder: true,
    });

    expect(deleteAsset).toHaveBeenCalledWith('unique-background');
    expect(deleteAsset).toHaveBeenCalledWith('unique-decoration-asset');
    expect(harness.bookmarks.removeTree).toHaveBeenCalledWith('unique-folder');
  });

  it('keeps a Scene deletion committed when asset and folder cleanup partially fail', async () => {
    const cleanup = createSceneWithResources('cleanup');
    const harness = createHarness(createCollection([cleanup], 'cleanup'));
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    const deleteAsset = vi
      .spyOn(harness.assets.adapter, 'delete')
      .mockImplementation(async (assetId): Promise<void> => {
        if (assetId === 'asset-background') {
          throw new Error('asset cleanup failed');
        }
        harness.assets.state.delete(assetId);
      });
    harness.bookmarks.removeTree.mockRejectedValueOnce(
      new Error('folder cleanup failed'),
    );
    const runtime = createSceneRuntime(harness.dependencies);

    const next = await runtime.deleteScene('cleanup', {
      deleteBookmarkFolder: true,
    });

    expect(next.scenes).toEqual([]);
    expect(next.activeSceneId).toBeNull();
    expect(deleteAsset).toHaveBeenCalledWith('asset-background');
    expect(deleteAsset).toHaveBeenCalledWith('asset-decoration');
    expect(harness.assets.state.has('asset-background')).toBe(true);
    expect(harness.assets.state.has('asset-decoration')).toBe(false);
    expect(reportError).toHaveBeenCalledTimes(2);
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Scene asset cleanup failed.' }),
    );
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Scene bookmark folder cleanup failed.',
      }),
    );
  });
});
