import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BookmarkItem } from '../../bookmarks/types';
import { openBookmarkTabGroup } from './openBookmarkTabGroup';

const BOOKMARKS: BookmarkItem[] = [
  { id: 'one', title: 'One', url: 'https://one.example.com' },
  { id: 'invalid', title: 'Invalid', url: '/relative' },
  { id: 'two', title: 'Two', url: 'https://two.example.com/path' },
];

const permissionsRequest =
  vi.fn<(permissions: chrome.permissions.Permissions) => Promise<boolean>>();
const tabsCreate =
  vi.fn<
    (createProperties: chrome.tabs.CreateProperties) => Promise<chrome.tabs.Tab>
  >();
const tabsGetCurrent = vi.fn<() => Promise<chrome.tabs.Tab | undefined>>();
const tabsGroup =
  vi.fn<(options: chrome.tabs.GroupOptions) => Promise<number>>();
const tabsRemove = vi.fn<(tabIds: number[]) => Promise<void>>();
const tabsUpdate =
  vi.fn<
    (
      tabId: number,
      updateProperties: chrome.tabs.UpdateProperties,
    ) => Promise<chrome.tabs.Tab>
  >();
const tabGroupsUpdate =
  vi.fn<
    (
      groupId: number,
      updateProperties: chrome.tabGroups.UpdateProperties,
    ) => Promise<chrome.tabGroups.TabGroup>
  >();

beforeEach((): void => {
  Object.assign(chrome, {
    permissions: { request: permissionsRequest },
    tabGroups: { update: tabGroupsUpdate },
    tabs: {
      create: tabsCreate,
      getCurrent: tabsGetCurrent,
      group: tabsGroup,
      remove: tabsRemove,
      update: tabsUpdate,
    },
  });

  permissionsRequest.mockResolvedValue(true);
  tabsGetCurrent.mockResolvedValue({
    index: 4,
    windowId: 8,
  } as chrome.tabs.Tab);
  tabsCreate
    .mockResolvedValueOnce({ id: 21 } as chrome.tabs.Tab)
    .mockResolvedValueOnce({ id: 22 } as chrome.tabs.Tab);
  tabsGroup.mockResolvedValue(31);
  tabGroupsUpdate.mockResolvedValue({ id: 31 } as chrome.tabGroups.TabGroup);
  tabsUpdate.mockResolvedValue({ id: 21 } as chrome.tabs.Tab);
  tabsRemove.mockResolvedValue();
});

describe('openBookmarkTabGroup', () => {
  it('opens valid direct bookmarks beside the current tab and names the group', async () => {
    const result = await openBookmarkTabGroup('Research', BOOKMARKS);

    expect(permissionsRequest).toHaveBeenCalledBefore(tabsGetCurrent);
    expect(tabsCreate).toHaveBeenNthCalledWith(1, {
      active: false,
      index: 5,
      url: 'https://one.example.com/',
      windowId: 8,
    });
    expect(tabsCreate).toHaveBeenNthCalledWith(2, {
      active: false,
      index: 6,
      url: 'https://two.example.com/path',
      windowId: 8,
    });
    expect(tabsGroup).toHaveBeenCalledWith({
      createProperties: { windowId: 8 },
      tabIds: [21, 22],
    });
    expect(tabGroupsUpdate).toHaveBeenCalledWith(31, {
      collapsed: false,
      title: 'Research',
    });
    expect(tabsUpdate).toHaveBeenCalledWith(21, { active: true });
    expect(result).toEqual({
      activationFailed: false,
      openedCount: 2,
      skippedCount: 1,
      status: 'opened',
    });
  });

  it('does not create tabs when permission is denied', async () => {
    Object.assign(chrome, { tabGroups: undefined });
    permissionsRequest.mockResolvedValue(false);

    await expect(openBookmarkTabGroup('Research', BOOKMARKS)).resolves.toEqual({
      status: 'permission-denied',
    });
    expect(tabsGetCurrent).not.toHaveBeenCalled();
    expect(tabsCreate).not.toHaveBeenCalled();
  });

  it('checks the permission-gated API after access is granted', async () => {
    Object.assign(chrome, { tabGroups: undefined });
    permissionsRequest.mockImplementation(async () => {
      Object.assign(chrome, {
        tabGroups: { update: tabGroupsUpdate },
      });
      return true;
    });

    await expect(
      openBookmarkTabGroup('Research', BOOKMARKS),
    ).resolves.toMatchObject({ status: 'opened' });

    expect(permissionsRequest).toHaveBeenCalledOnce();
    expect(tabGroupsUpdate).toHaveBeenCalledOnce();
  });

  it('does not create tabs when the granted API remains unavailable', async () => {
    Object.assign(chrome, { tabGroups: undefined });
    permissionsRequest.mockResolvedValue(true);

    await expect(openBookmarkTabGroup('Research', BOOKMARKS)).resolves.toEqual({
      reason: 'api-unavailable',
      remainingTabCount: 0,
      skippedCount: 1,
      status: 'failed',
    });

    expect(permissionsRequest).toHaveBeenCalledOnce();
    expect(tabsCreate).not.toHaveBeenCalled();
  });

  it('rejects relative and javascript URLs before requesting permission', async () => {
    const result = await openBookmarkTabGroup('Unsafe', [
      { id: 'relative', title: 'Relative', url: '/relative' },
      { id: 'script', title: 'Script', url: 'javascript:alert(1)' },
    ]);

    expect(result).toEqual({
      skippedCount: 2,
      status: 'no-valid-bookmarks',
    });
    expect(permissionsRequest).not.toHaveBeenCalled();
  });

  it('skips individual creation failures and keeps the remaining order', async () => {
    tabsCreate
      .mockReset()
      .mockRejectedValueOnce(new Error('blocked'))
      .mockResolvedValueOnce({ id: 22 } as chrome.tabs.Tab);

    const result = await openBookmarkTabGroup('Research', BOOKMARKS);

    expect(tabsCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ index: 5 }),
    );
    expect(tabsGroup).toHaveBeenCalledWith(
      expect.objectContaining({ tabIds: [22] }),
    );
    expect(result).toEqual(
      expect.objectContaining({ openedCount: 1, skippedCount: 2 }),
    );
  });

  it('rolls back created tabs when naming fails', async () => {
    tabGroupsUpdate.mockRejectedValue(new Error('group disappeared'));

    const result = await openBookmarkTabGroup('Research', BOOKMARKS);

    expect(tabsRemove).toHaveBeenCalledWith([21, 22]);
    expect(result).toEqual({
      reason: 'naming-failed',
      remainingTabCount: 0,
      skippedCount: 1,
      status: 'failed',
    });
  });

  it('reports possible remaining tabs when grouping rollback fails', async () => {
    tabsGroup.mockRejectedValue(new Error('grouping failed'));
    tabsRemove.mockRejectedValue(new Error('remove failed'));

    const result = await openBookmarkTabGroup('Research', BOOKMARKS);

    expect(tabsRemove).toHaveBeenCalledWith([21, 22]);
    expect(result).toEqual({
      reason: 'grouping-failed',
      remainingTabCount: 2,
      skippedCount: 1,
      status: 'failed',
    });
  });

  it('keeps a completed group when only activation fails', async () => {
    tabsUpdate.mockRejectedValue(new Error('activation failed'));

    const result = await openBookmarkTabGroup('Research', BOOKMARKS);

    expect(tabsRemove).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ activationFailed: true, status: 'opened' }),
    );
  });
});
