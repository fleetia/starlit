import { useStorageState } from '../hooks/useStorageState';

import { defaultOptionValue } from '../newtab/defaultOptionValue';
import type { Settings } from '../newtab/types';

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
  } = useStorageState<Settings>('settings', defaultOptionValue.settings);

  const updateSettings = async (newSettings: Settings): Promise<void> => {
    await setSettings(newSettings);
  };

  return { isLoaded, settings, updateSettings };
}
