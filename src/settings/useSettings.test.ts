import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultOptionValue } from '../newtab/defaultOptionValue';
import type { Settings } from '../newtab/types';
import { useSettings } from './useSettings';

const storageState = vi.hoisted(() => ({
  setSettings: vi.fn<(settings: Settings) => Promise<void>>(),
  settings: null as Settings | null,
}));

vi.mock('../hooks/useStorageState', () => ({
  useStorageState: () => ({
    isLoaded: true,
    setValue: storageState.setSettings,
    value: storageState.settings,
  }),
}));

beforeEach((): void => {
  storageState.settings = structuredClone(defaultOptionValue.settings);
  storageState.setSettings.mockResolvedValue(undefined);
});

describe('useSettings', () => {
  it('returns persisted settings and saves a complete update', async () => {
    const { result } = renderHook(() => useSettings());
    const nextSettings: Settings = {
      ...defaultOptionValue.settings,
      iconLayout: 'horizontal',
      isExpandView: true,
      isOpenInNewTab: true,
    };

    expect(result.current.settings).toEqual(defaultOptionValue.settings);
    expect(result.current.isLoaded).toBe(true);

    await act(async (): Promise<void> => {
      await result.current.updateSettings(nextSettings);
    });

    expect(storageState.setSettings).toHaveBeenCalledWith(nextSettings);
  });
});
