import {
  openStarlitDatabase,
  SCENE_STORE_NAME,
  SHARED_ASSET_STORE_NAME,
} from './mediaStorage';

export type IndexedRecordStoreName =
  | typeof SCENE_STORE_NAME
  | typeof SHARED_ASSET_STORE_NAME;

export type SharedAssetRecord = {
  blob: Blob;
  createdAt: string;
  id: string;
  mediaType: string;
  name: string;
  size: number;
};

export async function putIndexedRecord(
  storeName: IndexedRecordStoreName,
  key: string,
  value: unknown,
): Promise<void> {
  const database = await openStarlitDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function getIndexedRecord(
  storeName: IndexedRecordStoreName,
  key: string,
): Promise<unknown> {
  const database = await openStarlitDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listIndexedRecords(
  storeName: IndexedRecordStoreName,
): Promise<Array<readonly [string, unknown]>> {
  const database = await openStarlitDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const keysRequest = store.getAllKeys();
    const valuesRequest = store.getAll();

    transaction.oncomplete = () => {
      const entries = keysRequest.result.flatMap((key, index) => {
        const value = valuesRequest.result[index];
        return typeof key === 'string' && value !== undefined
          ? [[key, value] as const]
          : [];
      });
      resolve(entries);
    };
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function deleteIndexedRecord(
  storeName: IndexedRecordStoreName,
  key: string,
): Promise<void> {
  const database = await openStarlitDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function replaceIndexedRecordSet(
  storeName: IndexedRecordStoreName,
  keyPrefix: string,
  entries: readonly (readonly [string, unknown])[],
): Promise<void> {
  const database = await openStarlitDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const keysRequest = store.getAllKeys();

    keysRequest.onsuccess = () => {
      keysRequest.result.forEach((key) => {
        if (typeof key === 'string' && key.startsWith(keyPrefix)) {
          store.delete(key);
        }
      });
      entries.forEach(([key, value]) => store.put(value, key));
    };
    keysRequest.onerror = () => reject(keysRequest.error);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function saveSharedAsset(asset: SharedAssetRecord): Promise<void> {
  await putIndexedRecord(SHARED_ASSET_STORE_NAME, asset.id, asset);
}

export async function loadSharedAsset(
  assetId: string,
): Promise<SharedAssetRecord | null> {
  const value = await getIndexedRecord(SHARED_ASSET_STORE_NAME, assetId);
  if (
    typeof value !== 'object' ||
    value === null ||
    !('blob' in value) ||
    !(value.blob instanceof Blob)
  ) {
    return null;
  }

  return value as SharedAssetRecord;
}
