import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../i18n';
import { TabGroupImportSection } from './TabGroupImportSection';

const permissionLeaseMocks = vi.hoisted(() => ({
  create: vi.fn(),
  dispose: vi.fn<() => void>(),
  release: vi.fn<() => Promise<boolean>>(),
}));

vi.mock('../../platform/tabGroups/tabGroupImportPermissionLease', () => ({
  createTabGroupImportPermissionLease: permissionLeaseMocks.create,
}));

const permissionsRequest =
  vi.fn<(permissions: chrome.permissions.Permissions) => Promise<boolean>>();
const permissionsContains =
  vi.fn<(permissions: chrome.permissions.Permissions) => Promise<boolean>>();
const permissionsRemove =
  vi.fn<(permissions: chrome.permissions.Permissions) => Promise<boolean>>();
const tabGroupsQuery = vi.fn<() => Promise<chrome.tabGroups.TabGroup[]>>();
const tabGroupsGet =
  vi.fn<(groupId: number) => Promise<chrome.tabGroups.TabGroup>>();
const tabsQuery =
  vi.fn<(queryInfo: chrome.tabs.QueryInfo) => Promise<chrome.tabs.Tab[]>>();
const bookmarksGetTree =
  vi.fn<() => Promise<chrome.bookmarks.BookmarkTreeNode[]>>();
const bookmarksGetSubTree =
  vi.fn<() => Promise<chrome.bookmarks.BookmarkTreeNode[]>>();
const bookmarksGetChildren =
  vi.fn<() => Promise<chrome.bookmarks.BookmarkTreeNode[]>>();
const bookmarksCreate =
  vi.fn<
    (
      bookmark: chrome.bookmarks.BookmarkCreateArg,
    ) => Promise<chrome.bookmarks.BookmarkTreeNode>
  >();
const bookmarksRemoveTree = vi.fn<() => Promise<void>>();
type PermissionListener = (permissions: chrome.permissions.Permissions) => void;

let hasTabsAccess = false;
let hasTabGroupsPermission = false;
const permissionAddedListeners = new Set<PermissionListener>();
const permissionRemovedListeners = new Set<PermissionListener>();

beforeEach((): void => {
  vi.clearAllMocks();
  permissionLeaseMocks.release.mockResolvedValue(true);
  permissionLeaseMocks.create.mockReturnValue({
    dispose: permissionLeaseMocks.dispose,
    release: permissionLeaseMocks.release,
  });
  hasTabsAccess = false;
  hasTabGroupsPermission = false;
  permissionAddedListeners.clear();
  permissionRemovedListeners.clear();
  permissionsRequest.mockImplementation(async () => {
    hasTabsAccess = true;
    hasTabGroupsPermission = true;
    return true;
  });
  permissionsContains.mockImplementation(async ({ permissions }) => {
    if (permissions?.includes('tabs')) {
      return hasTabsAccess;
    }
    return hasTabGroupsPermission;
  });
  permissionsRemove.mockImplementation(async ({ permissions }) => {
    if (permissions?.includes('tabs')) {
      hasTabsAccess = false;
    }
    if (permissions?.includes('tabGroups')) {
      hasTabGroupsPermission = false;
    }
    return true;
  });
  tabGroupsQuery.mockResolvedValue([
    {
      collapsed: false,
      color: 'blue',
      id: 7,
      title: 'Work',
      windowId: 1,
    },
  ]);
  tabGroupsGet.mockResolvedValue({
    collapsed: false,
    color: 'blue',
    id: 7,
    title: 'Work',
    windowId: 1,
  });
  tabsQuery.mockResolvedValue([
    {
      active: false,
      audible: false,
      autoDiscardable: true,
      discarded: false,
      groupId: 7,
      height: 800,
      highlighted: false,
      incognito: false,
      index: 0,
      mutedInfo: { muted: false },
      pinned: false,
      selected: false,
      status: 'complete',
      title: 'Example',
      url: 'https://example.com',
      width: 1200,
      windowId: 1,
    },
  ]);
  bookmarksGetTree.mockResolvedValue([
    {
      children: [
        {
          children: [],
          id: 'target',
          parentId: '0',
          title: 'Bookmarks Bar',
        },
      ],
      id: '0',
      title: '',
    },
  ]);
  bookmarksGetSubTree.mockResolvedValue([
    {
      children: [],
      id: 'target',
      parentId: '0',
      title: 'Bookmarks Bar',
    },
  ]);
  bookmarksGetChildren.mockResolvedValue([]);
  bookmarksCreate.mockImplementation(async (bookmark) => ({
    ...(bookmark.url ? { url: bookmark.url } : { children: [] }),
    id: bookmark.url ? 'bookmark' : 'folder',
    parentId: bookmark.parentId,
    title: bookmark.title ?? '',
  }));
  bookmarksRemoveTree.mockResolvedValue(undefined);

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
        onAdded: {
          addListener: (listener: PermissionListener) =>
            permissionAddedListeners.add(listener),
          removeListener: (listener: PermissionListener) =>
            permissionAddedListeners.delete(listener),
        },
        onRemoved: {
          addListener: (listener: PermissionListener) =>
            permissionRemovedListeners.add(listener),
          removeListener: (listener: PermissionListener) =>
            permissionRemovedListeners.delete(listener),
        },
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
});

