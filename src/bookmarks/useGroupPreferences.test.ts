import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getBookmarkIdKey, getBookmarkRouteKey } from './bookmarkRoute';
import { useGroupPreferences } from './useGroupPreferences';
import type { Bookmark, GroupPreference } from './types';

type PreferenceUpdate =
  GroupPreference[] | ((previous: GroupPreference[]) => GroupPreference[]);

const storageState = vi.hoisted(() => ({
  preferences: [] as GroupPreference[],
  setPreferences: vi.fn<(next: PreferenceUpdate) => Promise<void>>(),
}));

vi.mock('../hooks/useStorageState', () => ({
  useStorageState: () => ({
    isLoaded: true,
    setValue: storageState.setPreferences,
    value: storageState.preferences,
  }),
}));

function makeBookmarks(...titles: string[]): Bookmark[] {
  return titles.map((title) => ({
    list: [{ id: `${title}-item`, title: 'item', url: 'https://example.com' }],
    title,
  }));
}

beforeEach((): void => {
  storageState.preferences = [];
  storageState.setPreferences.mockImplementation(
    async (next): Promise<void> => {
      storageState.preferences =
        typeof next === 'function' ? next(storageState.preferences) : next;
    },
  );
});

describe('useGroupPreferences', () => {
  it('reconciles saved visibility and route-based keys with current groups', () => {
    storageState.preferences = [
      { key: 'A', visible: false },
      { key: 'stale', visible: true },
    ];
    const bookmarks: Bookmark[] = [
      ...makeBookmarks('A', 'B'),
      { list: [], route: ['root', 'nested'], title: 'Nested' },
    ];

    const { result } = renderHook(() => useGroupPreferences(bookmarks));

    expect(result.current.groupPreferences).toEqual([
      { key: 'A', visible: false },
      { key: 'B', visible: true },
      { key: 'root/nested', visible: true },
    ]);
    expect(
      result.current.orderedBookmarks.map((bookmark) => bookmark.title),
    ).toEqual(['B', 'Nested']);
    expect(result.current.isLoaded).toBe(true);
  });

  it('persists a visibility toggle against the reconciled groups', async () => {
    const { result } = renderHook(() =>
      useGroupPreferences(makeBookmarks('A', 'B')),
    );

    await act(async (): Promise<void> => {
      await result.current.toggleVisibility('A');
    });

    expect(storageState.preferences).toEqual([
      { key: 'A', visible: false },
      { key: 'B', visible: true },
    ]);
  });

  it('keeps slash-bearing group titles distinct from nested routes', () => {
    const titleWithSlash: Bookmark = {
      list: [],
      route: ['root/child'],
      title: 'root/child',
    };
    const nestedRoute: Bookmark = {
      list: [],
      route: ['root', 'child'],
      title: 'child',
    };
    storageState.preferences = [
      { key: getBookmarkRouteKey(['root/child']), visible: false },
      { key: 'root/child', visible: true },
    ];

    const { result } = renderHook(() =>
      useGroupPreferences([titleWithSlash, nestedRoute]),
    );

    expect(result.current.groupPreferences).toEqual([
      {
        key: getBookmarkRouteKey(['root/child']),
        visible: false,
      },
      { key: 'root/child', visible: true },
    ]);
    expect(result.current.groupPreferences[0]?.key).not.toBe(
      result.current.groupPreferences[1]?.key,
    );
  });

  it('reads a legacy slash-bearing group key when no encoded key exists', () => {
    storageState.preferences = [{ key: 'root/child', visible: false }];

    const { result } = renderHook(() =>
      useGroupPreferences([
        {
          list: [],
          route: ['root/child'],
          title: 'root/child',
        },
      ]),
    );

    expect(result.current.groupPreferences).toEqual([
      {
        key: getBookmarkRouteKey(['root/child']),
        visible: false,
      },
    ]);
  });

  it('does not read a normal group key as a slash-route legacy key', () => {
    storageState.preferences = [{ key: 'root/child', visible: false }];

    const slashGroup: Bookmark = {
      list: [],
      route: ['root/child'],
      title: 'root/child',
    };
    const nestedGroup: Bookmark = {
      list: [],
      route: ['root', 'child'],
      title: 'child',
    };

    const { result } = renderHook(() =>
      useGroupPreferences([slashGroup], [slashGroup, nestedGroup]),
    );

    expect(result.current.groupPreferences).toEqual([
      {
        key: getBookmarkRouteKey(['root/child']),
        visible: true,
      },
    ]);
  });

  it('keeps duplicate title groups independently visible by bookmark id', () => {
    const duplicateGroups: Bookmark[] = [
      {
        id: 'first',
        list: [],
        route: ['Root', 'Same'],
        title: 'Same',
      },
      {
        id: 'second',
        list: [],
        route: ['Root', 'Same'],
        title: 'Same',
      },
    ];
    storageState.preferences = [
      { key: getBookmarkIdKey('first'), visible: false },
      { key: getBookmarkIdKey('second'), visible: true },
    ];

    const { result } = renderHook(() => useGroupPreferences(duplicateGroups));

    expect(result.current.groupPreferences).toEqual(storageState.preferences);
    expect(result.current.orderedBookmarks.map(({ id }) => id)).toEqual([
      'second',
    ]);
  });
});
