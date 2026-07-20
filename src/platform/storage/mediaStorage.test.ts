import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  deleteMediaBatch,
  deleteMediaByPrefix,
  listMediaKeys,
  saveMedia,
} from './mediaStorage';

type FakeRequest<TResult> = {
  error: DOMException | null;
  onerror: ((event: Event) => void) | null;
  onsuccess: ((event: Event) => void) | null;
  result: TResult;
};

type FakeOpenRequest = FakeRequest<IDBDatabase> & {
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null;
};

type FakeTransaction = {
  error: DOMException | null;
  oncomplete: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  objectStore: () => IDBObjectStore;
};

function createSuccessfulRequest<TResult>(
  result: TResult,
): FakeRequest<TResult> {
  const request: FakeRequest<TResult> = {
    error: null,
    onerror: null,
    onsuccess: null,
    result,
  };

  queueMicrotask(() => request.onsuccess?.(new Event('success')));
  return request;
}

function createFakeIndexedDB(): IDBFactory {
  const media = new Map<IDBValidKey, Blob>();

  function createTransaction(): IDBTransaction {
    let isCompletionScheduled = false;
    const transaction: FakeTransaction = {
      error: null,
      oncomplete: null,
      onerror: null,
      objectStore: () => objectStore,
    };

    function scheduleCompletion(): void {
      if (isCompletionScheduled) {
        return;
      }

      isCompletionScheduled = true;
      queueMicrotask(() => transaction.oncomplete?.(new Event('complete')));
    }

    const objectStore = {
      delete: (key: IDBValidKey): IDBRequest<undefined> => {
        media.delete(key);
        scheduleCompletion();
        return createSuccessfulRequest(
          undefined,
        ) as unknown as IDBRequest<undefined>;
      },
      getAllKeys: (): IDBRequest<IDBValidKey[]> =>
        createSuccessfulRequest([...media.keys()]) as unknown as IDBRequest<
          IDBValidKey[]
        >,
      put: (value: Blob, key?: IDBValidKey): IDBRequest<IDBValidKey> => {
        if (key === undefined) {
          throw new Error('A media key is required.');
        }

        media.set(key, value);
        scheduleCompletion();
        return createSuccessfulRequest(
          key,
        ) as unknown as IDBRequest<IDBValidKey>;
      },
    } as unknown as IDBObjectStore;

    return transaction as unknown as IDBTransaction;
  }

  const database = {
    close: vi.fn(),
    createObjectStore: vi.fn(() => ({}) as IDBObjectStore),
    onclose: null,
    onversionchange: null,
    transaction: vi.fn(() => createTransaction()),
  } as unknown as IDBDatabase;

  return {
    open: vi.fn(() => {
      const request: FakeOpenRequest = {
        error: null,
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
        result: database,
      };

      queueMicrotask(() => {
        request.onupgradeneeded?.(
          new Event('upgradeneeded') as IDBVersionChangeEvent,
        );
        request.onsuccess?.(new Event('success'));
      });
      return request as unknown as IDBOpenDBRequest;
    }),
  } as unknown as IDBFactory;
}

beforeAll((): void => {
  vi.stubGlobal('indexedDB', createFakeIndexedDB());
});

afterAll((): void => {
  vi.unstubAllGlobals();
});

describe('media storage collections', () => {
  it('lists namespaced keys and deletes batches while revoking active URLs', async () => {
    let nextUrl = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      () => `blob:media-${(nextUrl += 1)}`,
    );
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);

    await saveMedia('backgroundMedia', new Blob(['background']));
    await saveMedia('overlayImage:kept', new Blob(['kept']));
    await saveMedia('overlayImage:discarded', new Blob(['discarded']));

    expect(await listMediaKeys('overlayImage:')).toEqual([
      'overlayImage:kept',
      'overlayImage:discarded',
    ]);

    await deleteMediaBatch([
      'overlayImage:discarded',
      'overlayImage:discarded',
    ]);

    expect(await listMediaKeys()).toEqual([
      'backgroundMedia',
      'overlayImage:kept',
    ]);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:media-3');

    await deleteMediaByPrefix('overlayImage:');

    expect(await listMediaKeys('overlayImage:')).toEqual([]);
    expect(await listMediaKeys()).toEqual(['backgroundMedia']);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:media-2');
  });
});
