import { describe, expect, it } from 'vitest';

import {
  getBookmarkEntries,
  getCurrentFolder,
  paginateBookmarkEntries,
} from './presentation';
import type { Bookmark } from './types';

const ROOT: Bookmark = {
  id: 'root',
  title: 'Root',
  children: [
    {
      id: 'level-1',
      title: 'Level 1',
      children: [
        {
          id: 'level-2',
          title: 'Level 2',
          list: [{ id: 'deep', title: 'Deep', url: 'https://example.com' }],
        },
      ],
    },
  ],
  list: [
    { id: 'one', title: 'One', url: 'https://one.example' },
    { id: 'two', title: 'Two', url: 'https://two.example' },
  ],
};

describe('bookmark presentation', () => {
  it('keeps folders before bookmarks', () => {
    expect(getBookmarkEntries(ROOT).map((entry) => entry.type)).toEqual([
      'folder',
      'bookmark',
      'bookmark',
    ]);
  });

  it('clamps pagination without dropping the last entry', () => {
    const page = paginateBookmarkEntries(getBookmarkEntries(ROOT), 8, 2);

    expect(page.page).toBe(1);
    expect(page.totalPages).toBe(2);
    expect(page.entries.map((entry) => entry.data.title)).toEqual(['Two']);
  });

  it('resolves a deep folder path by stable id', () => {
    const levelOne = ROOT.children?.[0];
    const levelTwo = levelOne?.children?.[0];

    expect(levelOne).toBeDefined();
    expect(levelTwo).toBeDefined();
    expect(
      getCurrentFolder(ROOT, [levelOne as Bookmark, levelTwo as Bookmark]).id,
    ).toBe('level-2');
  });
});
