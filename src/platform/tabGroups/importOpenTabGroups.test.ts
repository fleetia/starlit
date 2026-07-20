import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getBookmarkDestinations,
  getOpenTabGroups,
  importOpenTabGroups,
  requestTabGroupImportAccess,
} from './importOpenTabGroups';

const permissionsRequest =
  vi.fn<(permissions: chrome.permissions.Permissions) => Promise<boolean>>();
const permissionsContains =
  vi.fn<(permissions: chrome.permissions.Permissions) => Promise<boolean>>();
const permissionsRemove =
  vi.fn<(permissions: chrome.permissions.Permissions) => Promise<boolean>>();
const tabGroupsQuery =
  vi.fn<
    (
      queryInfo: chrome.tabGroups.QueryInfo,
    ) => Promise<chrome.tabGroups.TabGroup[]>
  >();
const tabGroupsGet =
  vi.fn<(groupId: number) => Promise<chrome.tabGroups.TabGroup>>();
const tabsQuery =
  vi.fn<(queryInfo: chrome.tabs.QueryInfo) => Promise<chrome.tabs.Tab[]>>();
const bookmarksGetTree =
  vi.fn<() => Promise<chrome.bookmarks.BookmarkTreeNode[]>>();
const bookmarksGetSubTree =
  vi.fn<(id: string) => Promise<chrome.bookmarks.BookmarkTreeNode[]>>();
const bookmarksGetChildren =
  vi.fn<(id: string) => Promise<chrome.bookmarks.BookmarkTreeNode[]>>();
const bookmarksCreate =
  vi.fn<
    (
      bookmark: chrome.bookmarks.BookmarkCreateArg,
    ) => Promise<chrome.bookmarks.BookmarkTreeNode>
  >();
const bookmarksRemoveTree = vi.fn<(id: string) => Promise<void>>();

function createGroup(id: number, title?: string): chrome.tabGroups.TabGroup {
  return {
    collapsed: false,
    color: 'blue',
    id,
    title,
    windowId: 1,
  };
}

function createTab(
  groupId: number,
  index: number,
  title: string,
  url?: string,
): chrome.tabs.Tab {
  return {
    active: false,
    audible: false,
    autoDiscardable: true,
    discarded: false,
    groupId,
    height: 800,
    highlighted: false,
    incognito: false,
    index,
    mutedInfo: { muted: false },
    pinned: false,
    selected: false,
    status: 'complete',
    title,
    url,
    width: 1200,
    windowId: 1,
  };
}

beforeEach((): void => {
  Object.defineProperty(globalThis, 'chrome', {
    configurable: true,
    value: {
      bookmarks: {
        create: bookmarksCreate,
        getChildren: bookmarksGetChildren,
        getSubTree: bookmarksGetSubTree,
        getTree: bookmarksGetTree,
        removeTree: bookmarksRemoveTree,
      },
      permissions: {
        contains: permissionsContains,
        remove: permissionsRemove,
        request: permissionsRequest,
      },
      tabGroups: {
        get: tabGroupsGet,
        query: tabGroupsQuery,
      },
      tabs: {
        query: tabsQuery,
      },
    },
    writable: true,
  });

  vi.clearAllMocks();
});

describe('tab group import access', () => {
  it('requests both optional permissions', async () => {
    permissionsRequest.mockResolvedValue(true);

    await expect(requestTabGroupImportAccess()).resolves.toBe(true);

    expect(permissionsRequest).toHaveBeenCalledWith({
      permissions: ['tabs', 'tabGroups'],
    });
  });

  it('checks the permission-gated APIs after access is granted', async () => {
    Object.assign(chrome, { tabGroups: undefined });
    permissionsRequest.mockImplementation(async () => {
      Object.assign(chrome, {
        tabGroups: {
          get: tabGroupsGet,
          query: tabGroupsQuery,
        },
      });
      return true;
    });

    await expect(requestTabGroupImportAccess()).resolves.toBe(true);

    expect(permissionsRequest).toHaveBeenCalledOnce();
  });

  it('returns a denial before permission-gated APIs are exposed', async () => {
    Object.assign(chrome, { tabGroups: undefined });
    permissionsRequest.mockResolvedValue(false);

    await expect(requestTabGroupImportAccess()).resolves.toBe(false);

    expect(permissionsRequest).toHaveBeenCalledOnce();
  });

  it('rejects access when granted APIs remain unavailable', async () => {
    Object.assign(chrome, { tabGroups: undefined });
    permissionsRequest.mockResolvedValue(true);

    await expect(requestTabGroupImportAccess()).rejects.toThrow(
      'Chrome tab group APIs are unavailable',
    );

    expect(permissionsRequest).toHaveBeenCalledOnce();
  });
});

describe('getOpenTabGroups', () => {
  it('keeps group order and supplies localized untitled names', async () => {
    tabGroupsQuery.mockResolvedValue([
      createGroup(1, ' Work '),
      createGroup(2),
    ]);
    tabsQuery.mockImplementation(async ({ groupId }) =>
      groupId === 1
        ? [createTab(1, 0, 'One', 'https://one.test')]
        : [
            createTab(2, 0, 'Two', 'https://two.test'),
            createTab(2, 1, 'Three', 'https://three.test'),
          ],
    );

    await expect(getOpenTabGroups('Untitled')).resolves.toEqual([
      { id: 1, tabCount: 1, title: 'Work', windowId: 1 },
      { id: 2, tabCount: 2, title: 'Untitled', windowId: 1 },
    ]);
  });
});

