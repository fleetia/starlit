import type { Bookmark, BookmarkItem } from '../bookmarks/types';
import type {
  CreatePaletteResultsOptions,
  PaletteBookmarkResult,
  PaletteGroupResult,
  PaletteResult,
} from './types';

const CATEGORY_ORDER: Readonly<Record<PaletteResult['category'], number>> = {
  bookmark: 0,
  group: 1,
  scene: 2,
  settings: 3,
};

type RankedResult = {
  matchRank: number;
  result: PaletteResult;
  stableIndex: number;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function compareText(left: string, right: string): number {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);

  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  return 0;
}

function getUrlParts(url: string): { domain: string; path: string } {
  try {
    const parsed = new URL(url);
    return {
      domain: normalize(parsed.hostname.replace(/^www\./, '')),
      path: normalize(`${parsed.pathname}${parsed.search}${parsed.hash}`),
    };
  } catch {
    return { domain: '', path: normalize(url) };
  }
}

function getMatchRank(result: PaletteResult, query: string): number | null {
  if (!query) return 0;

  const title = normalize(result.title);
  if (title.startsWith(query)) return 0;

  if (result.category === 'bookmark') {
    const { domain, path } = getUrlParts(result.url);
    if (domain.startsWith(query)) return 1;
    if (path.includes(query)) return 2;
  }

  const resultPath =
    result.category === 'bookmark' || result.category === 'group'
      ? normalize(result.path.join(' / '))
      : '';
  if (resultPath.includes(query)) return 2;
  if (title.includes(query)) return 3;

  return null;
}

function createBookmarkResult(
  bookmark: BookmarkItem,
  path: readonly string[],
  isCurrentScene: boolean,
): PaletteBookmarkResult {
  return {
    bookmarkId: bookmark.id,
    category: 'bookmark',
    isCurrentScene,
    path,
    title: bookmark.title,
    url: bookmark.url,
  };
}

function flattenBookmarks(
  bookmarks: readonly Bookmark[],
  currentSceneRootId?: string,
): PaletteResult[] {
  const results: PaletteResult[] = [];
  const seenBookmarks = new Set<string>();
  const seenGroups = new Set<string>();

  function visit(
    nodes: readonly Bookmark[],
    parentPath: readonly string[],
    isInsideCurrentScene: boolean,
  ): void {
    for (const node of nodes) {
      const path = node.route?.length
        ? node.route
        : [...parentPath, node.title];
      const isCurrentScene =
        isInsideCurrentScene ||
        (currentSceneRootId !== undefined && node.id === currentSceneRootId);

      if (node.url && node.id && !seenBookmarks.has(node.id)) {
        seenBookmarks.add(node.id);
        results.push(
          createBookmarkResult(
            {
              id: node.id,
              title: node.title,
              url: node.url,
            },
            parentPath,
            isCurrentScene,
          ),
        );
      }

      if ((node.children || node.list) && node.id && !seenGroups.has(node.id)) {
        seenGroups.add(node.id);
        const group: PaletteGroupResult = {
          category: 'group',
          groupId: node.id,
          isCurrentScene,
          path,
          title: node.title,
        };
        results.push(group);
      }

      for (const item of node.list ?? []) {
        if (seenBookmarks.has(item.id)) continue;
        seenBookmarks.add(item.id);
        results.push(createBookmarkResult(item, path, isCurrentScene));
      }

      if (node.children) {
        visit(node.children, path, isCurrentScene);
      }
    }
  }

  visit(bookmarks, [], false);
  return results;
}

export function createPaletteResults({
  activeSceneId,
  bookmarks,
  currentSceneRootId,
  scenes,
  settingsLabels,
}: CreatePaletteResultsOptions): PaletteResult[] {
  return [
    ...flattenBookmarks(bookmarks, currentSceneRootId),
    ...scenes.map(
      (scene): PaletteResult => ({
        category: 'scene',
        isCurrentScene: scene.id === activeSceneId,
        sceneId: scene.id,
        title: scene.name,
      }),
    ),
    ...Object.entries(settingsLabels).map(
      ([destination, title]): PaletteResult => ({
        category: 'settings',
        destination: destination as keyof typeof settingsLabels,
        isCurrentScene: false,
        title,
      }),
    ),
  ];
}

export function rankPaletteResults(
  results: readonly PaletteResult[],
  input: string,
  limit = 50,
): PaletteResult[] {
  const query = normalize(input);
  const ranked: RankedResult[] = [];

  results.forEach((result, stableIndex) => {
    const matchRank = getMatchRank(result, query);
    if (matchRank !== null) {
      ranked.push({ matchRank, result, stableIndex });
    }
  });

  return ranked
    .sort((left, right) => {
      if (left.result.isCurrentScene !== right.result.isCurrentScene) {
        return left.result.isCurrentScene ? -1 : 1;
      }
      if (left.matchRank !== right.matchRank) {
        return left.matchRank - right.matchRank;
      }
      const categoryOrder =
        CATEGORY_ORDER[left.result.category] -
        CATEGORY_ORDER[right.result.category];
      if (categoryOrder !== 0) return categoryOrder;

      const titleOrder = compareText(left.result.title, right.result.title);
      return titleOrder !== 0
        ? titleOrder
        : left.stableIndex - right.stableIndex;
    })
    .slice(0, limit)
    .map(({ result }) => result);
}

export function getPaletteResultKey(result: PaletteResult): string {
  switch (result.category) {
    case 'bookmark':
      return `bookmark:${result.bookmarkId}`;
    case 'group':
      return `group:${result.groupId}`;
    case 'scene':
      return `scene:${result.sceneId}`;
    case 'settings':
      return `settings:${result.destination}`;
  }
}
