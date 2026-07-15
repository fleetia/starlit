import { useState, useEffect, useMemo } from 'react';

import { useStorageState } from '../hooks/useStorageState';
import {
  loadFavicons,
  cacheFavicons,
  saveFavicon,
  removeFavicon,
  getFavicon,
} from '../platform/bookmarks/favicon';
import chromeBookmarks, {
  convertTree,
  flattenItems,
} from '../platform/bookmarks/chromeBookmarks';

import { defaultOptionValue } from '../newtab/defaultOptionValue';
import type { Bookmark } from '../newtab/types';

type UseBookmarksReturn = {
  bookmarks: Bookmark[];
  handleDeleteBookmark: (bookmarkId: string) => Promise<void>;
  handleUpdateFavicon: (
    folderId: number,
    itemId: string,
    favicon: string,
  ) => Promise<void>;
  handleResetFavicon: (itemId: string) => Promise<void>;
  isLoaded: boolean;
};

function resolveFolderFavicons(
  folder: Bookmark,
  favicons: Record<string, string>,
): Bookmark {
  return {
    ...folder,
    favicon: folder.id
      ? getFavicon(favicons, folder.id, folder.favicon)
      : folder.favicon,
    list: folder.list?.map((item) => ({
      ...item,
      favicon: getFavicon(favicons, item.id, item.favicon),
    })),
    children: folder.children?.map((child) =>
      resolveFolderFavicons(child, favicons),
    ),
  };
}

export function useBookmarks(): UseBookmarksReturn {
  const {
    value: bookmarks,
    setValue: setBookmarks,
    isLoaded: isStorageLoaded,
  } = useStorageState<Bookmark[]>(
    'bookmarks',
    defaultOptionValue.bookmarks,
    'local',
  );
  const [favicons, setFavicons] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadFavicons().then(setFavicons);
  }, []);

  useEffect(() => {
    if (!isStorageLoaded) return undefined;

    let isActive = true;

    const syncFromChrome = async (): Promise<void> => {
      try {
        const tree = await chromeBookmarks.getTree();
        const converted = convertTree(tree);
        await setBookmarks(converted);
        await cacheFavicons(flattenItems(converted));
        setFavicons(await loadFavicons());
      } catch (err) {
        console.warn('Bookmark sync failed:', err);
      } finally {
        if (isActive) {
          setIsLoaded(true);
        }
      }
    };

    void syncFromChrome();

    return () => {
      isActive = false;
    };
  }, [isStorageLoaded, setBookmarks]);

  const resolvedBookmarks = useMemo(
    () => bookmarks.map((folder) => resolveFolderFavicons(folder, favicons)),
    [bookmarks, favicons],
  );

  const handleDeleteBookmark = async (bookmarkId: string): Promise<void> => {
    const isChromeSource = !import.meta.env.DEV;
    if (isChromeSource) {
      await chrome.bookmarks.remove(bookmarkId);
    }
    const removeFromFolders = (folders: Bookmark[]): Bookmark[] =>
      folders
        .map((folder) => ({
          ...folder,
          list: folder.list?.filter((item) => item.id !== bookmarkId),
          children: folder.children
            ? removeFromFolders(folder.children)
            : undefined,
        }))
        .filter(
          (folder) =>
            (folder.list?.length ?? 0) > 0 ||
            (folder.children?.length ?? 0) > 0,
        );
    try {
      await setBookmarks((prev) => removeFromFolders(prev));
    } catch (err) {
      if (!isChromeSource) {
        throw err;
      }

      console.warn('Bookmark cache update failed after Chrome deletion:', err);
    }
  };

  const handleUpdateFavicon = async (
    _folderId: number,
    itemId: string,
    favicon: string,
  ): Promise<void> => {
    await saveFavicon(itemId, favicon);
    setFavicons(await loadFavicons());
  };

  const handleResetFavicon = async (itemId: string): Promise<void> => {
    await removeFavicon(itemId);
    setFavicons(await loadFavicons());
  };

  return {
    bookmarks: resolvedBookmarks,
    handleDeleteBookmark,
    handleUpdateFavicon,
    handleResetFavicon,
    isLoaded,
  };
}
