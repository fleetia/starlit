import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from './defaults';
import { normalizeSettings } from './normalizeSettings';
import type { PersistedSettings, Settings } from './types';
import { useSettings } from './useSettings';

type SyncedSettings = Pick<Settings, 'isOpenInNewTab'>;

const storageState = vi.hoisted(() => ({
  calls: [] as Array<{ area: 'local' | 'sync'; key: string }>,
  localSettings: null as unknown,
  setLocalSettings: vi.fn<(settings: Settings) => Promise<void>>(),
  setSyncedSettings: vi.fn<(settings: SyncedSettings) => Promise<void>>(),
  syncedSettings: null as unknown,
}));

vi.mock('../hooks/useStorageState', () => ({
  useStorageState: (
    key: string,
    fallback: unknown,
    decode: (value: unknown, fallback: unknown) => unknown,
    area: 'local' | 'sync',
  ) => {
    storageState.calls.push({ area, key });
    const isLocal = area === 'local';

    return {
      isLoaded: true,
      setValue: isLocal
        ? storageState.setLocalSettings
        : storageState.setSyncedSettings,
      value: decode(
        isLocal ? storageState.localSettings : storageState.syncedSettings,
        fallback,
      ),
    };
  },
}));

beforeEach((): void => {
  storageState.calls = [];
  storageState.localSettings = structuredClone(DEFAULT_SETTINGS);
  storageState.syncedSettings = {
    isOpenInNewTab: DEFAULT_SETTINGS.isOpenInNewTab,
  };
  storageState.setLocalSettings.mockReset().mockResolvedValue(undefined);
  storageState.setSyncedSettings.mockReset().mockResolvedValue(undefined);
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
    storageState.localSettings = legacySettings;

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
    expect(storageState.calls).toEqual([
      { area: 'local', key: 'settings' },
      { area: 'sync', key: 'settings' },
    ]);

    await act(async (): Promise<void> => {
      await result.current.updateSettings(nextSettings);
    });

    expect(storageState.setLocalSettings).toHaveBeenCalledWith(nextSettings);
    expect(storageState.setSyncedSettings).toHaveBeenCalledWith({
      isOpenInNewTab: true,
    });
  });

  it('merges the synced open behavior into device-local Scene settings', () => {
    storageState.localSettings = {
      ...DEFAULT_SETTINGS,
      fontFamily: 'system',
      isExpandView: true,
      isOpenInNewTab: false,
    };
    storageState.syncedSettings = { isOpenInNewTab: true };

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toEqual({
      ...DEFAULT_SETTINGS,
      fontFamily: 'system',
      isExpandView: true,
      isOpenInNewTab: true,
    });
  });

  it('restores local settings when the sanitized sync write fails', async () => {
    const previousSettings = {
      ...DEFAULT_SETTINGS,
      fontFamily: 'system',
    } satisfies Settings;
    const nextSettings = {
      ...previousSettings,
      isExpandView: true,
      isOpenInNewTab: true,
    } satisfies Settings;
    const syncError = new Error('sync failed');
    storageState.localSettings = previousSettings;
    storageState.setSyncedSettings.mockRejectedValueOnce(syncError);
    const { result } = renderHook(() => useSettings());

    await expect(
      act(async (): Promise<void> => {
        await result.current.updateSettings(nextSettings);
      }),
    ).rejects.toBe(syncError);

    expect(storageState.setLocalSettings).toHaveBeenNthCalledWith(
      1,
      nextSettings,
    );
    expect(storageState.setLocalSettings).toHaveBeenNthCalledWith(
      2,
      previousSettings,
    );
  });
});
