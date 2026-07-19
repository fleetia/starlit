import { describe, expect, it } from 'vitest';

import { applySiblingOrder, getBookmarksAtRoot } from './bookmarkTree';
import { getBookmarkIdKey, getBookmarkRouteKey } from './bookmarkRoute';
import type { Bookmark } from './types';

const TREE: Bookmark[] = [
  {
    id: 'root',
    title: 'Root',
    route: ['Root'],
    children: [
      { id: 'a', title: 'A', route: ['Root', 'A'] },
      {
        id: 'b',
        title: 'B',
        route: ['Root', 'B'],
        children: [{ id: 'deep', title: 'Deep', route: ['Root', 'B', 'Deep'] }],
      },
    ],
  },
];

describe('bookmark tree', () => {
  it('applies sibling order at each persisted parent path', () => {
    const ordered = applySiblingOrder(TREE, {
      Root: ['B', 'A'],
    });

    expect(ordered[0]?.children?.map((item) => item.title)).toEqual(['B', 'A']);
  });

  it('orders duplicate sibling titles by id without losing either folder', () => {
    const duplicateTree: Bookmark[] = [
      {
        children: [
          { id: 'first', route: ['Root', 'Same'], title: 'Same' },
          { id: 'second', route: ['Root', 'Same'], title: 'Same' },
        ],
        id: 'duplicate-root',
        route: ['Root'],
        title: 'Root',
      },
    ];
    const ordered = applySiblingOrder(duplicateTree, {
      [getBookmarkIdKey('duplicate-root')]: [
        getBookmarkIdKey('second'),
        getBookmarkIdKey('first'),
      ],
    });

    expect(ordered[0]?.children?.map((item) => item.id)).toEqual([
      'second',
      'first',
    ]);
  });

  it('consumes repeated legacy titles once each without duplicating folders', () => {
    const duplicateTree: Bookmark[] = [
      {
        children: [
          { id: 'first', route: ['Root', 'Same'], title: 'Same' },
          { id: 'second', route: ['Root', 'Same'], title: 'Same' },
        ],
        id: 'duplicate-root',
        route: ['Root'],
        title: 'Root',
      },
    ];
    const ordered = applySiblingOrder(duplicateTree, {
      Root: ['Same', 'Same'],
    });

    expect(ordered[0]?.children?.map((item) => item.id)).toEqual([
      'first',
      'second',
    ]);
  });

  it('selects deeply nested groups as a new root', () => {
    expect(
      getBookmarksAtRoot(TREE, ['Root', 'B']).map((item) => item.id),
    ).toEqual(['deep']);
  });

  it('keeps direct bookmarks alongside child groups at the selected root', () => {
    const mixedRoot: Bookmark = {
      children: [
        { id: 'child-folder', route: ['Toolbar', 'Folder'], title: 'Folder' },
      ],
      id: 'toolbar',
      list: [
        {
          id: 'direct-bookmark',
          title: 'Direct bookmark',
          url: 'https://example.com/direct',
        },
      ],
      route: ['Toolbar'],
      title: 'Toolbar',
    };

    const groups = getBookmarksAtRoot([mixedRoot], ['Toolbar']);

    expect(groups.map((group) => group.id)).toEqual([
      'toolbar',
      'child-folder',
    ]);
    expect(groups[0]?.children).toBeUndefined();
    expect(groups[0]?.list?.map((item) => item.id)).toEqual([
      'direct-bookmark',
    ]);
  });

  it('selects duplicate title routes by canonical folder id', () => {
    const duplicateRoots: Bookmark[] = [
      {
        id: 'first-root',
        list: [{ id: 'first-item', title: 'First', url: 'https://first.test' }],
        route: ['Toolbar', 'Same'],
        title: 'Same',
      },
      {
        id: 'second-root',
        list: [
          { id: 'second-item', title: 'Second', url: 'https://second.test' },
        ],
        route: ['Toolbar', 'Same'],
        title: 'Same',
      },
    ];

    expect(
      getBookmarksAtRoot(duplicateRoots, ['Toolbar', 'Same'], 'second-root')[0]
        ?.list?.[0]?.id,
    ).toBe('second-item');
  });

  it('orders a selected root direct-bookmark group with its child groups', () => {
    const mixedRoot: Bookmark = {
      children: [
        { id: 'child-folder', route: ['Toolbar', 'Folder'], title: 'Folder' },
      ],
      id: 'toolbar',
      list: [
        {
          id: 'direct-bookmark',
          title: 'Direct bookmark',
          url: 'https://example.com/direct',
        },
      ],
      route: ['Toolbar'],
      title: 'Toolbar',
    };

    expect(
      getBookmarksAtRoot([mixedRoot], ['Toolbar'], 'toolbar', {
        [getBookmarkIdKey('toolbar')]: [
          getBookmarkIdKey('child-folder'),
          getBookmarkIdKey('toolbar'),
        ],
      }).map((group) => group.id),
    ).toEqual(['child-folder', 'toolbar']);
  });

  it('keeps slash-bearing parent routes separate when applying order', () => {
    const slashParent: Bookmark = {
      children: [
        { id: 'slash-a', title: 'A' },
        { id: 'slash-b', title: 'B' },
      ],
      id: 'slash-parent',
      route: ['Root/Archive'],
      title: 'Root/Archive',
    };
    const nestedParent: Bookmark = {
      children: [
        { id: 'nested-a', title: 'A' },
        { id: 'nested-b', title: 'B' },
      ],
      id: 'nested-parent',
      route: ['Root', 'Archive'],
      title: 'Archive',
    };
    const ordered = applySiblingOrder([slashParent, nestedParent], {
      [getBookmarkRouteKey(slashParent.route ?? [])]: ['B', 'A'],
      [getBookmarkRouteKey(nestedParent.route ?? [])]: ['A', 'B'],
    });

    expect(ordered[0]?.children?.map((item) => item.id)).toEqual([
      'slash-b',
      'slash-a',
    ]);
    expect(ordered[1]?.children?.map((item) => item.id)).toEqual([
      'nested-a',
      'nested-b',
    ]);
  });

  it('does not treat a normal parent key as a slash-route legacy key', () => {
    const slashParent: Bookmark = {
      children: [
        { id: 'slash-a', title: 'A' },
        { id: 'slash-b', title: 'B' },
      ],
      route: ['Root/Archive'],
      title: 'Root/Archive',
    };
    const nestedParent: Bookmark = {
      children: [
        { id: 'nested-a', title: 'A' },
        { id: 'nested-b', title: 'B' },
      ],
      route: ['Root', 'Archive'],
      title: 'Archive',
    };
    const ordered = applySiblingOrder([slashParent, nestedParent], {
      'Root/Archive': ['B', 'A'],
    });

    expect(ordered[0]?.children?.map((item) => item.id)).toEqual([
      'slash-a',
      'slash-b',
    ]);
    expect(ordered[1]?.children?.map((item) => item.id)).toEqual([
      'nested-b',
      'nested-a',
    ]);
  });

  it('reads an unambiguous legacy key for a slash-bearing parent route', () => {
    const slashParent: Bookmark = {
      children: [
        { id: 'slash-a', title: 'A' },
        { id: 'slash-b', title: 'B' },
      ],
      route: ['Root/Archive'],
      title: 'Root/Archive',
    };
    const ordered = applySiblingOrder([slashParent], {
      'Root/Archive': ['B', 'A'],
    });

    expect(ordered[0]?.children?.map((item) => item.id)).toEqual([
      'slash-b',
      'slash-a',
    ]);
  });

  it('falls back to the original tree for an unknown root', () => {
    expect(getBookmarksAtRoot(TREE, ['Missing'])).toBe(TREE);
  });
});
