import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useExpandedGroupsLayout } from './useExpandedGroupsLayout';

const storageMocks = vi.hoisted(() => ({
  setValue: vi.fn(),
  useStorageState: vi.fn(),
}));

vi.mock('../hooks/useStorageState', () => ({
  useStorageState: (...arguments_: unknown[]) =>
    storageMocks.useStorageState(...arguments_),
}));

beforeEach((): void => {
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 900,
  });
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1280,
  });
  storageMocks.setValue.mockReset();
  storageMocks.useStorageState.mockReset();
  storageMocks.useStorageState.mockReturnValue({
    isLoaded: true,
    setValue: storageMocks.setValue,
    value: { knownKeys: [], openKeys: [] },
  });
});

describe('useExpandedGroupsLayout', () => {
  it('uses local storage and recomposes responsive columns on resize', () => {
    const groupKeys = ['first', 'second'];
    const { result } = renderHook(() =>
      useExpandedGroupsLayout({
        cardGap: '1rem',
        groupKeys,
        masonryColumns: 2,
      }),
    );

    expect(storageMocks.useStorageState).toHaveBeenCalledWith(
      'expandedGroupsState',
      { knownKeys: [], openKeys: [] },
      'local',
    );
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.columns).toEqual([['first'], ['second']]);
    expect([...result.current.openKeySet]).toEqual(groupKeys);

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 700,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.columns).toEqual([groupKeys]);
  });
});
