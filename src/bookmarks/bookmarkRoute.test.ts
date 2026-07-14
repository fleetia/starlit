import { describe, expect, it } from 'vitest';

import {
  getBookmarkIdKey,
  getBookmarkRouteKey,
  getGroupKey,
  getLegacyBookmarkRouteKey,
  parseBookmarkRouteKey,
} from './bookmarkRoute';

describe('bookmark route keys', () => {
  it('keeps the legacy key for routes without separator collisions', () => {
    const route = ['Bookmarks Bar', 'Design Systems'];

    expect(getBookmarkRouteKey(route)).toBe('Bookmarks Bar/Design Systems');
    expect(parseBookmarkRouteKey(getBookmarkRouteKey(route))).toEqual(route);
  });

  it('distinguishes a slash in a title from a route separator', () => {
    const titleWithSlash = ['Bookmarks Bar', 'Design/Systems'];
    const nestedRoute = ['Bookmarks Bar', 'Design', 'Systems'];
    const titleKey = getBookmarkRouteKey(titleWithSlash);
    const nestedKey = getBookmarkRouteKey(nestedRoute);

    expect(getLegacyBookmarkRouteKey(titleWithSlash)).toBe(
      getLegacyBookmarkRouteKey(nestedRoute),
    );
    expect(titleKey).not.toBe(nestedKey);
    expect(parseBookmarkRouteKey(titleKey)).toEqual(titleWithSlash);
    expect(parseBookmarkRouteKey(nestedKey)).toEqual(nestedRoute);
  });

  it('uses the Chrome bookmark id as canonical identity when available', () => {
    expect(
      getGroupKey({ id: 'folder/42', route: ['Work'], title: 'Work' }),
    ).toBe(getBookmarkIdKey('folder/42'));
    expect(getGroupKey({ route: ['Work'], title: 'Work' })).toBe('Work');
  });
});
