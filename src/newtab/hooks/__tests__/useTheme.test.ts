import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useTheme, themePresets } from "../useTheme";
import type { ColorTheme } from "@fleetia/components/theme";
import { defaultOptionValue } from "../../defaultOptionValue";

let mockColorTheme: ColorTheme = { ...defaultOptionValue.colorTheme };
const mockSetColorTheme = vi.fn<(v: ColorTheme) => Promise<void>>();

vi.mock("@/hooks/useStorageState", () => ({
  useStorageState: () => ({
    value: mockColorTheme,
    setValue: mockSetColorTheme,
    isLoaded: true
  })
}));

vi.mock("@fleetia/components", () => ({
  setCSSVariables: vi.fn()
}));

beforeEach(() => {
  mockColorTheme = { ...defaultOptionValue.colorTheme };
  mockSetColorTheme.mockResolvedValue(undefined);
});

describe("useTheme", () => {
  it("returns default colorTheme", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.colorTheme).toEqual(defaultOptionValue.colorTheme);
  });

  it("updateTheme updates a single theme key", async () => {
    const { result } = renderHook(() => useTheme());

    await act(async () => {
      await result.current.updateTheme("accent", "#ff0000");
    });

    expect(mockSetColorTheme).toHaveBeenCalledWith({
      ...defaultOptionValue.colorTheme,
      accent: "#ff0000"
    });
  });

  it("applyPreset replaces the entire theme", async () => {
    const preset: ColorTheme = {
      accent: "#111",
      accentText: "#222",
      surface: "#333",
      text: "#444",
      border: "#555",
      hoverBg: "#666",
      hoverText: "#777",
      muted: "#888"
    };

    const { result } = renderHook(() => useTheme());

    await act(async () => {
      await result.current.applyPreset(preset);
    });

    expect(mockSetColorTheme).toHaveBeenCalledWith(preset);
  });

  it("resetTheme restores light preset", async () => {
    const { result } = renderHook(() => useTheme());

    await act(async () => {
      await result.current.resetTheme();
    });

    expect(mockSetColorTheme).toHaveBeenCalledWith(themePresets.light);
  });

  it("themePresets.light matches defaultOptionValue.colorTheme", () => {
    expect(themePresets.light).toEqual(defaultOptionValue.colorTheme);
  });
});
