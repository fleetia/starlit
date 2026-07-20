import type { GridSettings, Placement } from './types';

export const EXPANDED_VIEW_BREAKPOINT_PX = 720;
export const EXPANDED_GROUP_MIN_HEIGHT_PX = 160;
export const COLLAPSED_GROUP_HEIGHT_PX = 72;
export const EXPANDED_VIEW_MAX_WIDTH_PX = 1440;

export type ExpandedGroupsState = {
  knownKeys: string[];
  openKeys: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

export function decodeExpandedGroupsState(
  rawValue: unknown,
  fallback: ExpandedGroupsState,
): ExpandedGroupsState {
  return isRecord(rawValue) &&
    isStringArray(rawValue.knownKeys) &&
    isStringArray(rawValue.openKeys)
    ? { knownKeys: rawValue.knownKeys, openKeys: rawValue.openKeys }
    : fallback;
}

type GridMargin = NonNullable<GridSettings['margin']>;
type VerticalMargin = Pick<GridMargin, 'bottom' | 'top'>;
type HorizontalMargin = Pick<GridMargin, 'left' | 'right'>;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function areEqual(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function getColumnCapacity(
  capacities: number[],
  columnIndex: number,
  groupCount: number,
): number {
  if (groupCount === 0) {
    return 0;
  }

  return clamp(Math.trunc(capacities[columnIndex] ?? 1), 1, groupCount);
}

export function getExpandedViewTrackCount(
  configuredCount: number | undefined,
  viewportWidth: number,
): number {
  if (viewportWidth <= EXPANDED_VIEW_BREAKPOINT_PX) {
    return 1;
  }

  const count = Number.isFinite(configuredCount) ? configuredCount : 2;
  return Math.max(1, Math.trunc(count ?? 2));
}

export function distributeGroupKeys(
  groupKeys: string[],
  trackCount: number,
): string[][] {
  if (groupKeys.length === 0) {
    return [];
  }

  const columnCount = clamp(
    Math.trunc(Number.isFinite(trackCount) ? trackCount : 1),
    1,
    groupKeys.length,
  );

  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const start = Math.floor((groupKeys.length * columnIndex) / columnCount);
    const end = Math.floor(
      (groupKeys.length * (columnIndex + 1)) / columnCount,
    );
    return groupKeys.slice(start, end);
  });
}

export function getExpandedViewAvailableHeight(
  viewportHeight: number,
  viewportWidth: number,
  margin: VerticalMargin | undefined,
): number {
  const screenPadding = viewportWidth <= EXPANDED_VIEW_BREAKPOINT_PX ? 24 : 48;
  return Math.max(
    0,
    viewportHeight - screenPadding - (margin?.top ?? 0) - (margin?.bottom ?? 0),
  );
}

export function getExpandedViewAvailableWidth(
  viewportWidth: number,
  margin: HorizontalMargin | undefined,
): number {
  const screenPadding = viewportWidth <= EXPANDED_VIEW_BREAKPOINT_PX ? 24 : 48;
  return Math.min(
    EXPANDED_VIEW_MAX_WIDTH_PX,
    Math.max(
      0,
      viewportWidth -
        screenPadding -
        (margin?.left ?? 0) -
        (margin?.right ?? 0),
    ),
  );
}

export function getExpandedSurfaceWidth(
  availableWidth: number,
  trackCount: number,
  columnCount: number,
  gap: number,
): number {
  const normalizedTrackCount = Math.max(1, Math.trunc(trackCount));
  const normalizedColumnCount = clamp(
    Math.trunc(columnCount),
    0,
    normalizedTrackCount,
  );

  if (normalizedColumnCount === 0) {
    return 0;
  }

  const normalizedAvailableWidth = Math.max(0, availableWidth);
  const normalizedGap = Math.max(0, gap);
  const trackWidth = Math.max(
    0,
    (normalizedAvailableWidth - (normalizedTrackCount - 1) * normalizedGap) /
      normalizedTrackCount,
  );
  const surfaceWidth =
    normalizedColumnCount * trackWidth +
    (normalizedColumnCount - 1) * normalizedGap;

  return Math.min(normalizedAvailableWidth, surfaceWidth);
}

export function getExpandedColumnVisualOrder(
  groupKeys: string[],
  position: Placement,
): string[] {
  return position.startsWith('bottom-') ? [...groupKeys].reverse() : groupKeys;
}

