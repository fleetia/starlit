import { describe, expect, it } from 'vitest';

import {
  distributeGroupKeys,
  getExpandedColumnCapacity,
  getExpandedColumnVisualOrder,
  getExpandedSurfaceWidth,
  getExpandedViewAvailableHeight,
  getExpandedViewAvailableWidth,
  getExpandedViewTrackCount,
  parseCssLengthInPixels,
  reconcileExpandedGroups,
  setExpandedGroupOpen,
  type ExpandedGroupsState,
} from './expandedLayout';

const GROUP_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
const COLUMNS = [GROUP_KEYS.slice(0, 4), GROUP_KEYS.slice(4)];
const CAPACITIES = [4, 4];
const EMPTY_STATE: ExpandedGroupsState = { knownKeys: [], openKeys: [] };

describe('expandedLayout', () => {
  it('distributes ordered groups contiguously with the remainder in later columns', () => {
    expect(distributeGroupKeys(GROUP_KEYS, 2)).toEqual([
      ['a', 'b', 'c', 'd'],
      ['e', 'f', 'g', 'h', 'i'],
    ]);
    expect(distributeGroupKeys(['a'], 2)).toEqual([['a']]);
    expect(distributeGroupKeys([], 2)).toEqual([]);
  });

  it('derives responsive tracks, available height, CSS gaps, and open capacity', () => {
    expect(getExpandedViewTrackCount(2, 721)).toBe(2);
    expect(getExpandedViewTrackCount(4, 720)).toBe(1);
    expect(
      getExpandedViewAvailableHeight(900, 1280, { top: 8, bottom: 12 }),
    ).toBe(832);
    expect(getExpandedViewAvailableHeight(900, 720, undefined)).toBe(876);
    expect(getExpandedViewAvailableWidth(1440, { left: 0, right: 0 })).toBe(
      1392,
    );
    expect(getExpandedViewAvailableWidth(2000, undefined)).toBe(1440);
    expect(getExpandedViewAvailableWidth(390, undefined)).toBe(366);
    expect(parseCssLengthInPixels('1.5em')).toBe(24);
    expect(parseCssLengthInPixels('2rem', 16, 18)).toBe(36);
    expect(getExpandedColumnCapacity(0, 852, 16)).toBe(0);
    expect(getExpandedColumnCapacity(4, 852, 16)).toBe(4);
    expect(getExpandedColumnCapacity(5, 852, 16)).toBe(4);
    expect(getExpandedColumnCapacity(9, 120, 16)).toBe(1);
  });

  it('keeps configured track width while anchoring only the populated columns', () => {
    expect(getExpandedSurfaceWidth(1392, 2, 2, 16)).toBe(1392);
    expect(getExpandedSurfaceWidth(1392, 2, 1, 16)).toBe(688);
    expect(getExpandedSurfaceWidth(366, 1, 1, 16)).toBe(366);
  });

  it('stacks bottom-aligned columns from the first group upward', () => {
    expect(
      getExpandedColumnVisualOrder(['a', 'b', 'c'], 'bottom-right'),
    ).toEqual(['c', 'b', 'a']);
    expect(
      getExpandedColumnVisualOrder(['a', 'b', 'c'], 'center-center'),
    ).toEqual(['a', 'b', 'c']);
  });

  it('opens only the initial capacity and replaces the oldest group in the same column', () => {
    const initial = reconcileExpandedGroups(EMPTY_STATE, COLUMNS, CAPACITIES);

    expect(initial).toEqual({
      knownKeys: GROUP_KEYS,
      openKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    });

    const openedLast = setExpandedGroupOpen(
      initial,
      'i',
      true,
      COLUMNS,
      CAPACITIES,
    );

    expect(openedLast.openKeys).toEqual([
      'a',
      'b',
      'c',
      'd',
      'f',
      'g',
      'h',
      'i',
    ]);
  });

  it('allows every group to close and never reopens known groups when capacity grows', () => {
    const initial = reconcileExpandedGroups(EMPTY_STATE, COLUMNS, CAPACITIES);
    const closed = initial.openKeys.reduce(
      (state, key) =>
        setExpandedGroupOpen(state, key, false, COLUMNS, CAPACITIES),
      initial,
    );

    expect(closed.openKeys).toEqual([]);
    expect(reconcileExpandedGroups(closed, COLUMNS, [4, 5]).openKeys).toEqual(
      [],
    );
  });

  it('keeps the most recently opened groups when columns merge or capacity shrinks', () => {
    const initial = reconcileExpandedGroups(EMPTY_STATE, COLUMNS, CAPACITIES);
    const withLastOpened = setExpandedGroupOpen(
      initial,
      'i',
      true,
      COLUMNS,
      CAPACITIES,
    );

    expect(
      reconcileExpandedGroups(withLastOpened, [GROUP_KEYS], [3]).openKeys,
    ).toEqual(['g', 'h', 'i']);
  });
});
