export const DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE = 'Starlit Scenes';
export const CHROME_OTHER_BOOKMARKS_FOLDER_ID = '2';

export type SceneBookmarkNode = {
  children?: SceneBookmarkNode[];
  id: string;
  parentId?: string;
  title: string;
  unmodifiable?: 'managed';
  url?: string;
};

export type SceneBookmarkCreateInput = {
  parentId: string;
  title: string;
  url?: string;
};

export type SceneBookmarkGateway = {
  create: (input: SceneBookmarkCreateInput) => Promise<SceneBookmarkNode>;
  getChildren: (id: string) => Promise<SceneBookmarkNode[]>;
  getSubTree: (id: string) => Promise<SceneBookmarkNode[]>;
  removeTree: (id: string) => Promise<void>;
};

export type BookmarkCopyPreview = {
  folderCount: number;
  sourceFolderId: string;
  urlCount: number;
};

export type BookmarkCopyResult = BookmarkCopyPreview & {
  containerFolderId: string;
  createdNodeIds: string[];
  identityMap: ReadonlyMap<string, string>;
  sceneFolderId: string;
  wasContainerCreated: boolean;
};

export type BookmarkCopyOptions = {
  containerTitle?: string;
  destinationParentId: string;
  sceneName: string;
  sourceFolderId: string;
};

type BookmarkCounts = {
  folderCount: number;
  urlCount: number;
};

function getSingleFolder(
  nodes: SceneBookmarkNode[],
  id: string,
  label: string,
): SceneBookmarkNode {
  const node = nodes.find((candidate) => candidate.id === id);
  if (!node || node.url !== undefined || node.unmodifiable === 'managed') {
    throw new Error(`${label} folder is unavailable or read-only.`);
  }

  return node;
}

function countBookmarkChildren(
  children: readonly SceneBookmarkNode[],
  visitedIds: Set<string>,
): BookmarkCounts {
  return children.reduce<BookmarkCounts>(
    (counts, node) => {
      if (visitedIds.has(node.id)) {
        throw new Error(`Bookmark tree contains a cycle at node: ${node.id}`);
      }
      visitedIds.add(node.id);

      if (node.url !== undefined) {
        return {
          folderCount: counts.folderCount,
          urlCount: counts.urlCount + 1,
        };
      }

      const nested = countBookmarkChildren(node.children ?? [], visitedIds);
      return {
        folderCount: counts.folderCount + nested.folderCount + 1,
        urlCount: counts.urlCount + nested.urlCount,
      };
    },
    { folderCount: 0, urlCount: 0 },
  );
}

async function loadSourceFolder(
  sourceFolderId: string,
  gateway: SceneBookmarkGateway,
): Promise<SceneBookmarkNode> {
  const sourceNodes = await gateway.getSubTree(sourceFolderId);
  const sourceFolder = getSingleFolder(
    sourceNodes,
    sourceFolderId,
    'Source bookmark',
  );
  return sourceFolder;
}

function createPreview(sourceFolder: SceneBookmarkNode): BookmarkCopyPreview {
  const counts = countBookmarkChildren(
    sourceFolder.children ?? [],
    new Set([sourceFolder.id]),
  );

  return {
    ...counts,
    sourceFolderId: sourceFolder.id,
  };
}

async function copyChildren(
  children: readonly SceneBookmarkNode[],
  parentId: string,
  gateway: SceneBookmarkGateway,
  createdNodeIds: string[],
  identityMap: Map<string, string>,
  excludedNodeIds: ReadonlySet<string>,
): Promise<void> {
  for (const child of children) {
    if (excludedNodeIds.has(child.id)) {
      continue;
    }

    const created = await gateway.create({
      parentId,
      title: child.title,
      ...(child.url === undefined ? {} : { url: child.url }),
    });
    createdNodeIds.push(created.id);
    identityMap.set(child.id, created.id);

    if (child.url === undefined) {
      await copyChildren(
        child.children ?? [],
        created.id,
        gateway,
        createdNodeIds,
        identityMap,
        excludedNodeIds,
      );
    }
  }
}

