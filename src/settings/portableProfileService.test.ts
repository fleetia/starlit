import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_GRID_SETTINGS } from '../layout/defaults';
import {
  DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE,
  SCENE_RECOVERY_SNAPSHOT_VERSION,
  type SceneBookmarkGateway,
  type SceneCollectionV3,
  type SceneRecoverySnapshotV1,
} from '../scenes';
import { createSceneFixture } from '../scenes/testFixtures';
import type { SharedAssetRecord } from '../platform/storage/indexedDbRecords';
import type { SceneRepository } from '../platform/storage/sceneRepository';
import { DEFAULT_STARLIT_THEME } from '../theme/defaults';
import { DEFAULT_SETTINGS } from './defaults';
import { getBookmarkIdKey } from '../bookmarks/bookmarkRoute';
import type { PortableProfileServiceDependencies } from './portableProfileService';
import {
  convertBackupToPortableProfileV4,
  createPortableProfile,
  importPortableProfile,
  previewPortableProfileImport,
} from './portableProfileService';

function createCollection(scenes = [createSceneFixture()]): SceneCollectionV3 {
  return {
    activeSceneId: scenes[0]?.id ?? null,
    scenes,
    storageSchemaVersion: 3,
  };
}

function createBookmarkGateway(): SceneBookmarkGateway & {
  removedIds: string[];
} {
  let nextId = 0;
  const children = new Map<
    string,
    Array<{ id: string; title: string; url?: string }>
  >([['2', []]]);
  const removedIds: string[] = [];

  return {
    create: async (input) => {
      const node = {
        id: `created-${(nextId += 1)}`,
        parentId: input.parentId,
        title: input.title,
        ...(input.url === undefined ? {} : { url: input.url }),
      };
      children.set(input.parentId, [
        ...(children.get(input.parentId) ?? []),
        node,
      ]);
      if (input.url === undefined) children.set(node.id, []);
      return node;
    },
    getChildren: vi.fn(async (id) => children.get(id) ?? []),
    getSubTree: vi.fn(async (id) => [
      {
        children: children.get(id) ?? [],
        id,
        title: id === '2' ? 'Other bookmarks' : 'Folder',
      },
    ]),
    removeTree: async (id) => {
      removedIds.push(id);
      children.delete(id);
    },
    removedIds,
  };
}

function createDependencies(
  collection = createCollection(),
): PortableProfileServiceDependencies & {
  bookmarkGateway: ReturnType<typeof createBookmarkGateway>;
  deletedAssetIds: string[];
  localSet: ReturnType<typeof vi.fn>;
  repositoryReplace: ReturnType<typeof vi.fn>;
  recoverySnapshots: Map<string, SceneRecoverySnapshotV1>;
  savedAssetIds: string[];
  syncRemove: ReturnType<typeof vi.fn>;
  syncSet: ReturnType<typeof vi.fn>;
} {
  const bookmarkGateway = createBookmarkGateway();
  const repositoryReplace = vi.fn(async (): Promise<void> => undefined);
  const syncSet = vi.fn(async (): Promise<void> => undefined);
  const syncRemove = vi.fn(async (): Promise<void> => undefined);
  const localSet = vi.fn(async (): Promise<void> => undefined);
  const savedAssetIds: string[] = [];
  const deletedAssetIds: string[] = [];
  const assetRecords = new Map<string, SharedAssetRecord>();
  const recoverySnapshots = new Map<string, SceneRecoverySnapshotV1>();
  const repository: SceneRepository = {
    deleteScene: vi.fn(async () => collection),
    load: vi.fn(async () => collection),
    replace: repositoryReplace,
    setActiveSceneId: vi.fn(async () => collection),
    upsertScene: vi.fn(async () => collection),
  };

  return {
    assets: {
      delete: async (id) => {
        deletedAssetIds.push(id);
        assetRecords.delete(id);
        const index = savedAssetIds.indexOf(id);
        if (index >= 0) savedAssetIds.splice(index, 1);
      },
      load: vi.fn(async (id) => assetRecords.get(id) ?? null),
      save: async (asset) => {
        assetRecords.set(asset.id, asset);
        savedAssetIds.push(asset.id);
      },
    },
    bookmarkGateway,
    bookmarks: bookmarkGateway,
    createId: vi.fn(() => 'generated-id'),
    deletedAssetIds,
    local: {
      get: vi.fn(async (key) =>
        key === 'settings' ? DEFAULT_SETTINGS : undefined,
      ),
      remove: vi.fn(async () => undefined),
      set: localSet,
    },
    localSet,
    now: vi.fn(() => new Date('2026-08-31T00:00:00.000Z')),
    processMedia: vi.fn(async (file: File) => ({
      blob: file,
      height: 1,
      mediaKind: file.type.startsWith('video/')
        ? ('motion' as const)
        : ('static' as const),
      width: 1,
    })),
    recovery: {
      delete: vi.fn(async (snapshotId) => {
        recoverySnapshots.delete(snapshotId);
      }),
      load: vi.fn(
        async (snapshotId) => recoverySnapshots.get(snapshotId) ?? null,
      ),
      save: vi.fn(async (snapshot) => {
        recoverySnapshots.set(snapshot.id, snapshot);
      }),
    },
    recoverySnapshots,
    repository,
    repositoryReplace,
    savedAssetIds,
    sync: {
      get: vi.fn(async (key) => (key === 'locale' ? 'ko' : DEFAULT_SETTINGS)),
      remove: syncRemove,
      set: syncSet,
    },
    syncRemove,
    syncSet,
  };
}

