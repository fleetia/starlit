import { Bookmark } from "../types";

export function isRouteEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i]);
}

export function applySiblingOrder(
  bookmarks: Bookmark[],
  siblingOrder: Record<string, string[]>,
  parentKey: string = ""
): Bookmark[] {
  const order = siblingOrder[parentKey];
  let items = bookmarks;
  if (order) {
    const byTitle = new Map(bookmarks.map(b => [b.title, b]));
    items = [
      ...order.filter(t => byTitle.has(t)).map(t => byTitle.get(t)!),
      ...bookmarks.filter(b => !order.includes(b.title))
    ];
  }
  return items.map(bm => ({
    ...bm,
    children: bm.children
      ? applySiblingOrder(bm.children, siblingOrder, (bm.route ?? []).join("/"))
      : undefined
  }));
}

function findFolder(
  bookmarks: Bookmark[],
  rootPath: string[]
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
      const found = findFolder(bm.children, rootPath);
      if (found) return found;
    }
  }
  return null;
}

export function getBookmarksAtRoot(
  bookmarks: Bookmark[],
  rootPath: string[]
): Bookmark[] {
  if (rootPath.length === 0) return bookmarks;
  const folder = findFolder(bookmarks, rootPath);
  if (!folder) return bookmarks;

  if (folder.children && folder.children.length > 0) {
    return folder.children;
  }
  if (folder.list && folder.list.length > 0) {
    return [{ ...folder, children: undefined }];
  }
  return bookmarks;
}
