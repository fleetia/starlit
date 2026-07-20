import { afterEach, describe, expect, it, vi } from 'vitest';

import { withExclusiveLock } from './exclusiveLock';

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('withExclusiveLock', () => {
  it('serializes operations with the same name without Web Locks', async () => {
    vi.stubGlobal('navigator', {});
    const events: string[] = [];
    let releaseFirst: (() => void) | undefined;

    const first = withExclusiveLock(
      'shared',
      () =>
        new Promise<void>((resolve) => {
          events.push('first:start');
          releaseFirst = (): void => {
            events.push('first:end');
            resolve();
          };
        }),
    );
    const second = withExclusiveLock('shared', async (): Promise<void> => {
      events.push('second:start');
    });

    await vi.waitFor(() => expect(events).toEqual(['first:start']));
    releaseFirst?.();
    await Promise.all([first, second]);

    expect(events).toEqual(['first:start', 'first:end', 'second:start']);
  });

  it('does not block operations with different names', async () => {
    vi.stubGlobal('navigator', {});
    const events: string[] = [];
    let releaseFirst: (() => void) | undefined;

    const first = withExclusiveLock(
      'first',
      () =>
        new Promise<void>((resolve) => {
          events.push('first:start');
          releaseFirst = resolve;
        }),
    );
    const second = withExclusiveLock('second', async (): Promise<void> => {
      events.push('second:start');
    });

    await vi.waitFor(() =>
      expect(events).toEqual(['first:start', 'second:start']),
    );
    releaseFirst?.();
    await Promise.all([first, second]);
  });

  it('uses an exclusive Web Lock when available', async () => {
    const request = vi.fn(
      async <Result>(
        _name: string,
        _options: LockOptions,
        operation: () => Promise<Result>,
      ): Promise<Result> => operation(),
    );
    vi.stubGlobal('navigator', { locks: { request } });

    await expect(
      withExclusiveLock('shared', async (): Promise<string> => 'done'),
    ).resolves.toBe('done');

    expect(request).toHaveBeenCalledWith(
      'shared',
      { mode: 'exclusive' },
      expect.any(Function),
    );
  });
});
