import { useMemo, useCallback } from 'react';

import { useStorageState } from '../hooks/useStorageState';
import {
  canUseLegacyBookmarkRouteKey,
  getGroupKey,
  getLegacyGroupKey,
  getRouteGroupKey,
} from './bookmarkRoute';
import type { Bookmark, GroupPreference } from './types';

type UseGroupPreferencesReturn = {
  groupPreferences: GroupPreference[];
  isLoaded: boolean;
  orderedBookmarks: Bookmark[];
  toggleVisibility: (key: string) => Promise<void>;
  updateGroupPreferences: (preferences: GroupPreference[]) => Promise<void>;
};

function collectCanonicalRouteKeys(
  bookmarks: Bookmark[],
  keys: Set<string> = new Set(),
): Set<string> {
  for (const bookmark of bookmarks) {
    keys.add(getRouteGroupKey(bookmark));

    if (bookmark.children) {
      collectCanonicalRouteKeys(bookmark.children, keys);
    }
  }

  return keys;
}

export function useGroupPreferences(
  bookmarks: Bookmark[],
  knownBookmarks: Bookmark[] = bookmarks,
): UseGroupPreferencesReturn {
  const {
    isLoaded,
    value: preferences,
    setValue: setPreferences,
  } = useStorageState<GroupPreference[]>('groupPreferences', [], 'sync');

  const reconciled = useMemo(() => {
    const visibilityMap = new Map(preferences.map((p) => [p.key, p.visible]));
    const canonicalRouteKeys = collectCanonicalRouteKeys(knownBookmarks);

    return bookmarks.map((b) => {
      const key = getGroupKey(b);
      const routeKey = getRouteGroupKey(b);
      const legacyKey = getLegacyGroupKey(b);
      const route = b.route ?? [b.title];
      const legacyVisibility = canUseLegacyBookmarkRouteKey(
        route,
        canonicalRouteKeys,
      )
        ? visibilityMap.get(legacyKey)
        : undefined;

      return {
        key,
        visible:
          visibilityMap.get(key) ??
          visibilityMap.get(routeKey) ??
          legacyVisibility ??
          true,
      };
    });
  }, [bookmarks, knownBookmarks, preferences]);

  const orderedBookmarks = useMemo(() => {
    const byKey = new Map(bookmarks.map((b) => [getGroupKey(b), b]));
    return reconciled
      .filter((p) => p.visible)
      .map((p) => byKey.get(p.key))
      .filter((b): b is Bookmark => b != null);
  }, [bookmarks, reconciled]);

  const toggleVisibility = useCallback(
    async (key: string): Promise<void> => {
      const next = reconciled.map((p) =>
        p.key === key ? { ...p, visible: !p.visible } : p,
      );
      await setPreferences(next);
    },
    [reconciled, setPreferences],
  );

  const updateGroupPreferences = useCallback(
    async (nextPreferences: GroupPreference[]): Promise<void> => {
      await setPreferences(nextPreferences);
    },
    [setPreferences],
  );

  return {
    groupPreferences: reconciled,
    isLoaded,
    orderedBookmarks,
    toggleVisibility,
    updateGroupPreferences,
  };
}
