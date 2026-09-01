import { useMemo } from 'react';

import { useStorageState } from '../hooks/useStorageState';

import { DEFAULT_SETTINGS } from './defaults';
import { normalizeSettings } from './normalizeSettings';
import type { Settings } from './types';

type UseSettingsReturn = {
  isLoaded: boolean;
  settings: Settings;
  updateSettings: (settings: Settings) => Promise<void>;
};

type SyncedSettings = Pick<Settings, 'isOpenInNewTab'>;

const DEFAULT_SYNCED_SETTINGS: SyncedSettings = {
  isOpenInNewTab: DEFAULT_SETTINGS.isOpenInNewTab,
};

function decodeSyncedSettings(
  rawValue: unknown,
  fallback: SyncedSettings,
): SyncedSettings {
  if (
    typeof rawValue !== 'object' ||
    rawValue === null ||
    !Object.hasOwn(rawValue, 'isOpenInNewTab')
  ) {
    return fallback;
  }

  const { isOpenInNewTab } = rawValue as Record<string, unknown>;
  return {
    isOpenInNewTab:
      typeof isOpenInNewTab === 'boolean'
        ? isOpenInNewTab
        : fallback.isOpenInNewTab,
  };
}

export function useSettings(): UseSettingsReturn {
  const {
    isLoaded: isLocalLoaded,
    value: localSettings,
    setValue: setLocalSettings,
  } = useStorageState<Settings>(
    'settings',
    DEFAULT_SETTINGS,
    normalizeSettings,
    'local',
  );
  const {
    isLoaded: isSyncLoaded,
    value: syncedSettings,
    setValue: setSyncedSettings,
  } = useStorageState<SyncedSettings>(
    'settings',
    DEFAULT_SYNCED_SETTINGS,
    decodeSyncedSettings,
    'sync',
  );
  const settings = useMemo(
    () => ({
      ...localSettings,
      isOpenInNewTab: syncedSettings.isOpenInNewTab,
    }),
    [localSettings, syncedSettings.isOpenInNewTab],
  );

  const updateSettings = async (newSettings: Settings): Promise<void> => {
    await setLocalSettings(newSettings);

    try {
      await setSyncedSettings({
        isOpenInNewTab: newSettings.isOpenInNewTab,
      });
    } catch (syncError) {
      try {
        await setLocalSettings(localSettings);
      } catch (rollbackError) {
        const failure = new AggregateError(
          [syncError, rollbackError],
          'Settings update and rollback both failed',
        );
        failure.cause = syncError;
        throw failure;
      }

      throw syncError;
    }
  };

  return {
    isLoaded: isLocalLoaded && isSyncLoaded,
    settings,
    updateSettings,
  };
}
