import type { BookmarkItem } from '../../bookmarks/types';

export type OpenBookmarkTabGroupResult =
  | {
      activationFailed: boolean;
      openedCount: number;
      skippedCount: number;
      status: 'opened';
    }
  | {
      status: 'permission-denied';
    }
  | {
      skippedCount: number;
      status: 'no-valid-bookmarks';
    }
  | {
      reason:
        | 'api-unavailable'
        | 'current-tab-unavailable'
        | 'grouping-failed'
        | 'naming-failed'
        | 'permission-request-failed'
        | 'tab-creation-failed';
      remainingTabCount: number;
      skippedCount: number;
      status: 'failed';
    };

type ValidBookmark = {
  url: string;
};

function getValidBookmarks(bookmarks: BookmarkItem[]): ValidBookmark[] {
  return bookmarks.flatMap((bookmark) => {
    try {
      const url = new URL(bookmark.url);

      if (url.protocol.toLowerCase() === 'javascript:') {
        return [];
      }

      return [{ url: url.href }];
    } catch {
      return [];
    }
  });
}

async function rollbackTabs(tabIds: number[]): Promise<number> {
  if (tabIds.length === 0) {
    return 0;
  }

  try {
    await chrome.tabs.remove(tabIds);
    return 0;
  } catch {
    return tabIds.length;
  }
}

export async function openBookmarkTabGroup(
  title: string,
  bookmarks: BookmarkItem[],
): Promise<OpenBookmarkTabGroupResult> {
  const validBookmarks = getValidBookmarks(bookmarks);
  const invalidBookmarkCount = bookmarks.length - validBookmarks.length;

  if (validBookmarks.length === 0) {
    return {
      skippedCount: invalidBookmarkCount,
      status: 'no-valid-bookmarks',
    };
  }

  if (
    typeof chrome === 'undefined' ||
    !chrome.permissions?.request ||
    !chrome.tabs?.create ||
    !chrome.tabs.getCurrent ||
    !chrome.tabs.group ||
    !chrome.tabs.remove ||
    !chrome.tabs.update
  ) {
    return {
      reason: 'api-unavailable',
      remainingTabCount: 0,
      skippedCount: invalidBookmarkCount,
      status: 'failed',
    };
  }

  let hasPermission: boolean;

  try {
    hasPermission = await chrome.permissions.request({
      permissions: ['tabGroups'],
    });
  } catch {
    return {
      reason: 'permission-request-failed',
      remainingTabCount: 0,
      skippedCount: invalidBookmarkCount,
      status: 'failed',
    };
  }

  if (!hasPermission) {
    return { status: 'permission-denied' };
  }

  if (!chrome.tabGroups?.update) {
    return {
      reason: 'api-unavailable',
      remainingTabCount: 0,
      skippedCount: invalidBookmarkCount,
      status: 'failed',
    };
  }

  let currentTab: chrome.tabs.Tab | undefined;

  try {
    currentTab = await chrome.tabs.getCurrent();
  } catch {
    currentTab = undefined;
  }

  if (currentTab?.windowId === undefined || currentTab.index === undefined) {
    return {
      reason: 'current-tab-unavailable',
      remainingTabCount: 0,
      skippedCount: invalidBookmarkCount,
      status: 'failed',
    };
  }

  const createdTabIds: number[] = [];
  let skippedCount = invalidBookmarkCount;

  for (const bookmark of validBookmarks) {
    try {
      const tab = await chrome.tabs.create({
        active: false,
        index: currentTab.index + createdTabIds.length + 1,
        url: bookmark.url,
        windowId: currentTab.windowId,
      });

      if (tab.id === undefined) {
        skippedCount += 1;
        continue;
      }

      createdTabIds.push(tab.id);
    } catch {
      skippedCount += 1;
    }
  }

  if (createdTabIds.length === 0) {
    return {
      reason: 'tab-creation-failed',
      remainingTabCount: 0,
      skippedCount,
      status: 'failed',
    };
  }

  const firstTabId = createdTabIds[0];

  if (firstTabId === undefined) {
    return {
      reason: 'tab-creation-failed',
      remainingTabCount: 0,
      skippedCount,
      status: 'failed',
    };
  }

  let groupId: number;

  try {
    groupId = await chrome.tabs.group({
      createProperties: { windowId: currentTab.windowId },
      tabIds: createdTabIds,
    });
  } catch {
    return {
      reason: 'grouping-failed',
      remainingTabCount: await rollbackTabs(createdTabIds),
      skippedCount,
      status: 'failed',
    };
  }

  try {
    await chrome.tabGroups.update(groupId, {
      collapsed: false,
      title,
    });
  } catch {
    return {
      reason: 'naming-failed',
      remainingTabCount: await rollbackTabs(createdTabIds),
      skippedCount,
      status: 'failed',
    };
  }

  let activationFailed = false;

  try {
    await chrome.tabs.update(firstTabId, { active: true });
  } catch {
    activationFailed = true;
  }

  return {
    activationFailed,
    openedCount: createdTabIds.length,
    skippedCount,
    status: 'opened',
  };
}
