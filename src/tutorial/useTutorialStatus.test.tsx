import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTutorialStatus } from './useTutorialStatus';

const storageMocks = vi.hoisted(() => ({
  get: vi.fn<(key: string) => Promise<unknown>>(),
  set: vi.fn<(items: Record<string, unknown>) => Promise<void>>(),
}));

vi.mock('../platform/storage/storage', () => ({
  default: {
    local: {
      get: storageMocks.get,
      set: storageMocks.set,
    },
  },
}));

type StorageChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string,
) => void;

let storageChangeListener: StorageChangeListener | null = null;

beforeEach((): void => {
  storageMocks.get.mockResolvedValue(undefined);
  storageMocks.set.mockResolvedValue(undefined);
  storageChangeListener = null;
  Object.defineProperty(chrome.storage, 'onChanged', {
    configurable: true,
    value: {
      addListener: vi.fn((listener: StorageChangeListener): void => {
        storageChangeListener = listener;
      }),
      removeListener: vi.fn(),
    },
  });
});

describe('useTutorialStatus', () => {
  it('treats a missing or invalid marker as an existing profile', async () => {
    storageMocks.get.mockResolvedValue('invalid');

    const { result } = renderHook(() => useTutorialStatus());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.status).toBeNull();
  });

  it('keeps a storage change that arrives before the initial read finishes', async () => {
    let resolveRead: (value: unknown) => void = () => undefined;
    storageMocks.get.mockReturnValue(
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
    );

    const { result } = renderHook(() => useTutorialStatus());

    act((): void => {
      storageChangeListener?.(
        { tutorialStatus: { newValue: 'pending' } },
        'local',
      );
    });
    resolveRead(undefined);

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.status).toBe('pending');
  });

  it('persists completion before updating the visible status', async () => {
    storageMocks.get.mockResolvedValue('pending');
    const { result } = renderHook(() => useTutorialStatus());
    await waitFor(() => expect(result.current.status).toBe('pending'));

    await act(async (): Promise<void> => {
      await result.current.complete();
    });

    expect(storageMocks.set).toHaveBeenCalledWith({
      tutorialStatus: 'completed',
    });
    expect(result.current.status).toBe('completed');
  });
});
