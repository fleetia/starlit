import { useStorageState } from '../hooks/useStorageState';

import { defaultOptionValue } from '../newtab/defaultOptionValue';
import type { GridSettings } from '../newtab/types';

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
  } = useStorageState<GridSettings>(
    'gridSettings',
    defaultOptionValue.gridSettings,
  );

  return { gridSettings, isLoaded, updateGridSettings };
}
