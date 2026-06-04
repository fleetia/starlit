import { useState, useEffect, useMemo } from "react";

import { useStorageState } from "@/hooks/useStorageState";
import {
  loadFavicons,
  cacheFavicons,
  saveFavicon,
  removeFavicon,
  getFavicon
} from "@/utils/favicon";
import chromeBookmarks, { convertTree, flattenItems } from "@/utils/bookmarks";

import { Bookmark } from "../types";
import { defaultOptionValue } from "../defaultOptionValue";

export function useBookmarks() {
  const {
    value: bookmarks,
    setValue: setBookmarks,
    isLoaded
  } = useStorageState<Bookmark[]>(
    "bookmarks",
    defaultOptionValue.bookmarks,
    "local"
  );
  const [favicons, setFavicons] = useState<Record<string, string>>({});

  useEffect(() => {
    loadFavicons().then(setFavicons);
  }, []);

  // 실행 시 크롬 북마크 자동 싱크
  useEffect(() => {
    if (!isLoaded) return;

    const syncFromChrome = async () => {
      try {
        const tree = await chromeBookmarks.getTree();
        const converted = convertTree(tree);
        if (converted.length > 0) {
          await setBookmarks(converted);
          await cacheFavicons(flattenItems(converted));
          setFavicons(await loadFavicons());
        }
      } catch (err) {
        // 크롬 북마크 API 사용 불가 시 (권한 없음 등) 기존 데이터 유지
        console.warn("Bookmark sync failed:", err);
      }
    };

    syncFromChrome();
  }, [isLoaded]);

  const resolveFolder = (folder: Bookmark): Bookmark => ({
    ...folder,
    favicon: folder.id
      ? getFavicon(favicons, folder.id, folder.favicon)
      : folder.favicon,
    list: folder.list?.map(item => ({
      ...item,
      favicon: getFavicon(favicons, item.id, item.favicon)
    })),
    children: folder.children?.map(resolveFolder)
  });

  const resolvedBookmarks = useMemo(
    () => bookmarks.map(resolveFolder),
    [bookmarks, favicons]
  );

  const handleDeleteBookmark = async (bookmarkId: string): Promise<void> => {
    if (!import.meta.env.DEV) {
      await chrome.bookmarks.remove(bookmarkId);
    }
    const removeFromFolders = (folders: Bookmark[]): Bookmark[] =>
      folders
        .map(folder => ({
          ...folder,
          list: folder.list?.filter(item => item.id !== bookmarkId),
          children: folder.children
            ? removeFromFolders(folder.children)
            : undefined
        }))
        .filter(
          folder =>
            (folder.list?.length ?? 0) > 0 || (folder.children?.length ?? 0) > 0
        );
    await setBookmarks(prev => removeFromFolders(prev));
  };

  const handleUpdateFavicon = async (
    folderId: number,
    itemId: string,
    favicon: string
  ): Promise<void> => {
    // 파비콘 캐시에 저장 (자동 싱크 후에도 유지됨)
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
    handleResetFavicon
  };
}
