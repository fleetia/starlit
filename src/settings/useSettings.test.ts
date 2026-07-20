import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from './defaults';
import { normalizeSettings } from './normalizeSettings';
import type { PersistedSettings, Settings } from './types';
import { useSettings } from './useSettings';

const storageState = vi.hoisted(() => ({
  setSettings: vi.fn<(settings: Settings) => Promise<void>>(),
  settings: null as unknown,
}));

vi.mock('../hooks/useStorageState', () => ({
  useStorageState: (
    _key: string,
    fallback: Settings,
    decode: (value: unknown, fallback: Settings) => Settings,
  ) => ({
    isLoaded: true,
    setValue: storageState.setSettings,
    value: decode(storageState.settings, fallback),
  }),
}));

beforeEach((): void => {
  storageState.settings = structuredClone(DEFAULT_SETTINGS);
  storageState.setSettings.mockResolvedValue(undefined);
});

describe('useSettings', () => {
  it('normalizes an unknown stored font to IBM Plex Sans', () => {
    expect(
      normalizeSettings({
        ...DEFAULT_SETTINGS,
        fontFamily: 'unknown-font',
      }).fontFamily,
    ).toBe('ibm-plex-sans');
  });

  it('uses the provided fallback for invalid stored leaves', () => {
    const fallback: Settings = {
      ...DEFAULT_SETTINGS,
      fontFamily: 'system',
      isExpandView: true,
    };

    expect(
      normalizeSettings(
        {
          fontFamily: 'unknown-font',
          isExpandView: 'yes',
        },
        fallback,
      ),
    ).toEqual(fallback);
  });

  it('defaults a legacy profile to IBM Plex Sans', () => {
    const legacySettings: PersistedSettings = structuredClone(DEFAULT_SETTINGS);
    delete legacySettings.fontFamily;
    storageState.settings = legacySettings;

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.fontFamily).toBe('ibm-plex-sans');
  });

  it('returns persisted settings and saves a complete update', async () => {
    const { result } = renderHook(() => useSettings());
    const nextSettings: Settings = {
      ...DEFAULT_SETTINGS,
      iconLayout: 'horizontal',
      isExpandView: true,
      isOpenInNewTab: true,
    };

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.isLoaded).toBe(true);

    await act(async (): Promise<void> => {
      await result.current.updateSettings(nextSettings);
    });

    expect(storageState.setSettings).toHaveBeenCalledWith(nextSettings);
  });
});
