import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBookmarkTreePrefs } from './useBookmarkTreePrefs';

type BookmarkTreePrefs = {
  rootId?: string;
  rootPath: string[];
  siblingOrder: Record<string, string[]>;
};

type BookmarkTreePrefsUpdate =
  | BookmarkTreePrefs
  | ((previous: BookmarkTreePrefs) => BookmarkTreePrefs);

const storageState = vi.hoisted(() => ({
  prefs: { rootPath: [], siblingOrder: {} } as BookmarkTreePrefs,
  setPrefs: vi.fn<(next: BookmarkTreePrefsUpdate) => Promise<void>>(),
}));

vi.mock('../hooks/useStorageState', () => ({
  useStorageState: () => ({
    isLoaded: true,
    setValue: storageState.setPrefs,
    value: storageState.prefs,
  }),
}));

beforeEach((): void => {
  storageState.prefs = { rootPath: [], siblingOrder: {} };
  storageState.setPrefs.mockImplementation(async (next): Promise<void> => {
    storageState.prefs =
      typeof next === 'function' ? next(storageState.prefs) : next;
  });
});

describe('useBookmarkTreePrefs', () => {
  it('updates the root path without dropping sibling order', async () => {
    storageState.prefs = {
      rootPath: [],
      siblingOrder: { root: ['Work', 'Personal'] },
    };
    const { result } = renderHook(() => useBookmarkTreePrefs());

    expect(result.current.isLoaded).toBe(true);

    await act(async (): Promise<void> => {
      await result.current.setRootPath(['Bookmarks', 'Work']);
    });

    expect(storageState.prefs).toEqual({
      rootPath: ['Bookmarks', 'Work'],
      siblingOrder: { root: ['Work', 'Personal'] },
    });
  });

  it('stores a canonical root id alongside the legacy title path', async () => {
    const { result } = renderHook(() => useBookmarkTreePrefs());

    await act(async (): Promise<void> => {
      await result.current.setRootPath(['Bookmarks', 'Same'], 'folder-2');
    });

    expect(storageState.prefs).toEqual({
      rootId: 'folder-2',
      rootPath: ['Bookmarks', 'Same'],
      siblingOrder: {},
    });
  });

  it('updates one sibling order without dropping another parent', async () => {
    storageState.prefs = {
      rootPath: ['Bookmarks'],
      siblingOrder: { parentA: ['A', 'B'] },
    };
    const { result } = renderHook(() => useBookmarkTreePrefs());

    await act(async (): Promise<void> => {
      await result.current.updateSiblingOrder('parentB', ['Y', 'X']);
    });

    expect(storageState.prefs).toEqual({
      rootPath: ['Bookmarks'],
      siblingOrder: {
        parentA: ['A', 'B'],
        parentB: ['Y', 'X'],
      },
    });
  });
});
