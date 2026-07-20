import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_GRID_SETTINGS } from '../layout/defaults';
import type { GridSettings } from '../layout/types';
import { useGridSettings } from './useGridSettings';

type GridSettingsUpdate =
  | GridSettings
  | ((previous: GridSettings) => GridSettings);

const storageState = vi.hoisted(() => ({
  gridSettings: null as unknown,
  setGridSettings: vi.fn<(next: GridSettingsUpdate) => Promise<void>>(),
}));

vi.mock('../hooks/useStorageState', () => ({
  useStorageState: (
    _key: string,
    fallback: GridSettings,
    decode: (value: unknown, fallback: GridSettings) => GridSettings,
  ) => ({
    isLoaded: true,
    setValue: storageState.setGridSettings,
    value: decode(storageState.gridSettings, fallback),
  }),
}));

beforeEach((): void => {
  storageState.gridSettings = structuredClone(DEFAULT_GRID_SETTINGS);
  storageState.setGridSettings.mockResolvedValue(undefined);
});

describe('useGridSettings', () => {
  it('returns the persisted grid settings', () => {
    const { result } = renderHook(() => useGridSettings());

    expect(result.current.gridSettings).toEqual(DEFAULT_GRID_SETTINGS);
    expect(result.current.isLoaded).toBe(true);
  });

  it('keeps a persisted legacy-equal gap as a current customization', () => {
    storageState.gridSettings = {
      ...DEFAULT_GRID_SETTINGS,
      gap: '1em',
    };

    const { result } = renderHook(() => useGridSettings());

    expect(result.current.gridSettings.gap).toBe('1em');
  });

  it('forwards complete and functional updates to storage', async () => {
    const { result } = renderHook(() => useGridSettings());
    const nextSettings: GridSettings = {
      ...DEFAULT_GRID_SETTINGS,
      columns: 8,
      rows: 4,
    };
    const updater = (previous: GridSettings): GridSettings => ({
      ...previous,
      columns: 6,
    });

    await act(async (): Promise<void> => {
      await result.current.updateGridSettings(nextSettings);
      await result.current.updateGridSettings(updater);
    });

    expect(storageState.setGridSettings).toHaveBeenNthCalledWith(
      1,
      nextSettings,
    );
    expect(storageState.setGridSettings).toHaveBeenNthCalledWith(2, updater);
  });
});
