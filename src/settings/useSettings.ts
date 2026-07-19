import { useStorageState } from '../hooks/useStorageState';

import { defaultOptionValue } from '../newtab/defaultOptionValue';
import type { PersistedSettings, Settings } from '../newtab/types';
import { normalizeSettings } from './normalizeSettings';

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
  } = useStorageState<PersistedSettings>(
    'settings',
    defaultOptionValue.settings,
  );
  const settings = normalizeSettings(persistedSettings);

  const updateSettings = async (newSettings: Settings): Promise<void> => {
    await setSettings(newSettings);
  };

  return { isLoaded, settings, updateSettings };
}
