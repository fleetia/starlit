import type { BookmarkTreePrefs } from '../bookmarks/storageDecoders';
import {
  getBookmarkIdKey,
  parseBookmarkIdKey,
} from '../bookmarks/bookmarkRoute';
import type { GroupPreference } from '../bookmarks/types';

export type BookmarkPreferences = {
  groupPreferences: readonly GroupPreference[];
  siblingOrder: BookmarkTreePrefs['siblingOrder'];
};

function remapIdentity(
  identity: string,
  identityMap: ReadonlyMap<string, string>,
): string | null {
  const bookmarkId = parseBookmarkIdKey(identity);
  if (bookmarkId === null) {
    return identity;
  }

  const remappedId = identityMap.get(bookmarkId);
  return remappedId === undefined ? null : getBookmarkIdKey(remappedId);
}

export function remapBookmarkPreferences(
  preferences: BookmarkPreferences,
  identityMap: ReadonlyMap<string, string>,
): {
  groupPreferences: GroupPreference[];
  siblingOrder: BookmarkTreePrefs['siblingOrder'];
} {
  const groupPreferences = preferences.groupPreferences.flatMap(
    (preference) => {
      const key = remapIdentity(preference.key, identityMap);
      return key === null ? [] : [{ ...preference, key }];
    },
  );
  const siblingOrder = Object.fromEntries(
    Object.entries(preferences.siblingOrder).flatMap(
      ([parentKey, childKeys]) => {
        const remappedParentKey = remapIdentity(parentKey, identityMap);
        if (remappedParentKey === null) {
          return [];
        }

        const remappedChildKeys = childKeys.flatMap((childKey) => {
          const remappedChildKey = remapIdentity(childKey, identityMap);
          return remappedChildKey === null ? [] : [remappedChildKey];
        });
        return [[remappedParentKey, remappedChildKeys] as const];
      },
    ),
  );

  return { groupPreferences, siblingOrder };
}
