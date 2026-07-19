import { useStorageState } from '../hooks/useStorageState';
import { DEFAULT_GRID_SETTINGS } from '../layout/defaults';
import type { GridSettings } from '../layout/types';

type UseGridSettingsReturn = {
  gridSettings: GridSettings;
  isLoaded: boolean;
  updateGridSettings: (
    next: GridSettings | ((previous: GridSettings) => GridSettings),
  ) => Promise<void>;
};

export function useGridSettings(): UseGridSettingsReturn {
  const {
    isLoaded,
    value: gridSettings,
    setValue: updateGridSettings,
  } = useStorageState<GridSettings>('gridSettings', DEFAULT_GRID_SETTINGS);

  return { gridSettings, isLoaded, updateGridSettings };
}
