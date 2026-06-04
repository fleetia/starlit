import { useStorageState } from "@/hooks/useStorageState";

import { Settings } from "../types";
import { defaultOptionValue } from "../defaultOptionValue";

export function useSettings() {
  const { value: settings, setValue: setSettings } = useStorageState<Settings>(
    "settings",
    defaultOptionValue.settings
  );

  const updateSettings = async (newSettings: Settings): Promise<void> => {
    await setSettings(newSettings);
  };

  return { settings, updateSettings };
}
