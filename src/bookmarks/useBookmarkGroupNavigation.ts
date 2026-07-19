import { useRef, useState, type RefObject } from 'react';

import type { Bookmark } from './types';

type UseBookmarkGroupNavigationReturn = {
  activeGroupIndex: number;
  enterFolder: (groupKey: string, folder: Bookmark) => void;
  folderPaths: Record<string, Bookmark[]>;
  groupRailRef: RefObject<HTMLDivElement | null>;
  navigateToLevel: (groupKey: string, level: number) => void;
  pages: Record<string, number>;
  scrollToGroup: (index: number) => void;
  setPage: (groupKey: string, page: number) => void;
};

export function useBookmarkGroupNavigation(
  groupCount: number,
): UseBookmarkGroupNavigationReturn {
  const [pages, setPages] = useState<Record<string, number>>({});
  const [folderPaths, setFolderPaths] = useState<Record<string, Bookmark[]>>(
    {},
  );
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const groupRailRef = useRef<HTMLDivElement>(null);

  function setPage(groupKey: string, page: number): void {
    setPages((previous) => ({ ...previous, [groupKey]: page }));
  }

  function enterFolder(groupKey: string, folder: Bookmark): void {
    setFolderPaths((previous) => ({
      ...previous,
      [groupKey]: [...(previous[groupKey] ?? []), folder],
    }));
    setPage(groupKey, 0);
  }

  function navigateToLevel(groupKey: string, level: number): void {
    setFolderPaths((previous) => ({
      ...previous,
      [groupKey]: (previous[groupKey] ?? []).slice(0, level + 1),
    }));
    setPage(groupKey, 0);
  }

  function scrollToGroup(index: number): void {
    if (groupCount === 0) {
      return;
    }

    const nextIndex = (index + groupCount) % groupCount;
    setActiveGroupIndex(nextIndex);
    const group = groupRailRef.current?.children[nextIndex];
    if (group instanceof HTMLElement) {
      group.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }
  }

  return {
    activeGroupIndex,
    enterFolder,
    folderPaths,
    groupRailRef,
    navigateToLevel,
    pages,
    scrollToGroup,
    setPage,
  };
}
