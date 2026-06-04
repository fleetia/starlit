import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import {
  useBackgroundImage,
  type BackgroundMedia
} from "../useBackgroundImage";

let mockMeta: BackgroundMedia | null = null;
const mockSetMeta = vi.fn<(v: BackgroundMedia | null) => Promise<void>>();

vi.mock("@/hooks/useStorageState", () => ({
  useStorageState: () => ({
    value: mockMeta,
    setValue: mockSetMeta,
    isLoaded: true
  })
}));

const mockSetCSSVariable = vi.fn();
vi.mock("@fleetia/components", () => ({
  setCSSVariable: (...args: unknown[]) => mockSetCSSVariable(...args)
}));

vi.mock("@/utils/mediaStorage", () => ({
  saveMedia: vi.fn().mockResolvedValue("blob:mock-url"),
  loadMedia: vi.fn().mockResolvedValue(null),
  deleteMedia: vi.fn().mockResolvedValue(undefined)
}));

beforeEach(() => {
  mockMeta = null;
  mockSetMeta.mockResolvedValue(undefined);
  mockSetCSSVariable.mockClear();
});

describe("useBackgroundImage", () => {
  it("returns null meta by default", () => {
    const { result } = renderHook(() => useBackgroundImage());

    expect(result.current.meta).toBeNull();
    expect(result.current.blobUrl).toBe("");
    expect(result.current.isProcessing).toBe(false);
  });

  it("updateFromUrl sets image meta for image URLs", async () => {
    const { result } = renderHook(() => useBackgroundImage());

    await act(async () => {
      await result.current.updateFromUrl("https://example.com/bg.jpg");
    });

    expect(mockSetMeta).toHaveBeenCalledWith({
      type: "image",
      source: "url",
      url: "https://example.com/bg.jpg"
    });
  });

  it("updateFromUrl sets video meta for .mp4 URLs", async () => {
    const { result } = renderHook(() => useBackgroundImage());

    await act(async () => {
      await result.current.updateFromUrl("https://example.com/bg.mp4");
    });

    expect(mockSetMeta).toHaveBeenCalledWith({
      type: "video",
      source: "url",
      url: "https://example.com/bg.mp4"
    });
  });

  it("updateFromUrl sets video meta for .gif URLs", async () => {
    const { result } = renderHook(() => useBackgroundImage());

    await act(async () => {
      await result.current.updateFromUrl("https://example.com/anim.gif");
    });

    expect(mockSetMeta).toHaveBeenCalledWith({
      type: "video",
      source: "url",
      url: "https://example.com/anim.gif"
    });
  });

  it("updateFromUrl with empty string clears meta", async () => {
    const { result } = renderHook(() => useBackgroundImage());

    await act(async () => {
      await result.current.updateFromUrl("");
    });

    expect(mockSetMeta).toHaveBeenCalledWith(null);
    expect(mockSetCSSVariable).toHaveBeenCalledWith(
      "--background-image",
      "none"
    );
  });

  it("updateFromUrl sets CSS variable for image URLs", async () => {
    const { result } = renderHook(() => useBackgroundImage());

    await act(async () => {
      await result.current.updateFromUrl("https://example.com/bg.png");
    });

    expect(mockSetCSSVariable).toHaveBeenCalledWith(
      "--background-image",
      'url("https://example.com/bg.png")'
    );
  });

  it("updateFromUrl does not set CSS variable for video URLs", async () => {
    const { result } = renderHook(() => useBackgroundImage());

    await act(async () => {
      await result.current.updateFromUrl("https://example.com/bg.webm");
    });

    expect(mockSetCSSVariable).not.toHaveBeenCalledWith(
      "--background-image",
      expect.stringContaining("url(")
    );
  });

  it("clear resets meta and CSS variable", async () => {
    const { result } = renderHook(() => useBackgroundImage());

    await act(async () => {
      await result.current.clear();
    });

    expect(mockSetMeta).toHaveBeenCalledWith(null);
    expect(mockSetCSSVariable).toHaveBeenCalledWith(
      "--background-image",
      "none"
    );
  });
});