async function compensateBookmarkCopy(
  gateway: SceneBookmarkGateway,
  sceneFolderId: string | null,
  createdContainerId: string | null,
): Promise<unknown[]> {
  const failures: unknown[] = [];

  if (sceneFolderId !== null) {
    try {
      await gateway.removeTree(sceneFolderId);
    } catch (error) {
      failures.push(error);
    }
  }

  if (createdContainerId !== null) {
    try {
      await gateway.removeTree(createdContainerId);
    } catch (error) {
      failures.push(error);
    }
  }

  return failures;
}

export async function previewBookmarkCopy(
  sourceFolderId: string,
  gateway: SceneBookmarkGateway,
): Promise<BookmarkCopyPreview> {
  const sourceFolder = await loadSourceFolder(sourceFolderId, gateway);
  return createPreview(sourceFolder);
}

export async function findDefaultSceneBookmarkParent(
  gateway: SceneBookmarkGateway,
): Promise<string | null> {
  try {
    const nodes = await gateway.getSubTree(CHROME_OTHER_BOOKMARKS_FOLDER_ID);
    return getSingleFolder(
      nodes,
      CHROME_OTHER_BOOKMARKS_FOLDER_ID,
      'Other bookmarks',
    ).id;
  } catch {
    return null;
  }
}

export async function copyBookmarkFolderToScene(
  options: BookmarkCopyOptions,
  gateway: SceneBookmarkGateway,
): Promise<BookmarkCopyResult> {
  const sceneName = options.sceneName.trim();
  const containerTitle = (
    options.containerTitle ?? DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE
  ).trim();
  if (sceneName === '' || containerTitle === '') {
    throw new Error('Scene and bookmark container names must not be empty.');
  }

  const [sourceFolder, destinationNodes] = await Promise.all([
    loadSourceFolder(options.sourceFolderId, gateway),
    gateway.getSubTree(options.destinationParentId),
  ]);
  getSingleFolder(
    destinationNodes,
    options.destinationParentId,
    'Destination bookmark',
  );

  const preview = createPreview(sourceFolder);
  const createdNodeIds: string[] = [];
  const identityMap = new Map<string, string>();
  let createdContainerId: string | null = null;
  let sceneFolderId: string | null = null;

  try {
    const destinationChildren = await gateway.getChildren(
      options.destinationParentId,
    );
    const existingContainer = destinationChildren.find(
      (node) =>
        node.url === undefined &&
        node.unmodifiable !== 'managed' &&
        node.id !== sourceFolder.id &&
        node.title === containerTitle,
    );
    const container =
      existingContainer ??
      (await gateway.create({
        parentId: options.destinationParentId,
        title: containerTitle,
      }));

    if (!existingContainer) {
      createdContainerId = container.id;
      createdNodeIds.push(container.id);
    }

    const sceneFolder = await gateway.create({
      parentId: container.id,
      title: sceneName,
    });
    sceneFolderId = sceneFolder.id;
    createdNodeIds.push(sceneFolder.id);
    identityMap.set(sourceFolder.id, sceneFolder.id);

    await copyChildren(
      sourceFolder.children ?? [],
      sceneFolder.id,
      gateway,
      createdNodeIds,
      identityMap,
      new Set([container.id]),
    );

    return {
      ...preview,
      containerFolderId: container.id,
      createdNodeIds,
      identityMap,
      sceneFolderId: sceneFolder.id,
      wasContainerCreated: createdContainerId !== null,
    };
  } catch (error) {
    const compensationFailures = await compensateBookmarkCopy(
      gateway,
      sceneFolderId,
      createdContainerId,
    );
    if (compensationFailures.length > 0) {
      const details = compensationFailures
        .map((failure) =>
          failure instanceof Error ? failure.message : String(failure),
        )
        .join('; ');
      throw new Error(
        `Bookmark copy and compensation both failed: ${details}`,
        { cause: error },
      );
    }

    throw error;
  }
}
