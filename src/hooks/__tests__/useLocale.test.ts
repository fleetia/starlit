import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useLocale } from "../useLocale";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useLocale", () => {
  it("returns default locale 'ko' and isLoaded false initially", () => {
    (chrome.storage.sync.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_key: string, cb: (result: Record<string, unknown>) => void) => cb({})
    );
    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe("ko");
  });

  it("loads saved locale from chrome.storage.sync", async () => {
    (chrome.storage.sync.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_key: string, cb: (result: Record<string, unknown>) => void) =>
        cb({ locale: "en" })
    );

    const { result } = renderHook(() => useLocale());

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
    expect(result.current.locale).toBe("en");
  });

  it("loads 'ja' locale", async () => {
    (chrome.storage.sync.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_key: string, cb: (result: Record<string, unknown>) => void) =>
        cb({ locale: "ja" })
    );

    const { result } = renderHook(() => useLocale());

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
    expect(result.current.locale).toBe("ja");
  });

  it("ignores invalid locale values", async () => {
    (chrome.storage.sync.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_key: string, cb: (result: Record<string, unknown>) => void) =>
        cb({ locale: "fr" })
    );

    const { result } = renderHook(() => useLocale());

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
    expect(result.current.locale).toBe("ko");
  });

  it("sets isLoaded true even without chrome.storage", async () => {
    const original = globalThis.chrome;
    (globalThis as Record<string, unknown>).chrome = undefined;

    const { result } = renderHook(() => useLocale());

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
    expect(result.current.locale).toBe("ko");

    (globalThis as Record<string, unknown>).chrome = original;
  });

  it("updates locale and saves to chrome.storage", async () => {
    (chrome.storage.sync.get as ReturnType<typeof vi.fn>).mockImplementation(
      (_key: string, cb: (result: Record<string, unknown>) => void) => cb({})
    );

    const { result } = renderHook(() => useLocale());

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    act(() => {
      result.current.setLocale("en");
    });

    expect(result.current.locale).toBe("en");
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ locale: "en" });
  });
});
