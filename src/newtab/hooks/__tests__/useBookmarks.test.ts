import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useBookmarks } from "../useBookmarks";
import type { Bookmark } from "../../types";

let mockBookmarks: Bookmark[] = [];
const mockSetBookmarks =
  vi.fn<
    (v: Bookmark[] | ((prev: Bookmark[]) => Bookmark[])) => Promise<void>
  >();

vi.mock("@/hooks/useStorageState", () => ({
  useStorageState: (key: string) => {
    if (key === "bookmarks") {
      return {
        value: mockBookmarks,
        setValue: mockSetBookmarks,
        isLoaded: true
      };
    }
    return { value: null, setValue: vi.fn(), isLoaded: true };
  }
}));

vi.mock("@/utils/favicon", () => ({
  loadFavicons: vi.fn().mockResolvedValue({}),
  cacheFavicons: vi.fn().mockResolvedValue(undefined),
  saveFavicon: vi.fn().mockResolvedValue(undefined),
  getFavicon: vi.fn(
    (_favicons: Record<string, string>, _id: string, fallback?: string) =>
      fallback ?? ""
  )
}));

vi.mock("@/utils/bookmarks", () => ({
  default: {
    getTree: vi.fn().mockRejectedValue(new Error("not available"))
  },
  convertTree: vi.fn().mockReturnValue([]),
  flattenItems: vi.fn().mockReturnValue([])
}));

vi.mock("@fleetia/components", () => ({
  setCSSVariables: vi.fn()
}));

vi.mock("@/utils/flattenObject", () => ({
  flattenObject: () => ({})
}));

beforeEach(() => {
  mockBookmarks = [
    {
      title: "Work",
      list: [
        { id: "1", title: "GitHub", url: "https://github.com" },
        { id: "2", title: "Docs", url: "https://docs.example.com" }
      ],
      children: [
        {
          title: "Sub",
          list: [{ id: "3", title: "SubItem", url: "https://sub.example.com" }]
        }
      ]
    }
  ];
  mockSetBookmarks.mockImplementation(async v => {
    if (typeof v === "function") {
      v(mockBookmarks);
    }
  });
});

describe("useBookmarks", () => {
  it("returns bookmarks", () => {
    const { result } = renderHook(() => useBookmarks());

    expect(result.current.bookmarks).toHaveLength(1);
  });

  it("handleDeleteBookmark removes a bookmark from list", async () => {
    const { result } = renderHook(() => useBookmarks());

    await act(async () => {
      await result.current.handleDeleteBookmark("1");
    });

    expect(mockSetBookmarks).toHaveBeenCalled();
    const updaterFn = mockSetBookmarks.mock.calls[0][0] as (
      prev: Bookmark[]
    ) => Bookmark[];
    const updated = updaterFn(mockBookmarks);
    expect(updated[0].list).toHaveLength(1);
    expect(updated[0].list![0].id).toBe("2");
  });

  it("handleDeleteBookmark removes from nested children", async () => {
    const { result } = renderHook(() => useBookmarks());

    await act(async () => {
      await result.current.handleDeleteBookmark("3");
    });

    expect(mockSetBookmarks).toHaveBeenCalled();
    const updaterFn = mockSetBookmarks.mock.calls[0][0] as (
      prev: Bookmark[]
    ) => Bookmark[];
    const updated = updaterFn(mockBookmarks);
    expect(updated[0].children).toHaveLength(0);
  });
});
