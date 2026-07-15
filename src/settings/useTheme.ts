import { useStorageState } from '../hooks/useStorageState';
import { getThemeStyle, type CssVariableStyle } from '../theme/starlitTheme';

import { defaultOptionValue } from '../newtab/defaultOptionValue';
import type { StarlitTheme } from '../newtab/types';

export const themePresets = {
  light: defaultOptionValue.colorTheme,
} satisfies Record<string, StarlitTheme>;

type UseThemeReturn = {
  colorTheme: StarlitTheme;
  isLoaded: boolean;
  themeStyle: CssVariableStyle;
  updateTheme: (key: keyof StarlitTheme, value: string) => Promise<void>;
  applyPreset: (preset: StarlitTheme) => Promise<void>;
  resetTheme: () => Promise<void>;
};

export function useTheme(): UseThemeReturn {
  const {
    isLoaded,
    value: colorTheme,
    setValue: setColorTheme,
  } = useStorageState<StarlitTheme>(
    'colorTheme',
    defaultOptionValue.colorTheme,
  );

  const updateTheme = async (
    key: keyof StarlitTheme,
    value: string,
  ): Promise<void> => {
    await setColorTheme((currentTheme) => ({
      ...currentTheme,
      [key]: value,
    }));
  };

  const applyPreset = async (preset: StarlitTheme): Promise<void> => {
    await setColorTheme(preset);
  };

  const resetTheme = async (): Promise<void> => {
    await applyPreset(themePresets.light);
  };

  return {
    colorTheme,
    isLoaded,
    themeStyle: getThemeStyle(colorTheme),
    updateTheme,
    applyPreset,
    resetTheme,
  };
}
