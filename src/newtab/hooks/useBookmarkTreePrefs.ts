import { useCallback } from "react";
import { useStorageState } from "@/hooks/useStorageState";

type BookmarkTreePrefs = {
  rootPath: string[];
  siblingOrder: Record<string, string[]>;
};

const defaultPrefs: BookmarkTreePrefs = {
  rootPath: [],
  siblingOrder: {}
};

export function useBookmarkTreePrefs() {
  const { value: prefs, setValue: setPrefs } =
    useStorageState<BookmarkTreePrefs>(
      "bookmarkTreePrefs",
      defaultPrefs,
      "sync"
    );

  const setRootPath = useCallback(
    async (rootPath: string[]) => {
      await setPrefs((prev: BookmarkTreePrefs) => ({ ...prev, rootPath }));
    },
    [setPrefs]
  );

  const updateSiblingOrder = useCallback(
    async (parentKey: string, titles: string[]) => {
      await setPrefs((prev: BookmarkTreePrefs) => ({
        ...prev,
        siblingOrder: { ...prev.siblingOrder, [parentKey]: titles }
      }));
    },
    [setPrefs]
  );

  return {
    rootPath: prefs.rootPath,
    siblingOrder: prefs.siblingOrder,
    setRootPath,
    updateSiblingOrder
  };
}
