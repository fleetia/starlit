import type { Bookmark, BookmarkItem, GroupPreference } from './types';

export type BookmarkTreePrefs = {
  rootId?: string;
  rootPath: string[];
  siblingOrder: Record<string, string[]>;
};

export type FaviconMap = Record<string, string>;

export const DEFAULT_BOOKMARK_TREE_PREFS: BookmarkTreePrefs = {
  rootPath: [],
  siblingOrder: {},
};

type ValueGuard<Value> = (value: unknown) => value is Value;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isBookmarkItem(value: unknown): value is BookmarkItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.url === 'string' &&
    isOptionalString(value.favicon)
  );
}

function isBookmark(value: unknown, ancestors: Set<object>): value is Bookmark {
  if (!isRecord(value) || ancestors.has(value)) {
    return false;
  }

  ancestors.add(value);

  try {
    return (
      typeof value.title === 'string' &&
      isOptionalString(value.id) &&
      isOptionalString(value.description) &&
      isOptionalString(value.url) &&
      isOptionalString(value.favicon) &&
      (value.route === undefined || isStringArray(value.route)) &&
      (value.list === undefined ||
        (Array.isArray(value.list) && value.list.every(isBookmarkItem))) &&
      (value.children === undefined ||
        (Array.isArray(value.children) &&
          value.children.every((child) => isBookmark(child, ancestors))))
    );
  } finally {
    ancestors.delete(value);
  }
}

function isBookmarks(value: unknown): value is Bookmark[] {
  if (!Array.isArray(value)) {
    return false;
  }

  const ancestors = new Set<object>();
  return value.every((bookmark) => isBookmark(bookmark, ancestors));
}

export function isGroupPreferences(value: unknown): value is GroupPreference[] {
  return (
    Array.isArray(value) &&
    value.every(
      (preference) =>
        isRecord(preference) &&
        typeof preference.key === 'string' &&
        typeof preference.visible === 'boolean',
    )
  );
}

export function isBookmarkTreePrefs(
  value: unknown,
): value is BookmarkTreePrefs {
  return (
    isRecord(value) &&
    isOptionalString(value.rootId) &&
    isStringArray(value.rootPath) &&
    isRecord(value.siblingOrder) &&
    Object.values(value.siblingOrder).every(isStringArray)
  );
}

export function isFaviconMap(value: unknown): value is FaviconMap {
  return (
    isRecord(value) &&
    Object.values(value).every((favicon) => typeof favicon === 'string')
  );
}

function decodeValue<Value>(
  rawValue: unknown,
  fallback: Value,
  isValue: ValueGuard<Value>,
): Value {
  try {
    return isValue(rawValue) ? rawValue : fallback;
  } catch {
    return fallback;
  }
}

export function decodeBookmarks(
  rawValue: unknown,
  fallback: Bookmark[],
): Bookmark[] {
  return decodeValue(rawValue, fallback, isBookmarks);
}

export function decodeGroupPreferences(
  rawValue: unknown,
  fallback: GroupPreference[],
): GroupPreference[] {
  return decodeValue(rawValue, fallback, isGroupPreferences);
}

export function decodeBookmarkTreePrefs(
  rawValue: unknown,
  fallback: BookmarkTreePrefs,
): BookmarkTreePrefs {
  return decodeValue(rawValue, fallback, isBookmarkTreePrefs);
}

export function decodeFaviconMap(
  rawValue: unknown,
  fallback: FaviconMap,
): FaviconMap {
  return decodeValue(rawValue, fallback, isFaviconMap);
}