export function parseCssLengthInPixels(
  value: string | undefined,
  emSize = 16,
  remSize = 16,
): number {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*(px|em|rem)?\s*$/.exec(value ?? '');

  if (!match?.[1]) {
    return 16;
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 'px';

  if (unit === 'em') {
    return Math.max(0, amount * emSize);
  }

  if (unit === 'rem') {
    return Math.max(0, amount * remSize);
  }

  return Math.max(0, amount);
}

export function getExpandedColumnCapacity(
  groupCount: number,
  availableHeight: number,
  gap: number,
  minimumExpandedHeight = EXPANDED_GROUP_MIN_HEIGHT_PX,
  collapsedHeight = COLLAPSED_GROUP_HEIGHT_PX,
): number {
  if (groupCount <= 0) {
    return 0;
  }

  const totalGap = Math.max(0, groupCount - 1) * Math.max(0, gap);
  const heightPerExpansion = minimumExpandedHeight - collapsedHeight;

  if (heightPerExpansion <= 0) {
    return groupCount;
  }

  const capacity = Math.floor(
    (availableHeight - groupCount * collapsedHeight - totalGap) /
      heightPerExpansion,
  );
  return clamp(capacity, 1, groupCount);
}

export function reconcileExpandedGroups(
  state: ExpandedGroupsState,
  columns: string[][],
  capacities: number[],
): ExpandedGroupsState {
  const currentKeys = columns.flat();
  const currentKeySet = new Set(currentKeys);
  const previouslyKnown = new Set(
    state.knownKeys.filter((key) => currentKeySet.has(key)),
  );
  const currentOpenKeys = state.openKeys.filter((key) =>
    currentKeySet.has(key),
  );
  const retainedOpenKeys = new Set<string>();
  const newlyOpenedKeys: string[] = [];

  columns.forEach((column, columnIndex) => {
    const columnKeySet = new Set(column);
    const capacity = getColumnCapacity(capacities, columnIndex, column.length);
    const openInColumn = currentOpenKeys.filter((key) => columnKeySet.has(key));
    const retainedInColumn = openInColumn.slice(-capacity);

    retainedInColumn.forEach((key) => retainedOpenKeys.add(key));

    const availableSlots = capacity - retainedInColumn.length;
    if (availableSlots <= 0) {
      return;
    }

    column
      .filter((key) => !previouslyKnown.has(key))
      .slice(0, availableSlots)
      .forEach((key) => newlyOpenedKeys.push(key));
  });

  const nextOpenKeys = [
    ...currentOpenKeys.filter((key) => retainedOpenKeys.has(key)),
    ...newlyOpenedKeys,
  ];
  const nextState = {
    knownKeys: currentKeys,
    openKeys: nextOpenKeys,
  };

  return areEqual(state.knownKeys, nextState.knownKeys) &&
    areEqual(state.openKeys, nextState.openKeys)
    ? state
    : nextState;
}

export function setExpandedGroupOpen(
  state: ExpandedGroupsState,
  groupKey: string,
  isOpen: boolean,
  columns: string[][],
  capacities: number[],
): ExpandedGroupsState {
  const reconciledState = reconcileExpandedGroups(state, columns, capacities);

  if (!isOpen) {
    const openKeys = reconciledState.openKeys.filter((key) => key !== groupKey);
    return areEqual(reconciledState.openKeys, openKeys)
      ? reconciledState
      : { ...reconciledState, openKeys };
  }

  if (reconciledState.openKeys.includes(groupKey)) {
    return reconciledState;
  }

  const columnIndex = columns.findIndex((column) => column.includes(groupKey));
  const column = columns[columnIndex];

  if (!column) {
    return reconciledState;
  }

  const columnKeySet = new Set(column);
  const capacity = getColumnCapacity(capacities, columnIndex, column.length);
  const openInColumn = reconciledState.openKeys.filter((key) =>
    columnKeySet.has(key),
  );
  const keysToClose = new Set(
    openInColumn.slice(0, Math.max(0, openInColumn.length - capacity + 1)),
  );

  return {
    ...reconciledState,
    openKeys: [
      ...reconciledState.openKeys.filter((key) => !keysToClose.has(key)),
      groupKey,
    ],
  };
}
