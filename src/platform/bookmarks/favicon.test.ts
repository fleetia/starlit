import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
  get: vi.fn<(key: string) => Promise<unknown>>(),
  set: vi.fn<(items: Record<string, unknown>) => Promise<void>>(),
}));

vi.mock('../storage/storage', () => ({
  default: {
    local: storageMocks,
  },
}));

import {
  cacheFavicons,
  loadFavicons,
  removeFavicon,
  saveFavicon,
} from './favicon';

type TestImageEventHandler = ((event: Event) => void) | null;

function TestImage(): HTMLImageElement {
  const image = {
    crossOrigin: '',
    onerror: null as TestImageEventHandler,
    onload: null as TestImageEventHandler,
    set src(_value: string) {
      void Promise.resolve()
        .then(() => image.onload?.(new Event('load')))
        .catch(() => undefined);
    },
  };

  return image as unknown as HTMLImageElement;
}

let persistedFavicons: Record<string, string>;

beforeEach((): void => {
  vi.clearAllMocks();
  persistedFavicons = {};
  storageMocks.get.mockImplementation(
    async (): Promise<Record<string, string>> =>
      structuredClone(persistedFavicons),
  );
  storageMocks.set.mockImplementation(async (items): Promise<void> => {
    persistedFavicons = structuredClone(
      items.favicons as Record<string, string>,
    );
  });
  vi.stubGlobal('navigator', {});
});

afterEach((): void => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('favicon storage', () => {
  it('falls back to an empty map when stored favicons are invalid', async () => {
    storageMocks.get.mockResolvedValueOnce({
      invalid: 42,
      valid: 'data:image/png;base64,valid',
    });

    await expect(loadFavicons()).resolves.toEqual({});
  });

  it.each(['drawImage', 'toDataURL'] as const)(
    'falls back to the original URL when canvas %s throws',
    async (failurePoint) => {
      const originalUrl = 'https://example.com/favicon.png';
      const drawImage = vi.fn((): void => {
        if (failurePoint === 'drawImage') {
          throw new Error('canvas is tainted');
        }
      });
      const toDataURL = vi.fn((): string => {
        if (failurePoint === 'toDataURL') {
          throw new Error('canvas is tainted');
        }
        return 'data:image/png;base64,converted';
      });
      const canvas = {
        getContext: vi.fn(() => ({ drawImage })),
        height: 0,
        toDataURL,
        width: 0,
      } as unknown as HTMLCanvasElement;
      vi.stubGlobal('Image', TestImage);
      vi.spyOn(document, 'createElement').mockReturnValue(canvas);

      const committed = await cacheFavicons([
        { favicon: originalUrl, id: 'bookmark-1' },
      ]);

      expect(committed).toEqual({ 'bookmark-1': originalUrl });
      expect(persistedFavicons).toEqual({ 'bookmark-1': originalUrl });
    },
  );

  it('serializes concurrent mutations without Web Locks', async () => {
    persistedFavicons = {
      kept: 'data:image/png;base64,kept',
      removed: 'data:image/png;base64,removed',
    };

    const [, committed] = await Promise.all([
      saveFavicon('added', 'data:image/png;base64,added'),
      removeFavicon('removed'),
    ]);

    expect(committed).toEqual({
      added: 'data:image/png;base64,added',
      kept: 'data:image/png;base64,kept',
    });
    expect(persistedFavicons).toEqual(committed);
  });

  it('uses the same exclusive Web Lock for every whole-map mutation', async () => {
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

    await cacheFavicons([]);
    await saveFavicon('bookmark-1', 'data:image/png;base64,custom');
    await removeFavicon('bookmark-1');

    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls.map(([name]) => name)).toEqual([
      request.mock.calls[0]?.[0],
      request.mock.calls[0]?.[0],
      request.mock.calls[0]?.[0],
    ]);
    expect(request.mock.calls.map(([, options]) => options)).toEqual([
      { mode: 'exclusive' },
      { mode: 'exclusive' },
      { mode: 'exclusive' },
    ]);
  });
});