function createV3Backup(): Record<string, unknown> {
  return {
    backgroundData: 'data:video/webm;base64,YmFja2dyb3VuZA==',
    backgroundMeta: { source: 'file', type: 'video', url: '' },
    bookmarkTreePrefs: {
      rootId: 'legacy-root',
      rootPath: ['Legacy'],
      siblingOrder: { Legacy: ['Work'] },
    },
    colorTheme: DEFAULT_STARLIT_THEME,
    customCSS: '.bookmark { opacity: 0.8; }',
    gridSettings: DEFAULT_GRID_SETTINGS,
    groupPreferences: [{ key: 'Work', visible: false }],
    iconSize: 32,
    locale: 'ja',
    overlayMedia: {
      sparkle: 'data:image/webp;base64,c3BhcmtsZQ==',
    },
    overlayScene: {
      layers: [
        { kind: 'bookmarks' },
        {
          anchor: 'bottom-right',
          height: 80,
          id: 'sparkle',
          kind: 'image',
          name: 'sparkle.webp',
          offsetX: 24,
          offsetY: 32,
          rotationDeg: 15,
          width: 120,
        },
      ],
    },
    schemaVersion: 3,
    settings: { ...DEFAULT_SETTINGS, isOpenInNewTab: true },
    size: 18,
  };
}

