import { afterEach, describe, expect, it, vi } from 'vitest';

import { withOverlayMediaMutationLock } from './mediaMutationLock';

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('withOverlayMediaMutationLock', () => {
  it('runs directly when Web Locks are unavailable', async () => {
    vi.stubGlobal('navigator', {});

    await expect(
      withOverlayMediaMutationLock(async (): Promise<string> => 'done'),
    ).resolves.toBe('done');
  });

  it('serializes overlapping media operations through one exclusive lock', async () => {
    let pending = Promise.resolve();
    const request = vi.fn(
      <Result>(
        _name: string,
        _options: LockOptions,
        callback: () => Promise<Result>,
      ): Promise<Result> => {
        const operation = pending.then(callback);
        pending = operation.then(
          () => undefined,
          () => undefined,
        );
        return operation;
      },
    );
    vi.stubGlobal('navigator', { locks: { request } });
    const events: string[] = [];
    let releaseFirst: (() => void) | undefined;

    const first = withOverlayMediaMutationLock(
      () =>
        new Promise<void>((resolve) => {
          events.push('first:start');
          releaseFirst = (): void => {
            events.push('first:end');
            resolve();
          };
        }),
    );
    const second = withOverlayMediaMutationLock(async (): Promise<void> => {
      events.push('second:start');
    });

    await vi.waitFor(() => expect(events).toEqual(['first:start']));
    releaseFirst?.();
    await Promise.all([first, second]);

    expect(events).toEqual(['first:start', 'first:end', 'second:start']);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0]?.[0]).toBe(request.mock.calls[1]?.[0]);
  });
});