describe('TabGroupImportSection', () => {
  it('imports explicitly selected groups and releases only temporary tab access', async () => {
    const onBookmarksImported = vi.fn<() => Promise<void>>();
    onBookmarksImported.mockResolvedValue(undefined);

    render(
      <I18nProvider locale="en">
        <TabGroupImportSection
          defaultDestinationId="target"
          guideHref="guide.html?locale=en#tab-groups"
          onBookmarksImported={onBookmarksImported}
        />
      </I18nProvider>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Import Chrome tab groups' }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Import Chrome tab groups',
    });
    expect(
      permissionLeaseMocks.create.mock.invocationCallOrder[0],
    ).toBeLessThan(permissionsRequest.mock.invocationCallOrder[0] ?? 0);
    const checkbox = screen.getByRole<HTMLInputElement>('checkbox', {
      name: 'Work',
    });
    const importButton = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Import selected groups',
    });

    expect(checkbox.checked).toBe(false);
    expect(importButton.disabled).toBe(true);
    expect(
      screen.getByRole<HTMLOptionElement>('option', {
        name: 'Bookmarks Bar',
      }).selected,
    ).toBe(true);
    expect(dialog).toBeDefined();

    fireEvent.click(checkbox);
    fireEvent.click(importButton);

    await screen.findByText(/Import result: 1 imported/);
    await waitFor(() => expect(onBookmarksImported).toHaveBeenCalledTimes(1));

    expect(bookmarksCreate).toHaveBeenNthCalledWith(1, {
      parentId: 'target',
      title: 'Work',
    });
    expect(bookmarksCreate).toHaveBeenNthCalledWith(2, {
      parentId: 'folder',
      title: 'Example',
      url: 'https://example.com',
    });
    expect(permissionLeaseMocks.release).toHaveBeenCalledOnce();
    expect(permissionsRemove).not.toHaveBeenCalledWith({
      permissions: ['tabGroups'],
    });
  });

  it('disposes its lease after the section unmounts', async () => {
    let resolvePermission: ((wasGranted: boolean) => void) | undefined;
    permissionsRequest.mockImplementation(
      () =>
        new Promise<boolean>((resolveRequest) => {
          resolvePermission = (wasGranted) => {
            hasTabsAccess = wasGranted;
            hasTabGroupsPermission = wasGranted;
            resolveRequest(wasGranted);
          };
        }),
    );

    const { unmount } = render(
      <I18nProvider locale="en">
        <TabGroupImportSection />
      </I18nProvider>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Import Chrome tab groups' }),
    );
    await waitFor(() => expect(permissionsRequest).toHaveBeenCalledTimes(1));
    unmount();
    resolvePermission?.(true);

    expect(permissionLeaseMocks.dispose).toHaveBeenCalledOnce();
    expect(permissionLeaseMocks.release).not.toHaveBeenCalled();
  });

  it('creates a fresh lease when temporary access release is retried', async () => {
    permissionsRequest.mockResolvedValue(false);
    permissionLeaseMocks.release
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    render(
      <I18nProvider locale="en">
        <TabGroupImportSection />
      </I18nProvider>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Import Chrome tab groups' }),
    );
    const releaseButton = await screen.findByRole('button', {
      name: 'Release tab access',
    });

    expect(permissionLeaseMocks.create).toHaveBeenCalledOnce();
    expect(permissionLeaseMocks.dispose).toHaveBeenCalledOnce();

    fireEvent.click(releaseButton);
    await waitFor(() =>
      expect(permissionLeaseMocks.release).toHaveBeenCalledTimes(2),
    );
    expect(permissionLeaseMocks.create).toHaveBeenCalledTimes(2);
  });

  it('keeps the importer open while a selected group is being imported', async () => {
    let resolveFolder: (
      folder: chrome.bookmarks.BookmarkTreeNode,
    ) => void = () => undefined;
    bookmarksCreate.mockImplementationOnce(
      () =>
        new Promise<chrome.bookmarks.BookmarkTreeNode>((resolveCreate) => {
          resolveFolder = resolveCreate;
        }),
    );

    render(
      <I18nProvider locale="en">
        <TabGroupImportSection defaultDestinationId="target" />
      </I18nProvider>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Import Chrome tab groups' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Import Chrome tab groups',
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Work' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Import selected groups' }),
    );
    await waitFor(() => expect(bookmarksCreate).toHaveBeenCalledTimes(1));

    const enabledCancel = screen
      .getAllByRole<HTMLButtonElement>('button', { name: 'Cancel' })
      .find((button) => !button.disabled);
    expect(enabledCancel).toBeDefined();
    fireEvent.click(enabledCancel as HTMLButtonElement);
    expect(dialog).toBeDefined();
    expect(
      screen.getByRole('dialog', { name: 'Import Chrome tab groups' }),
    ).toBeDefined();

    resolveFolder({
      children: [],
      id: 'folder',
      parentId: 'target',
      title: 'Work',
    });
    await screen.findByText(/Import result: 1 imported/);
  });

  it('tracks external tab group permission changes', async () => {
    render(
      <I18nProvider locale="en">
        <TabGroupImportSection />
      </I18nProvider>,
    );

    await screen.findByText('Tab group access is not connected.');
    hasTabGroupsPermission = true;
    permissionAddedListeners.forEach((listener) =>
      listener({ permissions: ['tabGroups'] }),
    );
    await screen.findByText('Tab group access is connected.');

    hasTabGroupsPermission = false;
    permissionRemovedListeners.forEach((listener) =>
      listener({ permissions: ['tabGroups'] }),
    );
    await screen.findByText('Tab group access is not connected.');
  });

  it('shows managed destinations as disabled and disambiguates duplicate paths', async () => {
    bookmarksGetTree.mockResolvedValue([
      {
        children: [
          {
            children: [
              { children: [], id: 'work-1', parentId: 'target', title: 'Work' },
              { children: [], id: 'work-2', parentId: 'target', title: 'Work' },
              {
                children: [],
                id: 'managed',
                parentId: 'target',
                title: 'Managed',
                unmodifiable: 'managed',
              },
            ],
            id: 'target',
            parentId: '0',
            title: 'Bookmarks Bar',
          },
        ],
        id: '0',
        title: '',
      },
    ]);

    render(
      <I18nProvider locale="en">
        <TabGroupImportSection defaultDestinationId="target" />
      </I18nProvider>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Import Chrome tab groups' }),
    );
    await screen.findByRole('dialog', { name: 'Import Chrome tab groups' });

    expect(
      screen.getByRole<HTMLOptionElement>('option', {
        name: 'Bookmarks Bar / Work [work-1]',
      }).disabled,
    ).toBe(false);
    expect(
      screen.getByRole<HTMLOptionElement>('option', {
        name: 'Bookmarks Bar / Work [work-2]',
      }).disabled,
    ).toBe(false);
    expect(
      screen.getByRole<HTMLOptionElement>('option', {
        name: 'Bookmarks Bar / Managed',
      }).disabled,
    ).toBe(true);
  });
});
