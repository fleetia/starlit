import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useGridSettings } from "../useGridSettings";
import type { GridSettings } from "../../types";
import { defaultOptionValue } from "../../defaultOptionValue";

const mockSetCSSVariables = vi.fn();

let mockGridSettings: GridSettings = { ...defaultOptionValue.gridSettings };
const mockSetGridSettings = vi.fn<(v: GridSettings) => Promise<void>>();

vi.mock("@/hooks/useStorageState", () => ({
  useStorageState: () => ({
    value: mockGridSettings,
    setValue: mockSetGridSettings,
    isLoaded: true
  })
}));

vi.mock("@fleetia/components", () => ({
  setCSSVariables: (...args: unknown[]) => mockSetCSSVariables(...args)
}));

vi.mock("@/utils/flattenObject", () => ({
  flattenObject: (obj: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    const flatten = (o: Record<string, unknown>, prefix = "") => {
      for (const [key, value] of Object.entries(o)) {
        const newKey = prefix ? `${prefix}-${key}` : key;
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          flatten(value as Record<string, unknown>, newKey);
        } else {
          result[newKey] = value;
        }
      }
    };
    flatten(obj);
    return result;
  }
}));

beforeEach(() => {
  mockGridSettings = { ...defaultOptionValue.gridSettings };
  mockSetGridSettings.mockResolvedValue(undefined);
  mockSetCSSVariables.mockClear();
});

describe("useGridSettings", () => {
  it("returns default gridSettings", () => {
    const { result } = renderHook(() => useGridSettings());

    expect(result.current.gridSettings).toEqual(
      defaultOptionValue.gridSettings
    );
  });

  it("applies CSS variables on mount", () => {
    renderHook(() => useGridSettings());

    expect(mockSetCSSVariables).toHaveBeenCalled();
    const cssVars = mockSetCSSVariables.mock.calls[0][0] as Record<
      string,
      string
    >;
    expect(cssVars).toHaveProperty("--gap");
    expect(cssVars).toHaveProperty("--position");
  });

  it("only applies CSS-relevant keys as variables", () => {
    renderHook(() => useGridSettings());

    const cssVars = mockSetCSSVariables.mock.calls[0][0] as Record<
      string,
      string
    >;
    expect(cssVars).not.toHaveProperty("--columns");
    expect(cssVars).not.toHaveProperty("--rows");
  });

  it("updateGridSettings is callable", async () => {
    const { result } = renderHook(() => useGridSettings());

    const newSettings: GridSettings = {
      ...defaultOptionValue.gridSettings,
      columns: 8,
      rows: 4
    };

    await act(async () => {
      await result.current.updateGridSettings(newSettings);
    });

    expect(mockSetGridSettings).toHaveBeenCalledWith(newSettings);
  });
});
