import { useEffect } from "react";

import { useStorageState } from "@/hooks/useStorageState";
import { setCSSVariables } from "@fleetia/components";
import { flattenObject } from "@/utils/flattenObject";

import { GridSettings } from "../types";
import { defaultOptionValue } from "../defaultOptionValue";

export function useGridSettings() {
  const { value: gridSettings, setValue: updateGridSettings } =
    useStorageState<GridSettings>(
      "gridSettings",
      defaultOptionValue.gridSettings
    );

  useEffect(() => {
    const CSS_RELEVANT_KEYS = new Set([
      "gap",
      "cardGap",
      "position",
      "background-color",
      "background-border",
      "background-text",
      "background-gridImage",
      "icon-color",
      "icon-border",
      "icon-text",
      "icon-borderRadius",
      "icon-iconRadius"
    ]);

    const flat = flattenObject(
      gridSettings as unknown as Record<string, unknown>
    );
    const cssVars = Object.fromEntries(
      Object.entries(flat)
        .filter(([key]) => CSS_RELEVANT_KEYS.has(key))
        .map(([key, value]) => [`--${key}`, value as string])
    );
    setCSSVariables(cssVars);
  }, [gridSettings]);

  return { gridSettings, updateGridSettings };
}
