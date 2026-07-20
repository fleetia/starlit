import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStorageState } from '../useStorageState';

function decodeString(rawValue: unknown, fallback: string): string {
  return typeof rawValue === 'string' ? rawValue : fallback;
}

function decodeNumber(rawValue: unknown, fallback: number): number {
  return typeof rawValue === 'number' && Number.isFinite(rawValue)
    ? rawValue
    : fallback;
}

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

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('useStorageState', () => {
  it('loads a saved value and reports readiness', async () => {
    storageMocks.syncGet.mockResolvedValue('stored');

    const { result } = renderHook(() =>
      useStorageState('key', 'default', decodeString),
    );

    expect(result.current.value).toBe('default');
    expect(result.current.isLoaded).toBe(false);

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.value).toBe('stored');
  });

  it('keeps the default when storage has no value', async () => {
    storageMocks.syncGet.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useStorageState('key', 'default', decodeString),
    );

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.value).toBe('default');
  });

  it('migrates an existing sync value into local storage', async () => {
    storageMocks.localGet.mockResolvedValue(undefined);
    storageMocks.syncGet.mockResolvedValue('legacy-sync-value');

    const { result } = renderHook(() =>
      useStorageState('key', 'default', decodeString, 'local'),
    );

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.value).toBe('legacy-sync-value');
    expect(storageMocks.localSet).toHaveBeenCalledWith({
      key: 'legacy-sync-value',
    });
  });

  it('updates from the latest value and persists to the selected area', async () => {
    storageMocks.localGet.mockResolvedValue(10);

    const { result } = renderHook(() =>
      useStorageState('count', 0, decodeNumber, 'local'),
    );

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async (): Promise<void> => {
      await result.current.setValue((previous) => previous + 5);
    });

    expect(result.current.value).toBe(15);
    expect(storageMocks.localSet).toHaveBeenCalledWith({ count: 15 });
    expect(storageMocks.syncSet).not.toHaveBeenCalled();
  });

  it('keeps the previous value when persistence fails', async () => {
    storageMocks.syncGet.mockResolvedValue('stored');
    storageMocks.syncSet.mockRejectedValueOnce(new Error('write failed'));
    const { result } = renderHook(() =>
      useStorageState('key', 'default', decodeString),
    );
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await expect(
      act(async (): Promise<void> => {
        await result.current.setValue('next');
      }),
    ).rejects.toThrow('write failed');

    expect(result.current.value).toBe('stored');
  });

  it('serializes functional updates before persisting them', async () => {
    let persistedValue = 0;
    let releaseFirstWrite: (() => void) | undefined;
    storageMocks.localGet.mockImplementation(async () => persistedValue);
    storageMocks.localSet.mockImplementation(async (items) => {
      const nextValue = items.count;
      if (nextValue === 1) {
        await new Promise<void>((resolve) => {
          releaseFirstWrite = resolve;
        });
      }
      if (typeof nextValue === 'number') {
        persistedValue = nextValue;
      }
    });
    const { result } = renderHook(() =>
      useStorageState('count', 0, decodeNumber, 'local'),
    );
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let updates: readonly [Promise<void>, Promise<void>] | undefined;
    act((): void => {
      updates = [
        result.current.setValue((previous) => previous + 1),
        result.current.setValue((previous) => previous + 1),
      ];
    });
    if (!updates) {
      throw new Error('Expected queued storage updates.');
    }
    const queuedUpdates = updates;

    await waitFor(() =>
      expect(releaseFirstWrite).toEqual(expect.any(Function)),
    );
    expect(storageMocks.localSet).toHaveBeenCalledOnce();
    releaseFirstWrite?.();

    await act(async (): Promise<void> => {
      await Promise.all(queuedUpdates);
    });

    expect(persistedValue).toBe(2);
    expect(result.current.value).toBe(2);
    expect(storageMocks.localSet).toHaveBeenCalledTimes(2);
  });

  it('merges concurrent functional updates from separate hook sessions', async () => {
    let pendingLock = Promise.resolve();
    const requestLock = vi.fn(
      <Result>(
        _name: string,
        _options: LockOptions,
        callback: () => Promise<Result>,
      ): Promise<Result> => {
        const operation = pendingLock.then(callback);
        pendingLock = operation.then(
          () => undefined,
          () => undefined,
        );
        return operation;
      },
    );
    vi.stubGlobal('navigator', { locks: { request: requestLock } });
    let persistedValue = 0;
    let releaseFirstWrite: (() => void) | undefined;
    let shouldHoldWrite = true;
    storageMocks.localGet.mockImplementation(async () => persistedValue);
    storageMocks.localSet.mockImplementation(async (items) => {
      if (shouldHoldWrite) {
        shouldHoldWrite = false;
        await new Promise<void>((resolve) => {
          releaseFirstWrite = resolve;
        });
      }
      if (typeof items.count === 'number') {
        persistedValue = items.count;
      }
    });
    const firstSession = renderHook(() =>
      useStorageState('count', 0, decodeNumber, 'local'),
    );
    const secondSession = renderHook(() =>
      useStorageState('count', 0, decodeNumber, 'local'),
    );
    await waitFor(() =>
      expect(firstSession.result.current.isLoaded).toBe(true),
    );
    await waitFor(() =>
      expect(secondSession.result.current.isLoaded).toBe(true),
    );
    requestLock.mockClear();

    let updates: readonly [Promise<void>, Promise<void>] | undefined;
    act((): void => {
      updates = [
        firstSession.result.current.setValue((previous) => previous + 1),
        secondSession.result.current.setValue((previous) => previous + 1),
      ];
    });
    if (!updates) {
      throw new Error('Expected concurrent storage updates.');
    }
    const concurrentUpdates = updates;

    await waitFor(() =>
      expect(releaseFirstWrite).toEqual(expect.any(Function)),
    );
    releaseFirstWrite?.();
    await act(async (): Promise<void> => {
      await Promise.all(concurrentUpdates);
    });

    expect(requestLock).toHaveBeenCalledTimes(2);
    expect(persistedValue).toBe(2);
  });

  it('applies storage changes from another extension context', async () => {
    const { result } = renderHook(() =>
      useStorageState('key', 'default', decodeString),
    );
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const listener = vi.mocked(chrome.storage.onChanged.addListener).mock
      .calls[0]?.[0];
    if (!listener) {
      throw new Error('Expected a storage change listener.');
    }

    act((): void => {
      listener({ key: { newValue: 'external' } }, 'sync');
    });
    expect(result.current.value).toBe('external');

    act((): void => {
      listener({ key: { newValue: undefined } }, 'sync');
    });
    expect(result.current.value).toBe('default');
  });

  it('reports load failures and finishes with the default value', async () => {
    const error = new Error('read failed');
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    storageMocks.syncGet.mockRejectedValueOnce(error);

    const { result } = renderHook(() =>
      useStorageState('key', 'default', decodeString),
    );

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.value).toBe('default');
    expect(reportError).toHaveBeenCalledWith(error);
  });

  it('decodes invalid initial, external, and functional update values', async () => {
    storageMocks.localGet.mockResolvedValueOnce('invalid');
    const { result } = renderHook(() =>
      useStorageState('count', 3, decodeNumber, 'local'),
    );

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.value).toBe(3);

    const listener = vi.mocked(chrome.storage.onChanged.addListener).mock
      .calls[0]?.[0];
    if (!listener) {
      throw new Error('Expected a storage change listener.');
    }
    act((): void => {
      listener({ count: { newValue: 'invalid' } }, 'local');
    });
    expect(result.current.value).toBe(3);

    storageMocks.localGet.mockResolvedValueOnce('invalid');
    await act(async (): Promise<void> => {
      await result.current.setValue((previous) => previous + 1);
    });

    expect(storageMocks.localSet).toHaveBeenLastCalledWith({ count: 4 });
    expect(result.current.value).toBe(4);
  });

  it('decodes a legacy sync value before migrating it to local storage', async () => {
    storageMocks.localGet.mockResolvedValue(undefined);
    storageMocks.syncGet.mockResolvedValue('invalid');

    const { result } = renderHook(() =>
      useStorageState('count', 7, decodeNumber, 'local'),
    );

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.value).toBe(7);
    expect(storageMocks.localSet).toHaveBeenCalledWith({ count: 7 });
  });

  it('does not let local migration overwrite a queued local write', async () => {
    let localValue: unknown;
    let resolveSyncRead: (value: unknown) => void = () => undefined;
    const syncRead = new Promise<unknown>((resolve) => {
      resolveSyncRead = resolve;
    });
    storageMocks.localGet.mockImplementation(async () => localValue);
    storageMocks.syncGet.mockReturnValue(syncRead);
    storageMocks.localSet.mockImplementation(async (items) => {
      localValue = items.key;
    });
    const { result } = renderHook(() =>
      useStorageState('key', 'default', decodeString, 'local'),
    );
    await waitFor(() => expect(storageMocks.syncGet).toHaveBeenCalledOnce());

    let write: Promise<void> | undefined;
    act((): void => {
      write = result.current.setValue('fresh');
    });
    resolveSyncRead('legacy');
    if (!write) {
      throw new Error('Expected a queued local write.');
    }
    await act(async (): Promise<void> => {
      await write;
    });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(storageMocks.localSet.mock.calls).toEqual([
      [{ key: 'legacy' }],
      [{ key: 'fresh' }],
    ]);
    expect(localValue).toBe('fresh');
    expect(result.current.value).toBe('fresh');
  });

  it('does not let a late initial read overwrite a successful write', async () => {
    let resolveInitialRead: (value: unknown) => void = () => undefined;
    const initialRead = new Promise<unknown>((resolve) => {
      resolveInitialRead = resolve;
    });
    storageMocks.syncGet.mockReturnValue(initialRead);
    const { result } = renderHook(() =>
      useStorageState('key', 'default', decodeString),
    );

    await act(async (): Promise<void> => {
      await result.current.setValue('fresh');
    });
    resolveInitialRead('stale');
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.value).toBe('fresh');
  });

  it('does not overwrite a storage change observed during a write', async () => {
    storageMocks.syncGet.mockResolvedValue('stored');
    const { result } = renderHook(() =>
      useStorageState('key', 'default', decodeString),
    );
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const listener = vi.mocked(chrome.storage.onChanged.addListener).mock
      .calls[0]?.[0];
    if (!listener) {
      throw new Error('Expected a storage change listener.');
    }
    storageMocks.syncSet.mockImplementationOnce(async () => {
      act((): void => {
        listener({ key: { newValue: 'external' } }, 'sync');
      });
    });

    await act(async (): Promise<void> => {
      await result.current.setValue('write-result');
    });

    expect(result.current.value).toBe('external');
  });

  it('does not reload when an inline decoder identity changes', async () => {
    storageMocks.syncGet.mockResolvedValue('stored');
    const { result, rerender } = renderHook(() =>
      useStorageState('key', 'default', (rawValue, fallback) =>
        typeof rawValue === 'string' ? rawValue : fallback,
      ),
    );
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    rerender();
    await Promise.resolve();

    expect(storageMocks.syncGet).toHaveBeenCalledOnce();
  });

  it('does not apply a pending write after the storage identity changes', async () => {
    let resolveOldWrite: () => void = () => undefined;
    const oldWrite = new Promise<void>((resolve) => {
      resolveOldWrite = resolve;
    });
    storageMocks.syncGet.mockImplementation(async (key) =>
      key === 'old' ? 'old-value' : 'new-value',
    );
    storageMocks.syncSet.mockImplementation(async (items) => {
      if (Object.hasOwn(items, 'old')) {
        await oldWrite;
      }
    });
    const { result, rerender } = renderHook(
      ({ storageKey }) => useStorageState(storageKey, 'default', decodeString),
      { initialProps: { storageKey: 'old' } },
    );
    await waitFor(() => expect(result.current.value).toBe('old-value'));

    let write: Promise<void> | undefined;
    act((): void => {
      write = result.current.setValue('old-write');
    });
    await waitFor(() => expect(storageMocks.syncSet).toHaveBeenCalledOnce());
    rerender({ storageKey: 'new' });
    await waitFor(() => expect(result.current.value).toBe('new-value'));
    resolveOldWrite();
    if (!write) {
      throw new Error('Expected a pending old-key write.');
    }
    await act(async (): Promise<void> => {
      await write;
    });

    expect(result.current.value).toBe('new-value');
  });
});
