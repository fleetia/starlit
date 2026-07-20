import { useCallback } from 'react';

import { useStorageState } from '../hooks/useStorageState';
import {
  DEFAULT_BOOKMARK_TREE_PREFS,
  decodeBookmarkTreePrefs,
  type BookmarkTreePrefs,
} from './storageDecoders';

export type { BookmarkTreePrefs } from './storageDecoders';

type UseBookmarkTreePrefsReturn = BookmarkTreePrefs & {
  isLoaded: boolean;
  setRootPath: (rootPath: string[], rootId?: string) => Promise<void>;
  updatePreferences: (preferences: BookmarkTreePrefs) => Promise<void>;
  updateSiblingOrder: (parentKey: string, titles: string[]) => Promise<void>;
};

export function useBookmarkTreePrefs(): UseBookmarkTreePrefsReturn {
  const {
    isLoaded,
    value: prefs,
    setValue: setPrefs,
  } = useStorageState<BookmarkTreePrefs>(
    'bookmarkTreePrefs',
    DEFAULT_BOOKMARK_TREE_PREFS,
    decodeBookmarkTreePrefs,
    'sync',
  );

  const setRootPath = useCallback(
    async (rootPath: string[], rootId?: string): Promise<void> => {
      await setPrefs((prev: BookmarkTreePrefs) =>
        rootId
          ? { ...prev, rootId, rootPath }
          : { rootPath, siblingOrder: prev.siblingOrder },
      );
    },
    [setPrefs],
  );

  const updateSiblingOrder = useCallback(
    async (parentKey: string, titles: string[]): Promise<void> => {
      await setPrefs((prev: BookmarkTreePrefs) => ({
        ...prev,
        siblingOrder: { ...prev.siblingOrder, [parentKey]: titles },
      }));
    },
    [setPrefs],
  );

  const updatePreferences = useCallback(
    async (preferences: BookmarkTreePrefs): Promise<void> => {
      await setPrefs(preferences);
    },
    [setPrefs],
  );

  return {
    isLoaded,
    rootId: prefs.rootId,
    rootPath: prefs.rootPath,
    siblingOrder: prefs.siblingOrder,
    setRootPath,
    updatePreferences,
    updateSiblingOrder,
  };
}
