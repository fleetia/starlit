import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_GRID_SETTINGS } from '../../layout/defaults';
import { DEFAULT_SETTINGS } from '../../settings/defaults';
import { DEFAULT_STARLIT_THEME } from '../../theme/defaults';
import type { ScenePresetV1 } from '../../scenes';
import {
  createSceneRepository,
  SCENE_INDEX_STORAGE_KEY,
  type SceneRepositoryDependencies,
} from './sceneRepository';

function createScene(id: string): ScenePresetV1 {
  return {
    appearance: {
      background: { source: 'none' },
      bookmark: {
        iconLayout: DEFAULT_SETTINGS.iconLayout,
        isExpandView: false,
        isFolderEnabled: true,
        isVisibleOnce: false,
      },
      customCSS: '',
      fontFamily: DEFAULT_SETTINGS.fontFamily,
      gridSettings: DEFAULT_GRID_SETTINGS,
      iconSize: 28,
      size: 16,
      theme: DEFAULT_STARLIT_THEME,
    },
    bookmarkCollection: {
      folderId: null,
      folderOwnership: 'external',
      folderPath: [],
      groupPreferences: [],
      siblingOrder: {},
    },
    canvas: {
      layers: [{ id: 'bookmarks', kind: 'bookmarks' }],
      version: 2,
    },
    createdAt: 1,
    id,
    name: id,
    updatedAt: 1,
    version: 1,
  };
}

function createDependencies(): SceneRepositoryDependencies & {
  entries: Array<readonly [string, unknown]>;
  failNextIndexSetAfterWrite: boolean;
  failNextRecordsReplaceAfterWrite: boolean;
  indexValue: unknown;
} {
  const state: SceneRepositoryDependencies & {
    entries: Array<readonly [string, unknown]>;
    failNextIndexSetAfterWrite: boolean;
    failNextRecordsReplaceAfterWrite: boolean;
    indexValue: unknown;
  } = {
    entries: [],
    failNextIndexSetAfterWrite: false,
    failNextRecordsReplaceAfterWrite: false,
    index: {
      get: async () => state.indexValue,
      remove: async () => {
        state.indexValue = undefined;
      },
      set: async (index) => {
        state.indexValue = index;
        if (state.failNextIndexSetAfterWrite) {
          state.failNextIndexSetAfterWrite = false;
          throw new Error(`${SCENE_INDEX_STORAGE_KEY} failed after write`);
        }
      },
    },
    indexValue: undefined,
    records: {
      list: async () => state.entries,
      replace: async (entries) => {
        state.entries = [...entries];
        if (state.failNextRecordsReplaceAfterWrite) {
          state.failNextRecordsReplaceAfterWrite = false;
          throw new Error('Scene records failed after write');
        }
      },
    },
  };
  return state;
}

describe('Scene repository', () => {
  it('creates, updates, activates, and deletes Scene records outside sync storage', async () => {
    const dependencies = createDependencies();
    const repository = createSceneRepository(dependencies);

    await repository.upsertScene(createScene('work'), true);
    await repository.upsertScene(createScene('personal'));

    expect(await repository.load()).toMatchObject({
      activeSceneId: 'work',
      scenes: [{ id: 'work' }, { id: 'personal' }],
      storageSchemaVersion: 3,
    });

    const afterDelete = await repository.deleteScene('work');
    expect(afterDelete.activeSceneId).toBeNull();
    expect(afterDelete.scenes.map((scene) => scene.id)).toEqual(['personal']);
    expect(dependencies.indexValue).toMatchObject({
      activeSceneId: null,
      sceneIds: ['personal'],
    });
  });

  it('rolls Scene records back when the final index write fails', async () => {
    const dependencies = createDependencies();
    dependencies.entries = [['scene:existing', createScene('existing')]];
    dependencies.indexValue = {
      activeSceneId: 'existing',
      sceneIds: ['existing'],
      storageSchemaVersion: 3,
    };
    const setIndex = dependencies.index.set;
    let shouldFail = true;
    dependencies.index.set = vi.fn(async (index) => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error(`${SCENE_INDEX_STORAGE_KEY} failed`);
      }
      await setIndex(index);
    });
    const repository = createSceneRepository(dependencies);

    await expect(
      repository.upsertScene(createScene('next'), true),
    ).rejects.toThrow('sceneIndex failed');
    expect(dependencies.entries).toEqual([
      ['scene:existing', createScene('existing')],
    ]);
  });

  it('restores Scene records when their replacement mutates then rejects', async () => {
    const dependencies = createDependencies();
    const existing = createScene('existing');
    dependencies.entries = [['scene:existing', existing]];
    dependencies.indexValue = {
      activeSceneId: 'existing',
      sceneIds: ['existing'],
      storageSchemaVersion: 3,
    };
    dependencies.failNextRecordsReplaceAfterWrite = true;
    const repository = createSceneRepository(dependencies);

    await expect(
      repository.upsertScene(createScene('next'), true),
    ).rejects.toThrow('Scene records failed after write');

    expect(dependencies.entries).toEqual([['scene:existing', existing]]);
    expect(dependencies.indexValue).toEqual({
      activeSceneId: 'existing',
      sceneIds: ['existing'],
      storageSchemaVersion: 3,
    });
  });

  it('restores Scene records and index when the final index write mutates then rejects', async () => {
    const dependencies = createDependencies();
    const existing = createScene('existing');
    dependencies.entries = [['scene:existing', existing]];
    dependencies.indexValue = {
      activeSceneId: 'existing',
      sceneIds: ['existing'],
      storageSchemaVersion: 3,
    };
    dependencies.failNextIndexSetAfterWrite = true;
    const repository = createSceneRepository(dependencies);

    await expect(
      repository.upsertScene(createScene('next'), true),
    ).rejects.toThrow('sceneIndex failed after write');

    expect(dependencies.entries).toEqual([['scene:existing', existing]]);
    expect(dependencies.indexValue).toEqual({
      activeSceneId: 'existing',
      sceneIds: ['existing'],
      storageSchemaVersion: 3,
    });
  });

  it('updates only the Scene index when activating an existing Scene', async () => {
    const dependencies = createDependencies();
    const repository = createSceneRepository(dependencies);
    await repository.upsertScene(createScene('focus'));
    const replaceRecords = vi.spyOn(dependencies.records, 'replace');

    const next = await repository.setActiveSceneId('focus');

    expect(next.activeSceneId).toBe('focus');
    expect(replaceRecords).not.toHaveBeenCalled();
    expect(dependencies.indexValue).toMatchObject({ activeSceneId: 'focus' });
  });

  it('restores the active Scene index when activation mutates then rejects', async () => {
    const dependencies = createDependencies();
    const repository = createSceneRepository(dependencies);
    await repository.upsertScene(createScene('focus'), true);
    await repository.upsertScene(createScene('rest'));
    dependencies.failNextIndexSetAfterWrite = true;

    await expect(repository.setActiveSceneId('rest')).rejects.toThrow(
      'sceneIndex failed after write',
    );

    expect(dependencies.indexValue).toMatchObject({
      activeSceneId: 'focus',
      sceneIds: ['focus', 'rest'],
    });
  });
});
