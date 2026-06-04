import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useSettings } from "../useSettings";
import type { Settings } from "../../types";
import { defaultOptionValue } from "../../defaultOptionValue";

let mockSettings: Settings = { ...defaultOptionValue.settings };
const mockSetSettings = vi.fn<(v: Settings) => Promise<void>>();

vi.mock("@/hooks/useStorageState", () => ({
  useStorageState: () => ({
    value: mockSettings,
    setValue: mockSetSettings,
    isLoaded: true
  })
}));

beforeEach(() => {
  mockSettings = { ...defaultOptionValue.settings };
  mockSetSettings.mockResolvedValue(undefined);
});

describe("useSettings", () => {
  it("returns default settings", () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toEqual(defaultOptionValue.settings);
  });

  it("updateSettings calls setValue with new settings", async () => {
    const newSettings: Settings = {
      isFolderEnabled: false,
      isVisibleOnce: true,
      isOpenInNewTab: true,
      isExpandView: true
    };

    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSettings(newSettings);
    });

    expect(mockSetSettings).toHaveBeenCalledWith(newSettings);
  });
});
