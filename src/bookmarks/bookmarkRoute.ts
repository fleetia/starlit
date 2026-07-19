import type { Bookmark } from './types';

const ESCAPED_ROUTE_PREFIX = '~starlit-route-v2~';
const BOOKMARK_ID_PREFIX = '~starlit-bookmark-id~';

export function getLegacyBookmarkRouteKey(route: readonly string[]): string {
  return route.join('/');
}

export function getBookmarkRouteKey(route: readonly string[]): string {
  const legacyKey = getLegacyBookmarkRouteKey(route);
  const needsEscaping =
    route.some((segment) => segment.includes('/')) ||
    legacyKey.startsWith(ESCAPED_ROUTE_PREFIX) ||
    legacyKey.startsWith(BOOKMARK_ID_PREFIX) ||
    (route.length > 0 && legacyKey === '');

  if (!needsEscaping) {
    return legacyKey;
  }

  return `${ESCAPED_ROUTE_PREFIX}${route.map(encodeURIComponent).join('/')}`;
}

export function parseBookmarkRouteKey(key: string): string[] {
  if (!key) {
    return [];
  }

  if (!key.startsWith(ESCAPED_ROUTE_PREFIX)) {
    return key.split('/');
  }

  const encodedRoute = key.slice(ESCAPED_ROUTE_PREFIX.length);

  try {
    return encodedRoute.split('/').map(decodeURIComponent);
  } catch {
    return [];
  }
}

export function canUseLegacyBookmarkRouteKey(
  route: readonly string[],
  canonicalKeys: ReadonlySet<string>,
): boolean {
  const key = getBookmarkRouteKey(route);
  const legacyKey = getLegacyBookmarkRouteKey(route);

  return key === legacyKey || !canonicalKeys.has(legacyKey);
}

function getBookmarkRoute(bookmark: Bookmark): readonly string[] {
  return bookmark.route ?? [bookmark.title];
}

export function getBookmarkIdKey(id: string): string {
  return `${BOOKMARK_ID_PREFIX}${encodeURIComponent(id)}`;
}

export function getRouteGroupKey(bookmark: Bookmark): string {
  return getBookmarkRouteKey(getBookmarkRoute(bookmark));
}

export function getGroupKey(bookmark: Bookmark): string {
  return bookmark.id
    ? getBookmarkIdKey(bookmark.id)
    : getRouteGroupKey(bookmark);
}

export function getLegacyGroupKey(bookmark: Bookmark): string {
  return getLegacyBookmarkRouteKey(getBookmarkRoute(bookmark));
}
