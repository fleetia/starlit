import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useGroupPreferences } from "../useGroupPreferences";
import type { Bookmark, GroupPreference } from "../../types";

let mockStorageValue: GroupPreference[] = [];
const mockSetValue =
  vi.fn<
    (
      v: GroupPreference[] | ((prev: GroupPreference[]) => GroupPreference[])
    ) => Promise<void>
  >();

vi.mock("@/hooks/useStorageState", () => ({
  useStorageState: () => ({
    value: mockStorageValue,
    setValue: mockSetValue,
    isLoaded: true
  })
}));

beforeEach(() => {
  mockStorageValue = [];
  mockSetValue.mockClear();
});

const makeBookmarks = (...titles: string[]): Bookmark[] =>
  titles.map(title => ({
    title,
    list: [{ id: "1", title: "item", url: "https://example.com" }]
  }));

describe("useGroupPreferences", () => {
  it("returns all bookmarks as visible when no preferences saved", () => {
    const bookmarks = makeBookmarks("A", "B", "C");
    const { result } = renderHook(() => useGroupPreferences(bookmarks));

    expect(result.current.groupPreferences).toEqual([
      { key: "A", visible: true },
      { key: "B", visible: true },
      { key: "C", visible: true }
    ]);
  });

  it("reconciles saved preferences with bookmarks", () => {
    mockStorageValue = [
      { key: "A", visible: false },
      { key: "B", visible: true }
    ];
    const bookmarks = makeBookmarks("A", "B", "C");
    const { result } = renderHook(() => useGroupPreferences(bookmarks));

    expect(result.current.groupPreferences).toEqual([
      { key: "A", visible: false },
      { key: "B", visible: true },
      { key: "C", visible: true }
    ]);
  });

  it("orderedBookmarks only includes visible bookmarks", () => {
    mockStorageValue = [
      { key: "A", visible: false },
      { key: "B", visible: true }
    ];
    const bookmarks = makeBookmarks("A", "B", "C");
    const { result } = renderHook(() => useGroupPreferences(bookmarks));

    expect(result.current.orderedBookmarks).toHaveLength(2);
    expect(result.current.orderedBookmarks.map(b => b.title)).toEqual([
      "B",
      "C"
    ]);
  });

  it("toggleVisibility toggles a bookmark's visibility", async () => {
    const bookmarks = makeBookmarks("A", "B");
    const { result } = renderHook(() => useGroupPreferences(bookmarks));

    await act(async () => {
      await result.current.toggleVisibility("A");
    });

    expect(mockSetValue).toHaveBeenCalledWith([
      { key: "A", visible: false },
      { key: "B", visible: true }
    ]);
  });

  it("handles empty bookmarks array", () => {
    const { result } = renderHook(() => useGroupPreferences([]));

    expect(result.current.groupPreferences).toEqual([]);
    expect(result.current.orderedBookmarks).toEqual([]);
  });

  it("uses route-based keys when bookmark has route", () => {
    const bookmarks: Bookmark[] = [
      { title: "A", route: ["root", "sub"], list: [] }
    ];
    const { result } = renderHook(() => useGroupPreferences(bookmarks));

    expect(result.current.groupPreferences[0].key).toBe("root/sub");
  });
});
