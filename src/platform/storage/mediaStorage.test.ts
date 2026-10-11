import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  deleteLegacyMedia,
  deleteMediaBatch,
  deleteMediaByPrefix,
  loadLegacyMediaBlob,
  loadMediaBlob,
  listMediaKeys,
  MEDIA_STORE_NAME,
  saveMedia,
  saveMediaBlob,
  SCENE_STORE_NAME,
  SHARED_ASSET_STORE_NAME,
  STARLIT_DB_NAME,
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

type FakeIndexedDBState = {
  media: Map<IDBValidKey, Blob>;
  storeNames: Set<string>;
};

function createFakeIndexedDB(): {
  factory: IDBFactory;
  state: FakeIndexedDBState;
} {
  const state: FakeIndexedDBState = {
    media: new Map([
      ['legacy-media', new Blob(['legacy'], { type: 'image/png' })],
    ]),
    storeNames: new Set([MEDIA_STORE_NAME]),
  };

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
        state.media.delete(key);
        scheduleCompletion();
        return createSuccessfulRequest(
          undefined,
        ) as unknown as IDBRequest<undefined>;
      },
      get: (key: IDBValidKey): IDBRequest<Blob | undefined> =>
        createSuccessfulRequest(state.media.get(key)) as unknown as IDBRequest<
          Blob | undefined
        >,
      getAllKeys: (): IDBRequest<IDBValidKey[]> =>
        createSuccessfulRequest([
          ...state.media.keys(),
        ]) as unknown as IDBRequest<IDBValidKey[]>,
      put: (value: Blob, key?: IDBValidKey): IDBRequest<IDBValidKey> => {
        if (key === undefined) {
          throw new Error('A media key is required.');
        }

        state.media.set(key, value);
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
    createObjectStore: vi.fn((name: string) => {
      state.storeNames.add(name);
      return {} as IDBObjectStore;
    }),
    objectStoreNames: {
      contains: (name: string): boolean => state.storeNames.has(name),
    } as DOMStringList,
    onclose: null,
    onversionchange: null,
    transaction: vi.fn(() => createTransaction()),
  } as unknown as IDBDatabase;

  const factory = {
    databases: vi.fn(async () => [
      { name: 'lotuspad', version: 1 } as IDBDatabaseInfo,
    ]),
    open: vi.fn((name: string) => {
      const request: FakeOpenRequest = {
        error: null,
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
        result: database,
      };

      queueMicrotask(() => {
        if (name === STARLIT_DB_NAME) {
          request.onupgradeneeded?.(
            new Event('upgradeneeded') as IDBVersionChangeEvent,
          );
        }
        request.onsuccess?.(new Event('success'));
      });
      return request as unknown as IDBOpenDBRequest;
    }),
  } as unknown as IDBFactory;

  return { factory, state };
}

let fakeIndexedDB: ReturnType<typeof createFakeIndexedDB>;

beforeAll((): void => {
  fakeIndexedDB = createFakeIndexedDB();
  vi.stubGlobal('indexedDB', fakeIndexedDB.factory);
});

afterAll((): void => {
  vi.unstubAllGlobals();
});

describe('media storage collections', () => {
  it('adds Scene stores without replacing legacy media during upgrade', async () => {
    const legacyMedia = await loadMediaBlob('legacy-media');

    expect(fakeIndexedDB.state.storeNames).toEqual(
      new Set([MEDIA_STORE_NAME, SCENE_STORE_NAME, SHARED_ASSET_STORE_NAME]),
    );
    expect(await legacyMedia?.text()).toBe('legacy');

    await deleteMediaBatch(['legacy-media']);
  });

  it('deletes a migrated background from the legacy database', async () => {
    fakeIndexedDB.state.media.set(
      'backgroundMedia',
      new Blob(['legacy-background']),
    );

    expect(await (await loadLegacyMediaBlob('backgroundMedia'))?.text()).toBe(
      'legacy-background',
    );

    await deleteLegacyMedia('backgroundMedia');

    expect(await loadLegacyMediaBlob('backgroundMedia')).toBeNull();
  });

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

  it('writes raw migration media without creating an object URL', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');

    await saveMediaBlob('migration-media', new Blob(['migration']));

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(await (await loadMediaBlob('migration-media'))?.text()).toBe(
      'migration',
    );
    await deleteMediaBatch(['migration-media']);
  });
});
