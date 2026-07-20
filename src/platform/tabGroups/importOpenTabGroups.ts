export type OpenTabGroupSnapshot = {
  id: number;
  tabCount: number;
  title: string;
  windowId: number;
};

export type BookmarkDestination = {
  id: string;
  isWritable: boolean;
  path: string[];
  title: string;
};

export type TabGroupImportResult = {
  failedCount: number;
  groups: TabGroupImportGroupResult[];
  importedCount: number;
  omittedTabCount: number;
  skippedCount: number;
};

export type TabGroupImportGroupResult = {
  folderTitle?: string;
  groupId: number;
  importedTabCount: number;
  omittedTabCount: number;
  rollbackFailed?: boolean;
  status: 'failed' | 'imported' | 'skipped';
  title: string;
};

type ImportOpenTabGroupsOptions = {
  destinationId: string;
  groupIds: number[];
  untitledTitle: string;
};

const TAB_GROUP_IMPORT_PERMISSIONS: chrome.permissions.Permissions = {
  permissions: ['tabs', 'tabGroups'],
};

const TAB_GROUPS_PERMISSION: chrome.permissions.Permissions = {
  permissions: ['tabGroups'],
};

function hasImportRequestApis(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    Boolean(chrome.permissions?.request) &&
    Boolean(chrome.permissions?.contains) &&
    Boolean(chrome.permissions?.remove) &&
    Boolean(chrome.tabs?.query) &&
    Boolean(chrome.bookmarks?.getTree) &&
    Boolean(chrome.bookmarks?.getSubTree) &&
    Boolean(chrome.bookmarks?.getChildren) &&
    Boolean(chrome.bookmarks?.create) &&
    Boolean(chrome.bookmarks?.removeTree)
  );
}

function hasGrantedImportApis(): boolean {
  return (
    hasImportRequestApis() &&
    Boolean(chrome.tabGroups?.query) &&
    Boolean(chrome.tabGroups?.get)
  );
}

function getTitle(title: string | undefined, fallback: string): string {
  const normalizedTitle = title?.trim();
  return normalizedTitle ? normalizedTitle : fallback;
}

function collectDestinations(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  parentPath: string[] = [],
  isManagedParent = false,
): BookmarkDestination[] {
  return nodes.flatMap((node) => {
    const isManaged = isManagedParent || node.unmodifiable === 'managed';
    const isFolder = node.url === undefined;
    const path = node.title ? [...parentPath, node.title] : parentPath;

    if (!isFolder) {
      return [];
    }

    const children = collectDestinations(node.children ?? [], path, isManaged);
    const current = node.parentId
      ? [{ id: node.id, isWritable: !isManaged, path, title: node.title }]
      : [];

    return [...current, ...children];
  });
}

function getDefaultDestinationId(
  destinations: BookmarkDestination[],
  preferredDestinationId?: string,
): string | undefined {
  if (
    preferredDestinationId &&
    destinations.some(
      ({ id, isWritable }) => id === preferredDestinationId && isWritable,
    )
  ) {
    return preferredDestinationId;
  }

  return destinations.find(({ isWritable }) => isWritable)?.id;
}

function createUniqueFolderTitle(
  baseTitle: string,
  takenTitles: Set<string>,
): string {
  if (!takenTitles.has(baseTitle)) {
    return baseTitle;
  }

  let suffix = 2;
  while (takenTitles.has(`${baseTitle} (${suffix})`)) {
    suffix += 1;
  }

  return `${baseTitle} (${suffix})`;
}

async function validateDestination(destinationId: string): Promise<void> {
  const [destination] = await chrome.bookmarks.getSubTree(destinationId);

  if (
    !destination ||
    destination.url !== undefined ||
    destination.unmodifiable === 'managed'
  ) {
    throw new Error('Bookmark destination is unavailable');
  }
}