function createV2Backup(): Record<string, unknown> {
  const {
    overlayMedia: _overlayMedia,
    overlayScene: _overlayScene,
    ...backup
  } = createV3Backup();
  return { ...backup, schemaVersion: 2 };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('portable profile service', () => {
  it('previews a V3 backup as one Scene with compatible background and overlay assets', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ close: vi.fn(), height: 1, width: 1 })),
    );
    const dependencies = createDependencies(createCollection([]));

    const preview = await previewPortableProfileImport(
      createV3Backup(),
      dependencies,
    );

    expect(preview.profile).toMatchObject({
      categories: { bookmarkUrls: false, media: true, scenes: true },
      globalPreferences: { isOpenInNewTab: true, locale: 'ja' },
      schemaVersion: 4,
    });
    expect(preview.profile).not.toHaveProperty('bookmarks');
    expect(Object.keys(preview.profile.assets ?? {})).toEqual([
      'legacy-backup-v3:background',
      'sparkle',
    ]);
    expect(preview.profile.scenes).toEqual([
      expect.objectContaining({
        appearance: expect.objectContaining({
          background: {
            assetId: 'legacy-backup-v3:background',
            mediaType: 'video',
            source: 'asset',
          },
          customCSS: '.bookmark { opacity: 0.8; }',
          iconSize: 32,
          size: 18,
        }),
        bookmarkCollection: expect.objectContaining({
          folderId: null,
          folderOwnership: 'external',
          folderPath: [],
          groupPreferences: [{ key: 'Work', visible: false }],
        }),
        id: 'legacy-backup-v3',
        name: 'Imported v3 setup',
      }),
    ]);
    expect(preview.profile.scenes[0]?.canvas.layers).toEqual([
      { id: 'bookmarks', kind: 'bookmarks' },
      expect.objectContaining({
        assetId: 'sparkle',
        id: 'sparkle',
        kind: 'decoration',
      }),
    ]);
    expect(preview.diffs).toHaveLength(1);
  });

  it('converts explicit and unversioned V1 backups with safe defaults', async () => {
    const core = {
      colorTheme: DEFAULT_STARLIT_THEME,
      gridSettings: DEFAULT_GRID_SETTINGS,
      settings: { ...DEFAULT_SETTINGS, isOpenInNewTab: true },
    };

    const [explicit, unversioned] = await Promise.all([
      convertBackupToPortableProfileV4(
        { ...core, schemaVersion: 1 },
        () => new Date('2026-08-31T00:00:00.000Z'),
      ),
      convertBackupToPortableProfileV4(
        core,
        () => new Date('2026-08-31T00:00:00.000Z'),
      ),
    ]);

    for (const profile of [explicit, unversioned]) {
      expect(profile).toMatchObject({
        categories: { bookmarkUrls: false, media: false, scenes: true },
        globalPreferences: { isOpenInNewTab: true, locale: 'ko' },
        scenes: [
          {
            appearance: { iconSize: 28, size: 16 },
            id: 'legacy-backup-v1',
          },
        ],
      });
      expect(profile.scenes[0]?.canvas.layers).toEqual([
        { id: 'bookmarks', kind: 'bookmarks' },
      ]);
    }
  });

  it('imports a V2 backup through the Scene repository and global preference transaction', async () => {
    const dependencies = createDependencies(createCollection([]));

    await importPortableProfile(
      createV2Backup(),
      { conflictChoices: {} },
      dependencies,
    );

    const replacement = dependencies.repositoryReplace.mock.calls[0]?.[0] as
      | SceneCollectionV3
      | undefined;
    expect(replacement).toMatchObject({
      scenes: [
        {
          bookmarkCollection: {
            folderId: 'portable-profile:relink:legacy-backup-v2',
          },
          id: 'legacy-backup-v2',
          name: 'Imported v2 setup',
        },
      ],
      storageSchemaVersion: 3,
    });
    expect(dependencies.syncSet).toHaveBeenCalledWith({
      locale: 'ja',
      settings: { isOpenInNewTab: true },
    });
    expect(dependencies.localSet).toHaveBeenCalledWith({
      settings: { ...DEFAULT_SETTINGS, isOpenInNewTab: true },
    });
  });

  it('exports Scene data without bookmark URLs or media by default', async () => {
    const scene = createSceneFixture({
      bookmarkCollection: {
        ...createSceneFixture().bookmarkCollection,
        recoverySnapshotId: 'snapshot-1',
      },
    });
    const dependencies = createDependencies(createCollection([scene]));

    const profile = await createPortableProfile(undefined, dependencies);

    expect(profile).toMatchObject({
      categories: { bookmarkUrls: false, media: false, scenes: true },
      schemaVersion: 4,
      scenes: [
        {
          bookmarkCollection: {
            folderId: null,
            folderOwnership: 'external',
            folderPath: [],
          },
          id: 'scene-1',
        },
      ],
    });
    expect(profile.scenes[0]?.bookmarkCollection).not.toHaveProperty(
      'recoverySnapshotId',
    );
    expect(profile).not.toHaveProperty('bookmarks');
    expect(profile).not.toHaveProperty('assets');
    expect(dependencies.bookmarks.getSubTree).not.toHaveBeenCalled();
  });

  it('excludes local Calendar account data from export and import', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.local.get).mockResolvedValue({
      accessToken: 'private-access-token',
      calendarIds: ['private-calendar-id'],
      events: [{ summary: 'private-event-summary' }],
    });

    const profile = await createPortableProfile(undefined, dependencies);
    const exportedJson = JSON.stringify(profile);

    expect(dependencies.local.get).not.toHaveBeenCalled();
    expect(exportedJson).not.toContain('private-access-token');
    expect(exportedJson).not.toContain('private-calendar-id');
    expect(exportedJson).not.toContain('private-event-summary');

    const preview = await previewPortableProfileImport(
      {
        ...profile,
        googleCalendar: {
          accessToken: 'imported-access-token',
          calendarIds: ['imported-calendar-id'],
          events: [{ summary: 'imported-event-summary' }],
        },
      },
      dependencies,
    );
    const importedJson = JSON.stringify(preview.profile);

    expect(importedJson).not.toContain('imported-access-token');
    expect(importedJson).not.toContain('imported-calendar-id');
    expect(importedJson).not.toContain('imported-event-summary');
  });

  it('exports bookmark URLs without leaking device folder or recovery ids', async () => {
    const base = createSceneFixture();
    const scene = createSceneFixture({
      bookmarkCollection: {
        ...base.bookmarkCollection,
        recoverySnapshotId: 'device-recovery',
      },
    });
    const dependencies = createDependencies(createCollection([scene]));

    const profile = await createPortableProfile(
      { bookmarkUrls: true, media: false, scenes: true },
      dependencies,
    );

    expect(profile.bookmarks).toEqual({
      'scene-1': { children: [], rootId: 'root' },
    });
    expect(profile.scenes[0]?.bookmarkCollection).toMatchObject({
      folderId: null,
      folderOwnership: 'external',
      folderPath: [],
    });
    expect(profile.scenes[0]?.bookmarkCollection).not.toHaveProperty(
      'recoverySnapshotId',
    );
  });

  it('preserves the existing device bookmark folder when replacing without bookmark URLs', async () => {
    const scene = createSceneFixture({
      bookmarkCollection: {
        ...createSceneFixture().bookmarkCollection,
        recoverySnapshotId: 'snapshot-1',
      },
    });
    const dependencies = createDependencies(createCollection([scene]));
    const profile = await createPortableProfile(undefined, dependencies);

    await importPortableProfile(
      profile,
      { conflictChoices: { 'scene-1': 'replace' } },
      dependencies,
    );

    const replacement = dependencies.repositoryReplace.mock.calls[0]?.[0] as
      | SceneCollectionV3
      | undefined;
    expect(replacement?.scenes[0]?.bookmarkCollection).toEqual(
      scene.bookmarkCollection,
    );
    expect(dependencies.bookmarks.getSubTree).not.toHaveBeenCalled();
  });

  it('preserves matching device media references when replacing without media', async () => {
    const base = createSceneFixture();
    const scene = createSceneFixture({
      appearance: {
        ...base.appearance,
        background: {
          assetId: 'existing-background',
          mediaType: 'image',
          source: 'asset',
        },
      },
    });
    const dependencies = createDependencies(createCollection([scene]));
    const profile = await createPortableProfile(undefined, dependencies);
    const incoming = profile.scenes[0];
    if (!incoming || incoming.appearance.background.source !== 'asset') {
      throw new Error('Expected an asset background.');
    }
    incoming.appearance.background.assetId = 'foreign-device-asset';

    await importPortableProfile(
      profile,
      { conflictChoices: { 'scene-1': 'replace' } },
      dependencies,
    );

    const replacement = dependencies.repositoryReplace.mock.calls[0]?.[0] as
      | SceneCollectionV3
      | undefined;
    expect(replacement?.scenes[0]?.appearance.background).toMatchObject({
      assetId: 'existing-background',
    });
    expect(dependencies.deletedAssetIds).toEqual([]);
  });

  it('cleans an orphaned replaced Scene asset after a media import commits', async () => {
    const base = createSceneFixture();
    const existing = createSceneFixture({
      appearance: {
        ...base.appearance,
        background: {
          assetId: 'existing-background',
          mediaType: 'image',
          source: 'asset',
        },
      },
    });
    const incoming = createSceneFixture({
      appearance: {
        ...base.appearance,
        background: {
          assetId: 'incoming-background',
          mediaType: 'image',
          source: 'asset',
        },
      },
    });
    const dependencies = createDependencies(createCollection([existing]));
    const profile = {
      assets: {
        'incoming-background': {
          dataUrl: 'data:image/webp;base64,YQ==',
          id: 'incoming-background',
          mediaType: 'image/webp',
          name: 'background.webp',
        },
      },
      categories: { bookmarkUrls: false, media: true, scenes: true },
      exportedAt: '2026-08-31T00:00:00.000Z',
      globalPreferences: { isOpenInNewTab: true, locale: 'en' },
      schemaVersion: 4,
      scenes: [incoming],
    };

    await importPortableProfile(
      profile,
      { conflictChoices: { 'scene-1': 'replace' } },
      dependencies,
    );

    expect(dependencies.deletedAssetIds).toEqual(['existing-background']);
  });

  it('prepares a new dedicated bookmark folder before replacing a Scene reference', async () => {
    const dependencies = createDependencies();
    const profile = await createPortableProfile(undefined, dependencies);
    const portableWithBookmarks = {
      ...profile,
      bookmarks: {
        'scene-1': [{ title: 'Starlit', url: 'https://example.com' }],
      },
      categories: { ...profile.categories, bookmarkUrls: true },
    };

    await importPortableProfile(
      portableWithBookmarks,
      { conflictChoices: { 'scene-1': 'replace' }, destinationParentId: '2' },
      dependencies,
    );

    const replacement = dependencies.repositoryReplace.mock.calls[0]?.[0] as
      | SceneCollectionV3
      | undefined;
    expect(replacement?.scenes[0]?.bookmarkCollection).toMatchObject({
      folderId: 'created-2',
      folderOwnership: 'scene',
      recoverySnapshotId: 'scene-recovery:scene-1:generated-id',
    });
    expect(dependencies.recoverySnapshots.size).toBe(1);
    expect([...dependencies.recoverySnapshots.values()][0]).toMatchObject({
      assets: [],
      bookmark: {
        containerId: 'created-1',
        destinationParentId: '2',
        folder: {
          children: [{ title: 'Starlit', url: 'https://example.com' }],
          title: 'Focus',
        },
      },
      sceneId: 'scene-1',
    });
    expect(dependencies.bookmarkGateway.removedIds).toEqual([]);
  });

  it('validates imported media through the shared processor before saving', async () => {
    const scene = createSceneFixture({
      appearance: {
        ...createSceneFixture().appearance,
        background: {
          assetId: 'source-asset',
          mediaType: 'image',
          source: 'asset',
        },
      },
    });
    const dependencies = createDependencies(createCollection([]));
    dependencies.processMedia = vi.fn(async () => {
      throw new Error(
        'Overlay media longest edge must be no larger than 1920 pixels.',
      );
    });
    const profile = {
      assets: {
        'source-asset': {
          dataUrl: 'data:image/png;base64,YQ==',
          id: 'source-asset',
          mediaType: 'image/png',
          name: 'background.png',
        },
      },
      categories: { bookmarkUrls: false, media: true, scenes: true },
      exportedAt: '2026-08-31T00:00:00.000Z',
      globalPreferences: { isOpenInNewTab: true, locale: 'en' },
      schemaVersion: 4,
      scenes: [scene],
    };

    await expect(
      importPortableProfile(profile, { conflictChoices: {} }, dependencies),
    ).rejects.toThrow('1920 pixels');

    expect(dependencies.savedAssetIds).toEqual([]);
    expect(dependencies.repositoryReplace).not.toHaveBeenCalled();
  });

  it('imports global preferences without changing Scenes when every conflict is skipped', async () => {
    const dependencies = createDependencies();
    const profile = await createPortableProfile(undefined, dependencies);

    await importPortableProfile(
      profile,
      { conflictChoices: { 'scene-1': 'skip' } },
      dependencies,
    );

    expect(dependencies.syncSet).toHaveBeenCalledWith({
      locale: profile.globalPreferences.locale,
      settings: {
        isOpenInNewTab: profile.globalPreferences.isOpenInNewTab,
      },
    });
    expect(dependencies.localSet).toHaveBeenCalledWith({
      settings: {
        ...DEFAULT_SETTINGS,
        isOpenInNewTab: profile.globalPreferences.isOpenInNewTab,
      },
    });
    expect(dependencies.repositoryReplace).not.toHaveBeenCalled();
  });

  it('imports global preferences without rewriting Scenes when the profile has none', async () => {
    const dependencies = createDependencies();
    const profile = {
      categories: { bookmarkUrls: false, media: false, scenes: false },
      exportedAt: '2026-08-31T00:00:00.000Z',
      globalPreferences: { isOpenInNewTab: true, locale: 'en' },
      schemaVersion: 4,
      scenes: [],
    };

    await importPortableProfile(profile, { conflictChoices: {} }, dependencies);

    expect(dependencies.syncSet).toHaveBeenCalledWith({
      locale: 'en',
      settings: { isOpenInNewTab: true },
    });
    expect(dependencies.localSet).toHaveBeenCalledWith({
      settings: { ...DEFAULT_SETTINGS, isOpenInNewTab: true },
    });
    expect(dependencies.repositoryReplace).not.toHaveBeenCalled();
  });

  it('cleans prepared assets and restores preferences when the final Scene commit fails', async () => {
    const scene = createSceneFixture({
      appearance: {
        ...createSceneFixture().appearance,
        background: {
          assetId: 'source-asset',
          mediaType: 'image',
          source: 'asset',
        },
      },
    });
    const dependencies = createDependencies(createCollection([scene]));
    dependencies.repositoryReplace.mockRejectedValueOnce(
      new Error('index failed'),
    );
    const profile = {
      assets: {
        'source-asset': {
          dataUrl: 'data:image/png;base64,YQ==',
          id: 'source-asset',
          mediaType: 'image/png',
          name: 'background.png',
        },
      },
      categories: { bookmarkUrls: false, media: true, scenes: true },
      exportedAt: '2026-08-31T00:00:00.000Z',
      globalPreferences: { isOpenInNewTab: true, locale: 'en' },
      schemaVersion: 4,
      scenes: [scene],
    };

    await expect(
      importPortableProfile(
        profile,
        { conflictChoices: { 'scene-1': 'replace' } },
        dependencies,
      ),
    ).rejects.toThrow('index failed');

    expect(dependencies.savedAssetIds).toEqual([]);
    expect(dependencies.syncSet).toHaveBeenCalledTimes(2);
  });

  it('cleans a prepared recovery snapshot and bookmark folder when import commit fails', async () => {
    const dependencies = createDependencies(createCollection([]));
    dependencies.repositoryReplace.mockRejectedValueOnce(
      new Error('index failed'),
    );
    const scene = createSceneFixture();
    const profile = {
      bookmarks: { [scene.id]: [] },
      categories: { bookmarkUrls: true, media: false, scenes: true },
      exportedAt: '2026-08-31T00:00:00.000Z',
      globalPreferences: { isOpenInNewTab: true, locale: 'en' },
      schemaVersion: 4,
      scenes: [scene],
    };

    await expect(
      importPortableProfile(
        profile,
        { conflictChoices: {}, destinationParentId: '2' },
        dependencies,
      ),
    ).rejects.toThrow('index failed');

    expect(dependencies.recoverySnapshots.size).toBe(0);
    expect(dependencies.bookmarkGateway.removedIds).toEqual([
      'created-2',
      'created-1',
    ]);
  });

  it('removes previously absent global preferences during rollback', async () => {
    const dependencies = createDependencies(createCollection([]));
    dependencies.sync.get = vi.fn(async () => undefined);
    dependencies.repositoryReplace.mockRejectedValueOnce(
      new Error('index failed'),
    );

    await expect(
      importPortableProfile(
        createV2Backup(),
        { conflictChoices: {} },
        dependencies,
      ),
    ).rejects.toThrow('index failed');

    expect(dependencies.syncRemove).toHaveBeenCalledWith([
      'locale',
      'settings',
    ]);
    expect(dependencies.syncSet).toHaveBeenCalledTimes(1);
  });

  it('restores local preferences when the local write mutates then rejects', async () => {
    const dependencies = createDependencies(createCollection([]));
    const previousSettings = { ...DEFAULT_SETTINGS, isOpenInNewTab: false };
    let storedSettings: unknown = previousSettings;
    let shouldReject = true;
    dependencies.local.get = vi.fn(async (key) =>
      key === 'settings' ? storedSettings : undefined,
    );
    dependencies.local.set = vi.fn(async (items) => {
      storedSettings = items.settings;
      if (shouldReject) {
        shouldReject = false;
        throw new Error('local write failed after mutation');
      }
    });
    const profile = {
      categories: { bookmarkUrls: false, media: false, scenes: false },
      exportedAt: '2026-08-31T00:00:00.000Z',
      globalPreferences: { isOpenInNewTab: true, locale: 'en' },
      schemaVersion: 4,
      scenes: [],
    };

    await expect(
      importPortableProfile(profile, { conflictChoices: {} }, dependencies),
    ).rejects.toThrow('local write failed after mutation');

    expect(storedSettings).toEqual(previousSettings);
    expect(dependencies.repositoryReplace).not.toHaveBeenCalled();
  });

  it('restores sync and local preferences when the sync write mutates then rejects', async () => {
    const dependencies = createDependencies(createCollection([]));
    const previousLocalSettings = {
      ...DEFAULT_SETTINGS,
      isOpenInNewTab: false,
    };
    let localSettings: unknown = previousLocalSettings;
    let syncLocale: unknown = 'ko';
    let syncSettings: unknown = { isOpenInNewTab: false };
    let shouldReject = true;
    dependencies.local.get = vi.fn(async (key) =>
      key === 'settings' ? localSettings : undefined,
    );
    dependencies.local.set = vi.fn(async (items) => {
      localSettings = items.settings;
    });
    dependencies.sync.get = vi.fn(async (key) =>
      key === 'locale' ? syncLocale : syncSettings,
    );
    dependencies.sync.set = vi.fn(async (items) => {
      if (Object.hasOwn(items, 'locale')) syncLocale = items.locale;
      if (Object.hasOwn(items, 'settings')) syncSettings = items.settings;
      if (shouldReject) {
        shouldReject = false;
        throw new Error('sync write failed after mutation');
      }
    });
    const profile = {
      categories: { bookmarkUrls: false, media: false, scenes: false },
      exportedAt: '2026-08-31T00:00:00.000Z',
      globalPreferences: { isOpenInNewTab: true, locale: 'en' },
      schemaVersion: 4,
      scenes: [],
    };

    await expect(
      importPortableProfile(profile, { conflictChoices: {} }, dependencies),
    ).rejects.toThrow('sync write failed after mutation');

    expect(localSettings).toEqual(previousLocalSettings);
    expect(syncLocale).toBe('ko');
    expect(syncSettings).toEqual({ isOpenInNewTab: false });
  });

  it('retries bookmark compensation when the first cleanup attempt fails', async () => {
    const dependencies = createDependencies(createCollection([]));
    let createCount = 0;
    let removeCount = 0;
    const removeTree = vi.fn(async (id: string) => {
      expect(id).toBe('scene-folder');
      removeCount += 1;
      if (removeCount === 1) throw new Error('transient cleanup failure');
    });
    dependencies.bookmarks = {
      create: vi.fn(async (input) => {
        createCount += 1;
        if (createCount === 1) {
          return {
            id: 'scene-folder',
            parentId: input.parentId,
            title: input.title,
          };
        }
        throw new Error('bookmark child failed');
      }),
      getChildren: vi.fn(async () => [
        {
          id: 'existing-container',
          parentId: '2',
          title: DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE,
        },
      ]),
      getSubTree: vi.fn(async () => []),
      removeTree,
    };
    const scene = createSceneFixture();
    const profile = {
      bookmarks: {
        [scene.id]: [{ title: 'Starlit', url: 'https://example.com' }],
      },
      categories: { bookmarkUrls: true, media: false, scenes: true },
      exportedAt: '2026-08-31T00:00:00.000Z',
      globalPreferences: { isOpenInNewTab: true, locale: 'en' },
      schemaVersion: 4,
      scenes: [scene],
    };

    await expect(
      importPortableProfile(
        profile,
        { conflictChoices: {}, destinationParentId: '2' },
        dependencies,
      ),
    ).rejects.toThrow('Portable profile import and cleanup failed.');

    expect(removeTree).toHaveBeenCalledTimes(2);
    expect(dependencies.repositoryReplace).not.toHaveBeenCalled();
  });

  it('does not overwrite an existing asset when generated import ids collide', async () => {
    const base = createSceneFixture();
    const scene = createSceneFixture({
      appearance: {
        ...base.appearance,
        background: {
          assetId: 'source-asset',
          mediaType: 'image',
          source: 'asset',
        },
      },
    });
    const dependencies = createDependencies(createCollection([]));
    const existingBlob = new Blob(['existing'], { type: 'image/webp' });
    dependencies.assets.load = vi.fn(async (id) => ({
      blob: existingBlob,
      createdAt: '2026-08-30T00:00:00.000Z',
      id,
      mediaType: existingBlob.type,
      name: 'existing.webp',
      size: existingBlob.size,
    }));
    const profile = {
      assets: {
        'source-asset': {
          dataUrl: 'data:image/webp;base64,YQ==',
          id: 'source-asset',
          mediaType: 'image/webp',
          name: 'source.webp',
        },
      },
      categories: { bookmarkUrls: false, media: true, scenes: true },
      exportedAt: '2026-08-31T00:00:00.000Z',
      globalPreferences: { isOpenInNewTab: true, locale: 'en' },
      schemaVersion: 4,
      scenes: [scene],
    };

    await expect(
      importPortableProfile(profile, { conflictChoices: {} }, dependencies),
    ).rejects.toThrow('Could not create a unique imported asset id.');

    expect(dependencies.createId).toHaveBeenCalledTimes(100);
    expect(dependencies.savedAssetIds).toEqual([]);
    expect(dependencies.repositoryReplace).not.toHaveBeenCalled();
  });

  it('does not overwrite an existing recovery snapshot when generated ids collide', async () => {
    const scene = createSceneFixture();
    const dependencies = createDependencies(createCollection([]));
    const existingSnapshot: SceneRecoverySnapshotV1 = {
      assets: [],
      bookmark: {
        containerId: 'existing-container',
        containerTitle: DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE,
        destinationParentId: '2',
        folder: { children: [], title: 'Existing' },
        folderPath: [DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE, 'Existing'],
      },
      capturedAt: 0,
      id: 'existing-recovery',
      sceneId: 'existing-scene',
      version: SCENE_RECOVERY_SNAPSHOT_VERSION,
    };
    dependencies.recovery.load = vi.fn(async () => existingSnapshot);
    const profile = {
      bookmarks: { [scene.id]: [] },
      categories: { bookmarkUrls: true, media: false, scenes: true },
      exportedAt: '2026-08-31T00:00:00.000Z',
      globalPreferences: { isOpenInNewTab: true, locale: 'en' },
      schemaVersion: 4,
      scenes: [scene],
    };

    await expect(
      importPortableProfile(
        profile,
        { conflictChoices: {}, destinationParentId: '2' },
        dependencies,
      ),
    ).rejects.toThrow('Could not create a unique recovery snapshot id.');

    expect(dependencies.createId).toHaveBeenCalledTimes(100);
    expect(dependencies.bookmarkGateway.removedIds).toEqual([
      'created-2',
      'created-1',
    ]);
    expect(dependencies.repositoryReplace).not.toHaveBeenCalled();
  });

  it('captures preserved device assets in a replacement recovery and removes the old snapshot', async () => {
    const blob = new Blob(['existing'], { type: 'image/webp' });
    const asset: SharedAssetRecord = {
      blob,
      createdAt: '2026-08-30T00:00:00.000Z',
      id: 'existing-background',
      mediaType: blob.type,
      name: 'existing.webp',
      size: blob.size,
    };
    const base = createSceneFixture();
    const scene = createSceneFixture({
      appearance: {
        ...base.appearance,
        background: {
          assetId: asset.id,
          mediaType: 'image',
          source: 'asset',
        },
      },
      bookmarkCollection: {
        ...base.bookmarkCollection,
        recoverySnapshotId: 'old-recovery',
      },
    });
    const dependencies = createDependencies(createCollection([scene]));
    dependencies.assets.load = vi.fn(async (id) =>
      id === asset.id ? asset : null,
    );
    const oldSnapshot: SceneRecoverySnapshotV1 = {
      assets: [],
      bookmark: {
        containerId: 'old-container',
        containerTitle: DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE,
        destinationParentId: '2',
        folder: { children: [], title: scene.name },
        folderPath: [DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE, scene.name],
      },
      capturedAt: 0,
      id: 'old-recovery',
      sceneId: scene.id,
      version: SCENE_RECOVERY_SNAPSHOT_VERSION,
    };
    dependencies.recoverySnapshots.set(oldSnapshot.id, oldSnapshot);
    const profile = await createPortableProfile(
      { bookmarkUrls: true, media: false, scenes: true },
      dependencies,
    );

    await importPortableProfile(
      profile,
      {
        conflictChoices: { [scene.id]: 'replace' },
        destinationParentId: '2',
      },
      dependencies,
    );

    const replacement = dependencies.repositoryReplace.mock.calls[0]?.[0] as
      | SceneCollectionV3
      | undefined;
    const recoveryId =
      replacement?.scenes[0]?.bookmarkCollection.recoverySnapshotId;
    expect(recoveryId).toBe('scene-recovery:scene-1:generated-id');
    expect(
      dependencies.recoverySnapshots.get(recoveryId ?? '')?.assets,
    ).toEqual([asset]);
    expect(dependencies.recoverySnapshots.has('old-recovery')).toBe(false);
  });

  it('round-trips duplicate-title bookmark identities through synthetic ids', async () => {
    const base = createSceneFixture();
    const sourceScene = createSceneFixture({
      bookmarkCollection: {
        ...base.bookmarkCollection,
        folderId: 'source-root',
        groupPreferences: [
          { key: getBookmarkIdKey('source-first'), visible: false },
        ],
        siblingOrder: {
          [getBookmarkIdKey('source-root')]: [
            getBookmarkIdKey('source-second'),
            getBookmarkIdKey('source-first'),
          ],
        },
      },
    });
    const source = createDependencies(createCollection([sourceScene]));
    source.bookmarks.getSubTree = vi.fn(async () => [
      {
        children: [
          { children: [], id: 'source-first', title: 'Duplicate' },
          { children: [], id: 'source-second', title: 'Duplicate' },
        ],
        id: 'source-root',
        parentId: 'container',
        title: sourceScene.name,
      },
    ]);

    const profile = await createPortableProfile(
      { bookmarkUrls: true, media: false, scenes: true },
      source,
    );
    expect(JSON.stringify(profile)).not.toContain('source-first');
    expect(JSON.stringify(profile)).not.toContain('source-second');
    expect(profile.scenes[0]?.bookmarkCollection).toMatchObject({
      groupPreferences: [{ key: getBookmarkIdKey('node:0'), visible: false }],
      siblingOrder: {
        [getBookmarkIdKey('root')]: [
          getBookmarkIdKey('node:1'),
          getBookmarkIdKey('node:0'),
        ],
      },
    });

    const target = createDependencies(createCollection([]));
    await importPortableProfile(
      profile,
      { conflictChoices: {}, destinationParentId: '2' },
      target,
    );
    const imported = target.repositoryReplace.mock.calls[0]?.[0]?.scenes[0];
    expect(imported?.bookmarkCollection).toMatchObject({
      folderId: 'created-2',
      groupPreferences: [
        { key: getBookmarkIdKey('created-3'), visible: false },
      ],
      siblingOrder: {
        [getBookmarkIdKey('created-2')]: [
          getBookmarkIdKey('created-4'),
          getBookmarkIdKey('created-3'),
        ],
      },
    });
  });

  it('imports bookmark URLs without media and leaves missing assets for relink', async () => {
    const base = createSceneFixture();
    const scene = createSceneFixture({
      appearance: {
        ...base.appearance,
        background: {
          assetId: 'missing-background',
          mediaType: 'image',
          source: 'asset',
        },
      },
    });
    const dependencies = createDependencies(createCollection([]));
    const profile = {
      bookmarks: { [scene.id]: [] },
      categories: { bookmarkUrls: true, media: false, scenes: true },
      exportedAt: '2026-08-31T00:00:00.000Z',
      globalPreferences: { isOpenInNewTab: true, locale: 'en' },
      schemaVersion: 4,
      scenes: [scene],
    };

    await importPortableProfile(
      profile,
      { conflictChoices: {}, destinationParentId: '2' },
      dependencies,
    );

    expect(dependencies.repositoryReplace).toHaveBeenCalledOnce();
    expect([...dependencies.recoverySnapshots.values()][0]?.assets).toEqual([]);
  });

  it('deactivates an active Scene when replacing its persisted snapshot', async () => {
    const base = createSceneFixture();
    const existing = createSceneFixture({
      bookmarkCollection: {
        ...base.bookmarkCollection,
        groupPreferences: [
          { key: getBookmarkIdKey('existing-group'), visible: false },
        ],
        recoverySnapshotId: 'existing-recovery',
        siblingOrder: {
          [getBookmarkIdKey('existing-root')]: [
            getBookmarkIdKey('existing-group'),
          ],
        },
      },
    });
    const incoming = createSceneFixture({ name: 'Imported replacement' });
    const dependencies = createDependencies(createCollection([existing]));

    await importPortableProfile(
      {
        categories: { bookmarkUrls: false, media: false, scenes: true },
        exportedAt: '2026-08-31T00:00:00.000Z',
        globalPreferences: { isOpenInNewTab: true, locale: 'en' },
        schemaVersion: 4,
        scenes: [incoming],
      },
      { conflictChoices: { [incoming.id]: 'replace' } },
      dependencies,
    );

    expect(
      dependencies.repositoryReplace.mock.calls[0]?.[0]?.activeSceneId,
    ).toBeNull();
    expect(
      dependencies.repositoryReplace.mock.calls[0]?.[0]?.scenes[0]
        ?.bookmarkCollection,
    ).toEqual(existing.bookmarkCollection);
  });

  it('cleans an imported asset when its save mutates then rejects', async () => {
    const base = createSceneFixture();
    const scene = createSceneFixture({
      appearance: {
        ...base.appearance,
        background: {
          assetId: 'source-asset',
          mediaType: 'image',
          source: 'asset',
        },
      },
    });
    const dependencies = createDependencies(createCollection([]));
    dependencies.assets.save = vi.fn(async (asset) => {
      dependencies.savedAssetIds.push(asset.id);
      throw new Error('asset write failed');
    });

    await expect(
      importPortableProfile(
        {
          assets: {
            'source-asset': {
              dataUrl: 'data:image/png;base64,YQ==',
              id: 'source-asset',
              mediaType: 'image/png',
              name: 'background.png',
            },
          },
          categories: { bookmarkUrls: false, media: true, scenes: true },
          exportedAt: '2026-08-31T00:00:00.000Z',
          globalPreferences: { isOpenInNewTab: true, locale: 'en' },
          schemaVersion: 4,
          scenes: [scene],
        },
        { conflictChoices: {} },
        dependencies,
      ),
    ).rejects.toThrow('asset write failed');

    expect(dependencies.savedAssetIds).toEqual([]);
    expect(dependencies.deletedAssetIds).toHaveLength(1);
  });
});
