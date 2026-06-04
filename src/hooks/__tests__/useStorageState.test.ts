import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useStorageState } from "../useStorageState";

vi.mock("@/utils/storage", () => ({
  default: {
    sync: { get: vi.fn(), set: vi.fn() },
    local: { get: vi.fn(), set: vi.fn() }
  }
}));

import storage from "@/utils/storage";

const mockSyncGet = vi.mocked(storage.sync.get);
const mockSyncSet = vi.mocked(storage.sync.set);
const mockLocalGet = vi.mocked(storage.local.get);
const mockLocalSet = vi.mocked(storage.local.set);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useStorageState", () => {
  it("returns defaultValue and isLoaded false initially", () => {
    mockSyncGet.mockResolvedValue(undefined);
    const { result } = renderHook(() => useStorageState("key", "default"));

    expect(result.current.value).toBe("default");
    expect(result.current.isLoaded).toBe(false);
  });

  it("loads value from storage and sets isLoaded true", async () => {
    mockSyncGet.mockResolvedValue("stored");
    const { result } = renderHook(() => useStorageState("key", "default"));

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
    expect(result.current.value).toBe("stored");
  });

  it("keeps defaultValue when storage returns null", async () => {
    mockSyncGet.mockResolvedValue(null);
    const { result } = renderHook(() => useStorageState("key", "default"));

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
    expect(result.current.value).toBe("default");
  });

  it("keeps defaultValue when storage returns undefined", async () => {
    mockSyncGet.mockResolvedValue(undefined);
    const { result } = renderHook(() => useStorageState("key", "default"));

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
    expect(result.current.value).toBe("default");
  });

  it("saves value to storage via setValue", async () => {
    mockSyncGet.mockResolvedValue(undefined);
    mockSyncSet.mockResolvedValue(undefined);
    const { result } = renderHook(() => useStorageState("key", "default"));

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      await result.current.setValue("newValue");
    });

    expect(result.current.value).toBe("newValue");
    expect(mockSyncSet).toHaveBeenCalledWith({ key: "newValue" });
  });

  it("supports function updater in setValue", async () => {
    mockSyncGet.mockResolvedValue(10);
    mockSyncSet.mockResolvedValue(undefined);
    const { result } = renderHook(() => useStorageState("count", 0));

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      await result.current.setValue((prev: number) => prev + 5);
    });

    expect(result.current.value).toBe(15);
    expect(mockSyncSet).toHaveBeenCalledWith({ count: 15 });
  });

  it("migrates from sync to local when local area has no data", async () => {
    mockLocalGet.mockResolvedValue(null);
    mockSyncGet.mockResolvedValue("syncData");
    mockLocalSet.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useStorageState("key", "default", "local")
    );

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.value).toBe("syncData");
    expect(mockLocalSet).toHaveBeenCalledWith({ key: "syncData" });
  });

  it("uses local data directly when available", async () => {
    mockLocalGet.mockResolvedValue("localData");
    const { result } = renderHook(() =>
      useStorageState("key", "default", "local")
    );

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.value).toBe("localData");
    expect(mockSyncGet).not.toHaveBeenCalled();
  });

  it("saves to local area when area is local", async () => {
    mockLocalGet.mockResolvedValue(undefined);
    mockLocalSet.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useStorageState("key", "default", "local")
    );

    await vi.waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      await result.current.setValue("localValue");
    });

    expect(mockLocalSet).toHaveBeenCalledWith({ key: "localValue" });
  });
});