async function importGroup(
  groupId: number,
  destinationId: string,
  untitledTitle: string,
  takenTitles: Set<string>,
): Promise<TabGroupImportGroupResult> {
  let group: chrome.tabGroups.TabGroup;

  try {
    group = await chrome.tabGroups.get(groupId);
  } catch {
    return {
      groupId,
      importedTabCount: 0,
      omittedTabCount: 0,
      status: 'skipped',
      title: untitledTitle,
    };
  }

  const title = getTitle(group.title, untitledTitle);
  let tabs: chrome.tabs.Tab[];

  try {
    tabs = await chrome.tabs.query({ groupId });
  } catch {
    return {
      groupId,
      importedTabCount: 0,
      omittedTabCount: 0,
      status: 'failed',
      title,
    };
  }

  tabs = [...tabs].sort((left, right) => left.index - right.index);
  const bookmarkTabs = tabs.filter(
    (tab): tab is chrome.tabs.Tab & { url: string } => Boolean(tab.url),
  );
  const omittedTabCount = tabs.length - bookmarkTabs.length;

  if (bookmarkTabs.length === 0) {
    return {
      groupId,
      importedTabCount: 0,
      omittedTabCount,
      status: 'skipped',
      title,
    };
  }

  const folderTitle = createUniqueFolderTitle(title, takenTitles);
  let folderId: string | undefined;

  try {
    const folder = await chrome.bookmarks.create({
      parentId: destinationId,
      title: folderTitle,
    });
    folderId = folder.id;

    for (const tab of bookmarkTabs) {
      await chrome.bookmarks.create({
        parentId: folder.id,
        title: getTitle(tab.title, tab.url),
        url: tab.url,
      });
    }

    takenTitles.add(folderTitle);

    return {
      folderTitle,
      groupId,
      importedTabCount: bookmarkTabs.length,
      omittedTabCount,
      status: 'imported',
      title,
    };
  } catch {
    let rollbackFailed = false;

    if (folderId) {
      try {
        await chrome.bookmarks.removeTree(folderId);
      } catch {
        rollbackFailed = true;
        takenTitles.add(folderTitle);
      }
    }

    return {
      ...(folderId ? { folderTitle } : {}),
      groupId,
      importedTabCount: 0,
      omittedTabCount,
      rollbackFailed,
      status: 'failed',
      title,
    };
  }
}

export async function requestTabGroupImportAccess(): Promise<boolean> {
  if (!hasImportRequestApis()) {
    throw new Error('Chrome tab group APIs are unavailable');
  }

  const wasGranted = await chrome.permissions.request(
    TAB_GROUP_IMPORT_PERMISSIONS,
  );

  if (wasGranted && !hasGrantedImportApis()) {
    throw new Error('Chrome tab group APIs are unavailable');
  }

  return wasGranted;
}

export async function hasTabGroupsAccess(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions?.contains) {
    return false;
  }

  return chrome.permissions.contains(TAB_GROUPS_PERMISSION);
}

export async function disconnectTabGroupsAccess(): Promise<boolean> {
  if (
    typeof chrome === 'undefined' ||
    !chrome.permissions?.contains ||
    !chrome.permissions?.remove
  ) {
    return false;
  }

  try {
    await chrome.permissions.remove(TAB_GROUPS_PERMISSION);
    return !(await chrome.permissions.contains(TAB_GROUPS_PERMISSION));
  } catch {
    return false;
  }
}

export async function getOpenTabGroups(
  untitledTitle: string,
): Promise<OpenTabGroupSnapshot[]> {
  const groups = await chrome.tabGroups.query({});
  const snapshots = await Promise.all(
    groups.map(async (group): Promise<OpenTabGroupSnapshot> => {
      const tabs = await chrome.tabs.query({ groupId: group.id });

      return {
        id: group.id,
        tabCount: tabs.length,
        title: getTitle(group.title, untitledTitle),
        windowId: group.windowId,
      };
    }),
  );

  return snapshots;
}

export async function getBookmarkDestinations(
  preferredDestinationId?: string,
): Promise<{
  defaultDestinationId?: string;
  destinations: BookmarkDestination[];
}> {
  const tree = await chrome.bookmarks.getTree();
  const destinations = collectDestinations(tree);

  return {
    defaultDestinationId: getDefaultDestinationId(
      destinations,
      preferredDestinationId,
    ),
    destinations,
  };
}

export async function importOpenTabGroups({
  destinationId,
  groupIds,
  untitledTitle,
}: ImportOpenTabGroupsOptions): Promise<TabGroupImportResult> {
  await validateDestination(destinationId);

  const destinationChildren = await chrome.bookmarks.getChildren(destinationId);
  const takenTitles = new Set(
    destinationChildren
      .filter(({ url }) => url === undefined)
      .map(({ title }) => title),
  );
  const uniqueGroupIds = [...new Set(groupIds)];
  const groups: TabGroupImportGroupResult[] = [];

  for (const groupId of uniqueGroupIds) {
    groups.push(
      await importGroup(groupId, destinationId, untitledTitle, takenTitles),
    );
  }

  return {
    failedCount: groups.filter(({ status }) => status === 'failed').length,
    groups,
    importedCount: groups.filter(({ status }) => status === 'imported').length,
    omittedTabCount: groups.reduce(
      (count, group) => count + group.omittedTabCount,
      0,
    ),
    skippedCount: groups.filter(({ status }) => status === 'skipped').length,
  };
}
