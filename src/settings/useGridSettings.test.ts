import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultOptionValue } from '../newtab/defaultOptionValue';
import type { GridSettings } from '../newtab/types';
import { useGridSettings } from './useGridSettings';

type GridSettingsUpdate =
  GridSettings | ((previous: GridSettings) => GridSettings);

const storageState = vi.hoisted(() => ({
  gridSettings: null as GridSettings | null,
  setGridSettings: vi.fn<(next: GridSettingsUpdate) => Promise<void>>(),
}));

vi.mock('../hooks/useStorageState', () => ({
  useStorageState: () => ({
    isLoaded: true,
    setValue: storageState.setGridSettings,
    value: storageState.gridSettings,
  }),
}));

beforeEach((): void => {
  storageState.gridSettings = structuredClone(defaultOptionValue.gridSettings);
  storageState.setGridSettings.mockResolvedValue(undefined);
});

describe('useGridSettings', () => {
  it('returns the persisted grid settings', () => {
    const { result } = renderHook(() => useGridSettings());

    expect(result.current.gridSettings).toEqual(
      defaultOptionValue.gridSettings,
    );
    expect(result.current.isLoaded).toBe(true);
  });

  it('forwards complete and functional updates to storage', async () => {
    const { result } = renderHook(() => useGridSettings());
    const nextSettings: GridSettings = {
      ...defaultOptionValue.gridSettings,
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