describe('getBookmarkDestinations', () => {
  it('includes empty raw folders, disables managed subtrees, and prefers a writable current root', async () => {
    bookmarksGetTree.mockResolvedValue([
      {
        children: [
          {
            children: [
              { children: [], id: 'empty', parentId: 'bar', title: 'Empty' },
            ],
            id: 'bar',
            parentId: '0',
            title: 'Bookmarks Bar',
          },
          {
            children: [
              {
                children: [],
                id: 'managed-child',
                parentId: 'managed',
                title: 'Managed child',
              },
            ],
            id: 'managed',
            parentId: '0',
            title: 'Managed',
            unmodifiable: 'managed',
          },
        ],
        id: '0',
        title: '',
      },
    ]);

    await expect(getBookmarkDestinations('empty')).resolves.toEqual({
      defaultDestinationId: 'empty',
      destinations: [
        {
          id: 'bar',
          isWritable: true,
          path: ['Bookmarks Bar'],
          title: 'Bookmarks Bar',
        },
        {
          id: 'empty',
          isWritable: true,
          path: ['Bookmarks Bar', 'Empty'],
          title: 'Empty',
        },
        {
          id: 'managed',
          isWritable: false,
          path: ['Managed'],
          title: 'Managed',
        },
        {
          id: 'managed-child',
          isWritable: false,
          path: ['Managed', 'Managed child'],
          title: 'Managed child',
        },
      ],
    });
  });
});

describe('importOpenTabGroups', () => {
  it('skips a group without bookmarkable URLs without creating an empty folder', async () => {
    bookmarksGetSubTree.mockResolvedValue([
      { children: [], id: 'destination', parentId: '0', title: 'Destination' },
    ]);
    bookmarksGetChildren.mockResolvedValue([]);
    tabGroupsGet.mockResolvedValue(createGroup(1, 'Unavailable'));
    tabsQuery.mockResolvedValue([
      createTab(1, 0, 'Chrome internal page'),
      createTab(1, 1, 'Another unavailable page'),
    ]);

    await expect(
      importOpenTabGroups({
        destinationId: 'destination',
        groupIds: [1],
        untitledTitle: 'Untitled',
      }),
    ).resolves.toEqual({
      failedCount: 0,
      groups: [
        {
          groupId: 1,
          importedTabCount: 0,
          omittedTabCount: 2,
          status: 'skipped',
          title: 'Unavailable',
        },
      ],
      importedCount: 0,
      omittedTabCount: 2,
      skippedCount: 1,
    });
    expect(bookmarksCreate).not.toHaveBeenCalled();
  });

  it('revalidates groups, suffixes collisions, rolls back one failure, and keeps other results', async () => {
    bookmarksGetSubTree.mockResolvedValue([
      { children: [], id: 'destination', parentId: '0', title: 'Destination' },
    ]);
    bookmarksGetChildren.mockResolvedValue([
      { children: [], id: 'existing-1', title: 'Work' },
      { children: [], id: 'existing-2', title: 'Work (2)' },
    ]);
    tabGroupsGet.mockImplementation(async (groupId) => {
      if (groupId === 3) {
        throw new Error('Group closed');
      }
      return createGroup(groupId, groupId === 1 ? 'Work' : 'Research');
    });
    tabsQuery.mockImplementation(async ({ groupId }) => {
      if (groupId === 1) {
        return [
          createTab(1, 1, 'Missing URL'),
          createTab(1, 0, '', 'https://one.test'),
        ];
      }
      return [createTab(2, 0, 'Research', 'https://research.test')];
    });
    bookmarksCreate.mockImplementation(async (bookmark) => {
      if (bookmark.parentId === 'destination') {
        return {
          children: [],
          id: bookmark.title === 'Work (3)' ? 'work-folder' : 'research-folder',
          parentId: 'destination',
          title: bookmark.title ?? '',
        };
      }
      if (bookmark.parentId === 'research-folder') {
        throw new Error('Bookmark creation failed');
      }
      return {
        id: 'bookmark',
        parentId: bookmark.parentId,
        title: bookmark.title ?? '',
        url: bookmark.url,
      };
    });
    bookmarksRemoveTree.mockRejectedValue(new Error('Cleanup failed'));

    const result = await importOpenTabGroups({
      destinationId: 'destination',
      groupIds: [1, 2, 3],
      untitledTitle: 'Untitled',
    });

    expect(result).toMatchObject({
      failedCount: 1,
      importedCount: 1,
      omittedTabCount: 1,
      skippedCount: 1,
    });
    expect(result.groups).toEqual([
      {
        folderTitle: 'Work (3)',
        groupId: 1,
        importedTabCount: 1,
        omittedTabCount: 1,
        status: 'imported',
        title: 'Work',
      },
      {
        folderTitle: 'Research',
        groupId: 2,
        importedTabCount: 0,
        omittedTabCount: 0,
        rollbackFailed: true,
        status: 'failed',
        title: 'Research',
      },
      {
        groupId: 3,
        importedTabCount: 0,
        omittedTabCount: 0,
        status: 'skipped',
        title: 'Untitled',
      },
    ]);
    expect(bookmarksRemoveTree).toHaveBeenCalledWith('research-folder');
    expect(bookmarksCreate).toHaveBeenCalledWith({
      parentId: 'work-folder',
      title: 'https://one.test',
      url: 'https://one.test',
    });
  });
});
