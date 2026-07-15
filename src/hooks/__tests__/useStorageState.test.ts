import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useStorageState } from '../useStorageState';

const storageMocks = vi.hoisted(() => ({
  localGet: vi.fn<(key: string) => Promise<unknown>>(),
  localSet: vi.fn<(items: Record<string, unknown>) => Promise<void>>(),
  syncGet: vi.fn<(key: string) => Promise<unknown>>(),
  syncSet: vi.fn<(items: Record<string, unknown>) => Promise<void>>(),
}));

vi.mock('../../platform/storage/storage', () => ({
  default: {
    local: { get: storageMocks.localGet, set: storageMocks.localSet },
    sync: { get: storageMocks.syncGet, set: storageMocks.syncSet },
  },
}));

beforeEach((): void => {
  storageMocks.localGet.mockResolvedValue(undefined);
  storageMocks.localSet.mockResolvedValue(undefined);
  storageMocks.syncGet.mockResolvedValue(undefined);
  storageMocks.syncSet.mockResolvedValue(undefined);
});

describe('useStorageState', () => {
  it('loads a saved value and reports readiness', async () => {
    storageMocks.syncGet.mockResolvedValue('stored');

    const { result } = renderHook(() => useStorageState('key', 'default'));

    expect(result.current.value).toBe('default');
    expect(result.current.isLoaded).toBe(false);

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.value).toBe('stored');
  });

  it('keeps the default when storage has no value', async () => {
    storageMocks.syncGet.mockResolvedValue(null);

    const { result } = renderHook(() => useStorageState('key', 'default'));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.value).toBe('default');
  });

  it('migrates an existing sync value into local storage', async () => {
    storageMocks.localGet.mockResolvedValue(undefined);
    storageMocks.syncGet.mockResolvedValue('legacy-sync-value');

    const { result } = renderHook(() =>
      useStorageState('key', 'default', 'local'),
    );

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.value).toBe('legacy-sync-value');
    expect(storageMocks.localSet).toHaveBeenCalledWith({
      key: 'legacy-sync-value',
    });
  });

  it('updates from the latest value and persists to the selected area', async () => {
    storageMocks.localGet.mockResolvedValue(10);

    const { result } = renderHook(() => useStorageState('count', 0, 'local'));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async (): Promise<void> => {
      await result.current.setValue((previous) => previous + 5);
    });

    expect(result.current.value).toBe(15);
    expect(storageMocks.localSet).toHaveBeenCalledWith({ count: 15 });
    expect(storageMocks.syncSet).not.toHaveBeenCalled();
  });
});
