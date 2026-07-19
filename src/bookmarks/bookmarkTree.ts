import type { Bookmark } from './types';
import {
  canUseLegacyBookmarkRouteKey,
  getBookmarkRouteKey,
  getGroupKey,
  getLegacyBookmarkRouteKey,
  getRouteGroupKey,
} from './bookmarkRoute';

function getStoredSiblingOrder(
  parent: Bookmark | undefined,
  parentRoute: readonly string[],
  siblingOrder: Record<string, string[]>,
  canonicalRouteKeys: ReadonlySet<string>,
): string[] | undefined {
  const parentKey = getBookmarkRouteKey(parentRoute);
  const legacyParentKey = getLegacyBookmarkRouteKey(parentRoute);
  const legacyOrder = canUseLegacyBookmarkRouteKey(
    parentRoute,
    canonicalRouteKeys,
  )
    ? siblingOrder[legacyParentKey]
    : undefined;

  return (
    (parent ? siblingOrder[getGroupKey(parent)] : undefined) ??
    siblingOrder[parentKey] ??
    legacyOrder
  );
}

function applyStoredSiblingOrder(
  bookmarks: Bookmark[],
  order: readonly string[] | undefined,
): Bookmark[] {
  if (!order) {
    return bookmarks;
  }

  const remaining = [...bookmarks];
  const ordered: Bookmark[] = [];

  for (const identity of order) {
    let index = remaining.findIndex(
      (bookmark) =>
        getGroupKey(bookmark) === identity ||
        getRouteGroupKey(bookmark) === identity,
    );

    if (index < 0) {
      index = remaining.findIndex(({ title }) => title === identity);
    }

    if (index >= 0) {
      const [bookmark] = remaining.splice(index, 1);
      if (bookmark) {
        ordered.push(bookmark);
      }
    }
  }

  return [...ordered, ...remaining];
}

export function isRouteEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i]);
}

function applySiblingOrderAtRoute(
  bookmarks: Bookmark[],
  siblingOrder: Record<string, string[]>,
  parentRoute: readonly string[],
  canonicalRouteKeys: ReadonlySet<string>,
  parent?: Bookmark,
): Bookmark[] {
  const items = applyStoredSiblingOrder(
    bookmarks,
    getStoredSiblingOrder(
      parent,
      parentRoute,
      siblingOrder,
      canonicalRouteKeys,
    ),
  );

  return items.map((bookmark) => {
    const route = bookmark.route ?? [...parentRoute, bookmark.title];

    return {
      ...bookmark,
      children: bookmark.children
        ? applySiblingOrderAtRoute(
            bookmark.children,
            siblingOrder,
            route,
            canonicalRouteKeys,
            bookmark,
          )
        : undefined,
    };
  });
}

function collectCanonicalRouteKeys(
  bookmarks: Bookmark[],
  parentRoute: readonly string[] = [],
  keys: Set<string> = new Set(),
): Set<string> {
  for (const bookmark of bookmarks) {
    const route = bookmark.route ?? [...parentRoute, bookmark.title];
    keys.add(getBookmarkRouteKey(route));

    if (bookmark.children) {
      collectCanonicalRouteKeys(bookmark.children, route, keys);
    }
  }

  return keys;
}

export function applySiblingOrder(
  bookmarks: Bookmark[],
  siblingOrder: Record<string, string[]>,
): Bookmark[] {
  return applySiblingOrderAtRoute(
    bookmarks,
    siblingOrder,
    [],
    collectCanonicalRouteKeys(bookmarks),
  );
}

function findFolderById(
  bookmarks: Bookmark[],
  rootId: string,
): Bookmark | null {
  for (const bookmark of bookmarks) {
    if (bookmark.id === rootId) {
      return bookmark;
    }

    if (bookmark.children) {
      const found = findFolderById(bookmark.children, rootId);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function findFolderByRoute(
  bookmarks: Bookmark[],
  rootPath: string[],
): Bookmark | null {
  for (const bm of bookmarks) {
    const route = bm.route ?? [];
    if (isRouteEqual(route, rootPath)) {
      return bm;
    }
    if (
      route.length < rootPath.length &&
      route.every((s, i) => s === rootPath[i]) &&
      bm.children
    ) {
      const found = findFolderByRoute(bm.children, rootPath);
      if (found) return found;
    }
  }
  return null;
}

export function getBookmarksAtRoot(
  bookmarks: Bookmark[],
  rootPath: string[],
  rootId?: string,
  siblingOrder: Record<string, string[]> = {},
): Bookmark[] {
  if (rootPath.length === 0) return bookmarks;
  const folder =
    (rootId ? findFolderById(bookmarks, rootId) : null) ??
    findFolderByRoute(bookmarks, rootPath);
  if (!folder) return bookmarks;

  const groups: Bookmark[] = [
    ...(folder.list && folder.list.length > 0
      ? [{ ...folder, children: undefined }]
      : []),
    ...(folder.children ?? []),
  ];

  if (groups.length > 0) {
    return applyStoredSiblingOrder(
      groups,
      getStoredSiblingOrder(
        folder,
        folder.route ?? rootPath,
        siblingOrder,
        collectCanonicalRouteKeys(bookmarks),
      ),
    );
  }

  return bookmarks;
}
