import { useMemo, useCallback } from "react";

import { useStorageState } from "@/hooks/useStorageState";

import { Bookmark, GroupPreference, getGroupKey } from "../types";

export function useGroupPreferences(bookmarks: Bookmark[]) {
  const { value: preferences, setValue: setPreferences } = useStorageState<
    GroupPreference[]
  >("groupPreferences", [], "sync");

  const reconciled = useMemo(() => {
    const visibilityMap = new Map(preferences.map(p => [p.key, p.visible]));
    return bookmarks.map(b => {
      const key = getGroupKey(b);
      return { key, visible: visibilityMap.get(key) ?? true };
    });
  }, [bookmarks, preferences]);

  const orderedBookmarks = useMemo(() => {
    const byKey = new Map(bookmarks.map(b => [getGroupKey(b), b]));
    return reconciled
      .filter(p => p.visible)
      .map(p => byKey.get(p.key))
      .filter((b): b is Bookmark => b != null);
  }, [bookmarks, reconciled]);

  const toggleVisibility = useCallback(
    async (key: string) => {
      const next = reconciled.map(p =>
        p.key === key ? { ...p, visible: !p.visible } : p
      );
      await setPreferences(next);
    },
    [reconciled, setPreferences]
  );

  return { groupPreferences: reconciled, orderedBookmarks, toggleVisibility };
}
