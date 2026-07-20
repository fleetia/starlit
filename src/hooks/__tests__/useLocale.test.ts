import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLocale } from '../useLocale';

type StorageGetMock = ReturnType<
  typeof vi.fn<
    (key: string, callback: (result: Record<string, unknown>) => void) => void
  >
>;

function getStorageGetMock(): StorageGetMock {
  return chrome.storage.sync.get as unknown as StorageGetMock;
}

beforeEach((): void => {
  getStorageGetMock().mockImplementation((_key, callback): void =>
    callback({}),
  );
});

describe('useLocale', () => {
  it('loads a supported saved locale', async () => {
    getStorageGetMock().mockImplementation((_key, callback): void =>
      callback({ locale: 'en' }),
    );

    const { result } = renderHook(() => useLocale());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.locale).toBe('en');
  });

  it('falls back to Korean for an unsupported saved locale', async () => {
    getStorageGetMock().mockImplementation((_key, callback): void =>
      callback({ locale: 'fr' }),
    );

    const { result } = renderHook(() => useLocale());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.locale).toBe('ko');
  });

  it('uses a fresh-install locale written after the initial storage read', async () => {
    let handleStorageChange:
      | ((
          changes: Record<string, chrome.storage.StorageChange>,
          areaName: chrome.storage.AreaName,
        ) => void)
      | undefined;
    vi.mocked(chrome.storage.onChanged.addListener).mockImplementation(
      (listener): void => {
        handleStorageChange = listener;
      },
    );
    const { result } = renderHook(() => useLocale());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act((): void => {
      handleStorageChange?.(
        { locale: { newValue: 'ja', oldValue: undefined } },
        'sync',
      );
    });

    expect(result.current.locale).toBe('ja');
  });

  it('is immediately ready when Chrome storage is unavailable', () => {
    const originalChrome = globalThis.chrome;
    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: undefined,
      writable: true,
    });

    try {
      const { result, unmount } = renderHook(() => useLocale());

      expect(result.current.isLoaded).toBe(true);
      expect(result.current.locale).toBe('ko');
      unmount();
    } finally {
      Object.defineProperty(globalThis, 'chrome', {
        configurable: true,
        value: originalChrome,
        writable: true,
      });
    }
  });

  it('updates and persists the selected locale', async () => {
    const { result } = renderHook(() => useLocale());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async (): Promise<void> => {
      await result.current.setLocale('ja');
    });

    expect(result.current.locale).toBe('ja');
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ locale: 'ja' });
  });
});
