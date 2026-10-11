import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SceneRuntime } from './runtime';
import { createSceneFixture } from './testFixtures';
import { useScenes } from './useScenes';
import type { SceneCollectionV3 } from './types';

function createCollection(
  sceneIds: string[],
  activeSceneId: string | null = null,
): SceneCollectionV3 {
  return {
    activeSceneId,
    scenes: sceneIds.map((id) => createSceneFixture({ id, name: id })),
    storageSchemaVersion: 3,
  };
}

function createRuntime(initial: SceneCollectionV3): SceneRuntime {
  return {
    applyScene: vi.fn(async () => initial),
    createScene: vi.fn(async () => initial),
    deleteScene: vi.fn(async () => initial),
    duplicateScene: vi.fn(async () => initial),
    getReadiness: vi.fn(async () => ({
      availableActions: [],
      canRestore: false,
      isReady: true,
      issues: [],
    })),
    load: vi.fn(async () => initial),
    relinkScene: vi.fn(async () => initial),
    restoreScene: vi.fn(async () => initial),
    updateScene: vi.fn(async () => initial),
  };
}

describe('useScenes', () => {
  it('loads an empty legacy profile without creating or activating a Scene', async () => {
    const runtime = createRuntime(createCollection([]));
    const { result } = renderHook(() => useScenes(runtime));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.activeSceneId).toBeNull();
    expect(result.current.scenes).toEqual([]);
    expect(runtime.createScene).not.toHaveBeenCalled();
    expect(runtime.applyScene).not.toHaveBeenCalled();
  });

  it('updates returned state after a runtime mutation', async () => {
    const initial = createCollection([]);
    const next = createCollection(['focus'], 'focus');
    const runtime = createRuntime(initial);
    vi.mocked(runtime.createScene).mockResolvedValue(next);
    const { result } = renderHook(() => useScenes(runtime));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.createScene(
        {
          backgroundMeta: null,
          bookmarkTreePrefs: { rootPath: [], siblingOrder: {} },
          colorTheme: createSceneFixture().appearance.theme,
          customCSS: '',
          gridSettings: createSceneFixture().appearance.gridSettings,
          groupPreferences: [],
          iconSize: 28,
          overlayScene: { layers: [{ kind: 'bookmarks' }] },
          settings: {
            fontFamily: 'system',
            isExpandView: false,
            isFolderEnabled: true,
            isOpenInNewTab: true,
            isVisibleOnce: false,
          },
          size: 16,
        },
        {
          bookmarkCollection: {
            folderId: 'folder',
            folderOwnership: 'scene',
            folderPath: ['Starlit Scenes', 'Focus'],
            groupPreferences: [],
            siblingOrder: {},
          },
          name: 'Focus',
        },
      );
    });

    expect(result.current.activeSceneId).toBe('focus');
    expect(result.current.activeScene?.name).toBe('focus');
    expect(result.current.error).toBeNull();
  });

  it('reloads persisted state after a mutation fails', async () => {
    const initial = createCollection(['focus'], 'focus');
    const persisted = createCollection(['focus']);
    const runtime = createRuntime(initial);
    vi.mocked(runtime.load)
      .mockResolvedValueOnce(initial)
      .mockResolvedValue(persisted);
    vi.mocked(runtime.applyScene).mockRejectedValue(new Error('apply failed'));
    const { result } = renderHook(() => useScenes(runtime));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await expect(result.current.applyScene('focus')).rejects.toThrow(
        'apply failed',
      );
    });

    expect(result.current.activeSceneId).toBeNull();
    expect(result.current.error?.message).toBe('apply failed');
    expect(runtime.load).toHaveBeenCalledTimes(2);
  });
});
