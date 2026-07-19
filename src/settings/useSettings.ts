import { useStorageState } from '../hooks/useStorageState';

import { DEFAULT_SETTINGS } from './defaults';
import { normalizeSettings } from './normalizeSettings';
import type { PersistedSettings, Settings } from './types';

type UseSettingsReturn = {
  isLoaded: boolean;
  settings: Settings;
  updateSettings: (settings: Settings) => Promise<void>;
};

export function useSettings(): UseSettingsReturn {
  const {
    isLoaded,
    value: persistedSettings,
    setValue: setSettings,
  } = useStorageState<PersistedSettings>('settings', DEFAULT_SETTINGS);
  const settings = normalizeSettings(persistedSettings);

  const updateSettings = async (newSettings: Settings): Promise<void> => {
    await setSettings(newSettings);
  };

  return { isLoaded, settings, updateSettings };
}
