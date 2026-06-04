import { useEffect } from "react";

import { useStorageState } from "@/hooks/useStorageState";
import { setCSSVariables } from "@fleetia/components";
import type { ColorTheme } from "@fleetia/components/theme";

import { defaultOptionValue } from "../defaultOptionValue";

export const themePresets: Record<string, ColorTheme> = {
  light: defaultOptionValue.colorTheme
};

function themeToCSS(theme: ColorTheme): Record<string, string> {
  return {
    "--c-accent": theme.accent,
    "--c-accent-text": theme.accentText,
    "--c-surface": theme.surface,
    "--c-text": theme.text,
    "--c-border": theme.border,
    "--c-hover-bg": theme.hoverBg,
    "--c-hover-text": theme.hoverText,
    "--c-muted": theme.muted
  };
}

export function useTheme() {
  const { value: colorTheme, setValue: setColorTheme } =
    useStorageState<ColorTheme>("colorTheme", defaultOptionValue.colorTheme);

  useEffect(() => {
    setCSSVariables(themeToCSS(colorTheme));
  }, [colorTheme]);

  const updateTheme = async (
    key: keyof ColorTheme,
    value: string
  ): Promise<void> => {
    await setColorTheme({ ...colorTheme, [key]: value });
  };

  const applyPreset = async (preset: ColorTheme): Promise<void> => {
    await setColorTheme(preset);
  };

  const resetTheme = async (): Promise<void> => {
    await applyPreset(themePresets.light);
  };

  return { colorTheme, updateTheme, applyPreset, resetTheme };
}
