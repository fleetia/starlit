import { useStorageState } from '../hooks/useStorageState';

import { DEFAULT_SETTINGS } from './defaults';
import { normalizeSettings } from './normalizeSettings';
import type { Settings } from './types';

type UseSettingsReturn = {
  isLoaded: boolean;
  settings: Settings;
  updateSettings: (settings: Settings) => Promise<void>;
};

export function useSettings(): UseSettingsReturn {
  const {
    isLoaded,
    value: settings,
    setValue: setSettings,
  } = useStorageState<Settings>(
    'settings',
    DEFAULT_SETTINGS,
    normalizeSettings,
  );

  const updateSettings = async (newSettings: Settings): Promise<void> => {
    await setSettings(newSettings);
  };

  return { isLoaded, settings, updateSettings };
}
