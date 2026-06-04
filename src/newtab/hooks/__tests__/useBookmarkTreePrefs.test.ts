import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useBookmarkTreePrefs } from "../useBookmarkTreePrefs";

type BookmarkTreePrefs = {
  rootPath: string[];
  siblingOrder: Record<string, string[]>;
};

let mockValue: BookmarkTreePrefs = { rootPath: [], siblingOrder: {} };
const mockSetValue =
  vi.fn<
    (
      v: BookmarkTreePrefs | ((prev: BookmarkTreePrefs) => BookmarkTreePrefs)
    ) => Promise<void>
  >();

vi.mock("@/hooks/useStorageState", () => ({
  useStorageState: () => ({
    value: mockValue,
    setValue: mockSetValue,
    isLoaded: true
  })
}));

beforeEach(() => {
  mockValue = { rootPath: [], siblingOrder: {} };
  mockSetValue.mockImplementation(async arg => {
    if (typeof arg === "function") {
      mockValue = arg(mockValue);
    } else {
      mockValue = arg;
    }
  });
});

describe("useBookmarkTreePrefs", () => {
  it("returns default values", () => {
    const { result } = renderHook(() => useBookmarkTreePrefs());

    expect(result.current.rootPath).toEqual([]);
    expect(result.current.siblingOrder).toEqual({});
  });

  it("setRootPath updates rootPath", async () => {
    const { result } = renderHook(() => useBookmarkTreePrefs());

    await act(async () => {
      await result.current.setRootPath(["Bookmarks", "Work"]);
    });

    expect(mockSetValue).toHaveBeenCalled();
    const updater = mockSetValue.mock.calls[0][0] as (
      prev: BookmarkTreePrefs
    ) => BookmarkTreePrefs;
    const updated = updater({ rootPath: [], siblingOrder: {} });
    expect(updated.rootPath).toEqual(["Bookmarks", "Work"]);
  });

  it("updateSiblingOrder updates order for a specific parentKey", async () => {
    const { result } = renderHook(() => useBookmarkTreePrefs());

    await act(async () => {
      await result.current.updateSiblingOrder("parent1", ["C", "A", "B"]);
    });

    expect(mockSetValue).toHaveBeenCalled();
    const updater = mockSetValue.mock.calls[0][0] as (
      prev: BookmarkTreePrefs
    ) => BookmarkTreePrefs;
    const updated = updater({ rootPath: [], siblingOrder: {} });
    expect(updated.siblingOrder).toEqual({ parent1: ["C", "A", "B"] });
  });

  it("updateSiblingOrder preserves other parent keys", async () => {
    mockValue = { rootPath: [], siblingOrder: { parent1: ["A", "B"] } };
    const { result } = renderHook(() => useBookmarkTreePrefs());

    await act(async () => {
      await result.current.updateSiblingOrder("parent2", ["X", "Y"]);
    });

    const updater = mockSetValue.mock.calls[0][0] as (
      prev: BookmarkTreePrefs
    ) => BookmarkTreePrefs;
    const updated = updater(mockValue);
    expect(updated.siblingOrder).toEqual({
      parent1: ["A", "B"],
      parent2: ["X", "Y"]
    });
  });
});
