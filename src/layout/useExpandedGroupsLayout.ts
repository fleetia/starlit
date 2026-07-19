import { useEffect, useMemo, useState } from 'react';

import { useStorageState } from '../hooks/useStorageState';
import {
  distributeGroupKeys,
  getExpandedColumnCapacity,
  getExpandedSurfaceWidth,
  getExpandedViewAvailableHeight,
  getExpandedViewAvailableWidth,
  getExpandedViewTrackCount,
  parseCssLengthInPixels,
  reconcileExpandedGroups,
  setExpandedGroupOpen,
  type ExpandedGroupsState,
} from './expandedLayout';
import type { GridSettings } from './types';

type ViewportSize = {
  height: number;
  width: number;
};

type UseExpandedGroupsLayoutOptions = {
  cardGap?: string;
  groupKeys: string[];
  margin?: GridSettings['margin'];
  masonryColumns?: number;
};

export type ExpandedGroupsLayout = {
  columns: string[][];
  isLoaded: boolean;
  openKeySet: Set<string>;
  setGroupOpen: (groupKey: string, isOpen: boolean) => Promise<void>;
  surfaceWidth: number;
};

function getViewportSize(): ViewportSize {
  return { height: window.innerHeight, width: window.innerWidth };
}

export function useExpandedGroupsLayout({
  cardGap,
  groupKeys,
  margin,
  masonryColumns,
}: UseExpandedGroupsLayoutOptions): ExpandedGroupsLayout {
  const [viewportSize, setViewportSize] =
    useState<ViewportSize>(getViewportSize);
  const {
    isLoaded,
    value: expandedGroupsState,
    setValue: setExpandedGroupsState,
  } = useStorageState<ExpandedGroupsState>(
    'expandedGroupsState',
    { knownKeys: [], openKeys: [] },
    'local',
  );

  useEffect(() => {
    function updateViewportSize(): void {
      setViewportSize(getViewportSize());
    }

    window.addEventListener('resize', updateViewportSize);
    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);

  const trackCount = getExpandedViewTrackCount(
    masonryColumns,
    viewportSize.width,
  );
  const columns = useMemo(
    () => distributeGroupKeys(groupKeys, trackCount),
    [groupKeys, trackCount],
  );
  const availableHeight = getExpandedViewAvailableHeight(
    viewportSize.height,
    viewportSize.width,
    margin,
  );
  const gap = parseCssLengthInPixels(cardGap ?? '1rem');
  const availableWidth = getExpandedViewAvailableWidth(
    viewportSize.width,
    margin,
  );
  const surfaceWidth = getExpandedSurfaceWidth(
    availableWidth,
    trackCount,
    columns.length,
    gap,
  );
  const columnCapacities = useMemo(
    () =>
      columns.map((column) =>
        getExpandedColumnCapacity(column.length, availableHeight, gap),
      ),
    [availableHeight, columns, gap],
  );
  const reconciledState = useMemo(
    () =>
      reconcileExpandedGroups(expandedGroupsState, columns, columnCapacities),
    [columnCapacities, columns, expandedGroupsState],
  );
  const openKeySet = useMemo(
    () => new Set(reconciledState.openKeys),
    [reconciledState.openKeys],
  );

  async function setGroupOpen(
    groupKey: string,
    isOpen: boolean,
  ): Promise<void> {
    await setExpandedGroupsState((currentState) =>
      setExpandedGroupOpen(
        currentState,
        groupKey,
        isOpen,
        columns,
        columnCapacities,
      ),
    );
  }

  return { columns, isLoaded, openKeySet, setGroupOpen, surfaceWidth };
}
