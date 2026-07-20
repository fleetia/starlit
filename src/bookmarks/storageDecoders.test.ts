import { describe, expect, it } from 'vitest';

import type { Bookmark, GroupPreference } from './types';
import {
  decodeBookmarks,
  decodeBookmarkTreePrefs,
  decodeFaviconMap,
  decodeGroupPreferences,
  type BookmarkTreePrefs,
  type FaviconMap,
} from './storageDecoders';

describe('bookmark storage decoders', () => {
  it('accepts a recursively valid bookmark cache', () => {
    const fallback: Bookmark[] = [{ title: 'Fallback' }];
    const stored: Bookmark[] = [
      {
        children: [
          {
            id: 'nested-folder',
            list: [
              {
                favicon: 'data:image/png;base64,nested',
                id: 'nested-bookmark',
                title: 'Nested bookmark',
                url: 'https://nested.example.com',
              },
            ],
            route: ['Root', 'Nested'],
            title: 'Nested',
          },
        ],
        description: 'Stored bookmarks',
        favicon: 'data:image/png;base64,folder',
        id: 'root-folder',
        list: [
          {
            id: 'root-bookmark',
            title: 'Root bookmark',
            url: 'https://example.com',
          },
        ],
        route: ['Root'],
        title: 'Root',
        url: 'https://folder.example.com',
      },
    ];

    expect(decodeBookmarks(stored, fallback)).toBe(stored);
  });

  it('falls back when a nested bookmark item is invalid', () => {
    const fallback: Bookmark[] = [{ title: 'Fallback' }];
    const stored = [
      {
        children: [
          {
            list: [{ id: 'bookmark', title: 'Broken', url: 42 }],
            title: 'Nested',
          },
        ],
        title: 'Root',
      },
    ];

    expect(decodeBookmarks(stored, fallback)).toBe(fallback);
  });

  it('falls back for a cyclic bookmark cache without throwing', () => {
    const fallback: Bookmark[] = [{ title: 'Fallback' }];
    const stored: Record<string, unknown> = { title: 'Cyclic' };
    stored.children = [stored];

    expect(decodeBookmarks([stored], fallback)).toBe(fallback);
  });

  it('validates every group preference', () => {
    const fallback: GroupPreference[] = [{ key: 'fallback', visible: true }];
    const stored: GroupPreference[] = [
      { key: 'work', visible: false },
      { key: 'personal', visible: true },
    ];

    expect(decodeGroupPreferences(stored, fallback)).toBe(stored);
    expect(
      decodeGroupPreferences([{ key: 'work', visible: 'yes' }], fallback),
    ).toBe(fallback);
  });

  it('validates bookmark tree paths and every sibling order entry', () => {
    const fallback: BookmarkTreePrefs = { rootPath: [], siblingOrder: {} };
    const stored: BookmarkTreePrefs = {
      rootId: 'folder-1',
      rootPath: ['Bookmarks', 'Work'],
      siblingOrder: {
        'folder-1': ['Inbox', 'Reference'],
        root: ['Work', 'Personal'],
      },
    };

    expect(decodeBookmarkTreePrefs(stored, fallback)).toBe(stored);
    expect(
      decodeBookmarkTreePrefs(
        {
          rootPath: ['Bookmarks'],
          siblingOrder: { root: ['Work', 42] },
        },
        fallback,
      ),
    ).toBe(fallback);
  });

  it('validates every favicon map value', () => {
    const fallback: FaviconMap = { fallback: 'fallback-data' };
    const stored: FaviconMap = {
      first: 'data:image/png;base64,first',
      second: 'https://example.com/favicon.png',
    };

    expect(decodeFaviconMap(stored, fallback)).toBe(stored);
    expect(
      decodeFaviconMap({ first: stored.first, second: 42 }, fallback),
    ).toBe(fallback);
  });

  it('returns each supplied fallback for missing or malformed values', () => {
    const bookmarks: Bookmark[] = [{ title: 'Fallback' }];
    const groupPreferences: GroupPreference[] = [];
    const treePreferences: BookmarkTreePrefs = {
      rootPath: [],
      siblingOrder: {},
    };
    const favicons: FaviconMap = {};

    expect(decodeBookmarks(null, bookmarks)).toBe(bookmarks);
    expect(decodeGroupPreferences({}, groupPreferences)).toBe(groupPreferences);
    expect(decodeBookmarkTreePrefs(undefined, treePreferences)).toBe(
      treePreferences,
    );
    expect(decodeFaviconMap([], favicons)).toBe(favicons);
    expect(decodeFaviconMap(new Date(), favicons)).toBe(favicons);
  });
});
