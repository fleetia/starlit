import { describe, expect, it } from 'vitest';

import { collectWritableBookmarkFolders } from './chromeBookmarks';

describe('collectWritableBookmarkFolders', () => {
  it('keeps real empty writable folders and excludes the root and managed trees', () => {
    const folders = collectWritableBookmarkFolders([
      {
        children: [
          {
            children: [
              {
                children: [],
                id: 'empty-work',
                title: 'Empty work',
              },
            ],
            id: 'toolbar-real',
            title: 'Bookmarks bar',
          },
          {
            children: [],
            id: 'other-real',
            title: 'Other bookmarks',
          },
          {
            children: [
              {
                children: [],
                id: 'managed-child',
                title: 'Managed child',
              },
            ],
            id: 'managed',
            title: 'Managed bookmarks',
            unmodifiable: 'managed',
          },
        ],
        id: 'root-real',
        title: '',
      },
    ]);

    expect(folders).toEqual([
      {
        id: 'toolbar-real',
        label: 'Bookmarks bar',
        path: ['Bookmarks bar'],
      },
      {
        id: 'empty-work',
        label: 'Bookmarks bar / Empty work',
        path: ['Bookmarks bar', 'Empty work'],
      },
      {
        id: 'other-real',
        label: 'Other bookmarks',
        path: ['Other bookmarks'],
      },
    ]);
  });
});
