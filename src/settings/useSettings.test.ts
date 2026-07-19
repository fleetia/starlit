import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultOptionValue } from '../newtab/defaultOptionValue';
import type { PersistedSettings, Settings } from '../newtab/types';
import { normalizeSettings } from './normalizeSettings';
import { useSettings } from './useSettings';

const storageState = vi.hoisted(() => ({
  setSettings: vi.fn<(settings: Settings) => Promise<void>>(),
  settings: null as PersistedSettings | null,
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
  it('normalizes an unknown stored font to IBM Plex Sans', () => {
    expect(
      normalizeSettings({
        ...defaultOptionValue.settings,
        fontFamily: 'unknown-font',
      }).fontFamily,
    ).toBe('ibm-plex-sans');
  });

  it('defaults a legacy profile to IBM Plex Sans', () => {
    const legacySettings: PersistedSettings = structuredClone(
      defaultOptionValue.settings,
    );
    delete legacySettings.fontFamily;
    storageState.settings = legacySettings;

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.fontFamily).toBe('ibm-plex-sans');
  });

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
