import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBookmarks } from './useBookmarks';
import type { Bookmark } from './types';

type BookmarkUpdate = Bookmark[] | ((previous: Bookmark[]) => Bookmark[]);

const storageState = vi.hoisted(() => ({
  bookmarks: [] as Bookmark[],
  setBookmarks: vi.fn<(next: BookmarkUpdate) => Promise<void>>(),
}));

const faviconMocks = vi.hoisted(() => ({
  cacheFavicons: vi.fn<() => Promise<void>>(),
  getFavicon:
    vi.fn<
      (
        favicons: Record<string, string>,
        itemId: string,
        fallback?: string,
      ) => string
    >(),
  loadFavicons: vi.fn<() => Promise<Record<string, string>>>(),
  removeFavicon: vi.fn<(itemId: string) => Promise<void>>(),
  saveFavicon: vi.fn<(itemId: string, favicon: string) => Promise<void>>(),
}));

const chromeBookmarkMocks = vi.hoisted(() => ({
  convertTree: vi.fn<() => Bookmark[]>(),
  flattenItems: vi.fn<() => []>(),
  getTree: vi.fn<() => Promise<chrome.bookmarks.BookmarkTreeNode[]>>(),
}));

vi.mock('../hooks/useStorageState', () => ({
  useStorageState: () => ({
    isLoaded: true,
    setValue: storageState.setBookmarks,
    value: storageState.bookmarks,
  }),
}));

vi.mock('../platform/bookmarks/favicon', () => faviconMocks);

vi.mock('../platform/bookmarks/chromeBookmarks', () => ({
  convertTree: chromeBookmarkMocks.convertTree,
  default: { getTree: chromeBookmarkMocks.getTree },
  flattenItems: chromeBookmarkMocks.flattenItems,
}));

const INITIAL_BOOKMARKS: Bookmark[] = [
  {
    children: [
      {
        id: 'folder-2',
        list: [
          {
            id: 'bookmark-3',
            title: 'Nested docs',
            url: 'https://nested.example.com',
          },
        ],
        title: 'Nested',
      },
    ],
    id: 'folder-1',
    list: [
      {
        id: 'bookmark-1',
        title: 'GitHub',
        url: 'https://github.com',
      },
      {
        id: 'bookmark-2',
        title: 'Docs',
        url: 'https://docs.example.com',
      },
    ],
    title: 'Work',
  },
];

async function flushBookmarkEffects(): Promise<void> {
  await act(async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach((): void => {
  storageState.bookmarks = structuredClone(INITIAL_BOOKMARKS);
  storageState.setBookmarks.mockImplementation(async (next): Promise<void> => {
    storageState.bookmarks =
      typeof next === 'function' ? next(storageState.bookmarks) : next;
  });
  faviconMocks.cacheFavicons.mockResolvedValue(undefined);
  faviconMocks.getFavicon.mockImplementation(
    (favicons, itemId, fallback): string => favicons[itemId] ?? fallback ?? '',
  );
  faviconMocks.loadFavicons.mockResolvedValue({});
  faviconMocks.removeFavicon.mockResolvedValue(undefined);
  faviconMocks.saveFavicon.mockResolvedValue(undefined);
  chromeBookmarkMocks.convertTree.mockReturnValue(
    structuredClone(INITIAL_BOOKMARKS),
  );
  chromeBookmarkMocks.flattenItems.mockReturnValue([]);
  chromeBookmarkMocks.getTree.mockResolvedValue([]);
});

afterEach((): void => {
  vi.unstubAllEnvs();
});

describe('useBookmarks', () => {
  it('reports loaded only after the Chrome bookmark source finishes', async () => {
    chromeBookmarkMocks.convertTree.mockReturnValueOnce([]);
    let resolveTree: (tree: chrome.bookmarks.BookmarkTreeNode[]) => void = () =>
      undefined;
    const treePromise = new Promise<chrome.bookmarks.BookmarkTreeNode[]>(
      (resolve) => {
        resolveTree = resolve;
      },
    );
    chromeBookmarkMocks.getTree.mockReturnValue(treePromise);
    const { result } = renderHook(() => useBookmarks());

    await act(async (): Promise<void> => {
      await Promise.resolve();
    });
    expect(result.current.isLoaded).toBe(false);

    await act(async (): Promise<void> => {
      resolveTree([]);
      await treePromise;
    });
    expect(result.current.isLoaded).toBe(true);
    expect(storageState.bookmarks).toEqual([]);
    expect(faviconMocks.cacheFavicons).toHaveBeenCalledWith([]);
  });

  it('removes matching bookmarks from top-level and nested folders', async () => {
    const { result } = renderHook(() => useBookmarks());
    await flushBookmarkEffects();

    expect(result.current.isLoaded).toBe(true);

    await act(async (): Promise<void> => {
      await result.current.handleDeleteBookmark('bookmark-1');
      await result.current.handleDeleteBookmark('bookmark-3');
    });

    expect(storageState.bookmarks[0]?.list?.map((item) => item.id)).toEqual([
      'bookmark-2',
    ]);
    expect(storageState.bookmarks[0]?.children).toEqual([]);
  });

  it('keeps a successful Chrome deletion when the local cache write fails', async () => {
    vi.stubEnv('DEV', false);
    const warning = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const { result } = renderHook(() => useBookmarks());
    await flushBookmarkEffects();
    storageState.setBookmarks.mockRejectedValueOnce(
      new Error('cache unavailable'),
    );

    try {
      await act(async (): Promise<void> => {
        await result.current.handleDeleteBookmark('bookmark-1');
      });

      expect(chrome.bookmarks.remove).toHaveBeenCalledWith('bookmark-1');
      expect(warning).toHaveBeenCalledWith(
        'Bookmark cache update failed after Chrome deletion:',
        expect.any(Error),
      );
    } finally {
      warning.mockRestore();
    }
  });

  it('persists and resets a custom favicon before refreshing resolved data', async () => {
    faviconMocks.loadFavicons
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ 'bookmark-1': 'data:image/png;base64,custom' })
      .mockResolvedValueOnce({});
    const { result } = renderHook(() => useBookmarks());
    await flushBookmarkEffects();

    await act(async (): Promise<void> => {
      await result.current.handleUpdateFavicon(
        0,
        'bookmark-1',
        'data:image/png;base64,custom',
      );
    });

    expect(faviconMocks.saveFavicon).toHaveBeenCalledWith(
      'bookmark-1',
      'data:image/png;base64,custom',
    );
    expect(result.current.bookmarks[0]?.list?.[0]?.favicon).toBe(
      'data:image/png;base64,custom',
    );

    await act(async (): Promise<void> => {
      await result.current.handleResetFavicon('bookmark-1');
    });

    expect(faviconMocks.removeFavicon).toHaveBeenCalledWith('bookmark-1');
  });
});
