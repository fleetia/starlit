const DB_NAME = 'starlit';
const LEGACY_DB_NAME = 'lotuspad';
const STORE_NAME = 'media';
const DB_VERSION = 1;

let cachedDB: IDBDatabase | null = null;
const activeBlobUrls = new Map<string, string>();
const mediaVersions = new Map<string, number>();
const pendingLoads = new Map<string, Promise<string | null>>();

function getMediaVersion(key: string): number {
  return mediaVersions.get(key) ?? 0;
}

function advanceMediaVersion(key: string): void {
  mediaVersions.set(key, getMediaVersion(key) + 1);
}

function releaseActiveBlobUrl(key: string): void {
  const url = activeBlobUrls.get(key);
  if (!url) {
    return;
  }

  URL.revokeObjectURL(url);
  activeBlobUrls.delete(key);
}

function replaceActiveBlobUrl(key: string, blob: Blob): string {
  releaseActiveBlobUrl(key);

  const url = URL.createObjectURL(blob);
  activeBlobUrls.set(key, url);
  return url;
}

function openDB(): Promise<IDBDatabase> {
  if (cachedDB) return Promise.resolve(cachedDB);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      const database = request.result;
      cachedDB = database;
      database.onversionchange = () => {
        if (cachedDB === database) {
          cachedDB = null;
        }
        database.close();
      };
      database.onclose = () => {
        if (cachedDB === database) {
          cachedDB = null;
        }
      };
      resolve(database);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveMedia(key: string, blob: Blob): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, key);
    tx.oncomplete = () => {
      advanceMediaVersion(key);
      resolve(replaceActiveBlobUrl(key, blob));
    };
    tx.onerror = () => reject(tx.error);
  });
}

export function loadMedia(key: string): Promise<string | null> {
  const activeUrl = activeBlobUrls.get(key);
  if (activeUrl) {
    return Promise.resolve(activeUrl);
  }

  const pendingLoad = pendingLoads.get(key);
  if (pendingLoad) {
    return pendingLoad;
  }

  const version = getMediaVersion(key);
  const request = openDB().then(
    (db) =>
      new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const mediaRequest = tx.objectStore(STORE_NAME).get(key);
        mediaRequest.onsuccess = () => {
          if (getMediaVersion(key) !== version) {
            resolve(activeBlobUrls.get(key) ?? null);
            return;
          }

          const currentUrl = activeBlobUrls.get(key);
          if (currentUrl) {
            resolve(currentUrl);
            return;
          }

          const blob = mediaRequest.result as Blob | undefined;
          if (blob) {
            resolve(replaceActiveBlobUrl(key, blob));
          } else {
            resolve(null);
          }
        };
        mediaRequest.onerror = () => reject(mediaRequest.error);
      }),
  );

  const trackedRequest = request.finally(() => {
    if (pendingLoads.get(key) === trackedRequest) {
      pendingLoads.delete(key);
    }
  });
  pendingLoads.set(key, trackedRequest);
  return trackedRequest;
}

export async function loadMediaBlob(key: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => {
      const blob = request.result as Blob | undefined;
      resolve(blob ?? null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function listMediaKeys(prefix = ''): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAllKeys();
    request.onsuccess = () => {
      resolve(
        request.result.filter(
          (key): key is string =>
            typeof key === 'string' && key.startsWith(prefix),
        ),
      );
    };
    request.onerror = () => reject(request.error);
  });
}

async function openExistingDatabase(name: string): Promise<IDBDatabase | null> {
  if (indexedDB.databases) {
    const databases = await indexedDB.databases();
    if (!databases.some((database) => database.name === name)) {
      return null;
    }
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    let wasCreated = false;

    request.onupgradeneeded = () => {
      wasCreated = true;
      request.transaction?.abort();
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      if (wasCreated) {
        indexedDB.deleteDatabase(name);
        resolve(null);
        return;
      }

      reject(request.error);
    };
  });
}

export async function loadLegacyMediaBlob(key: string): Promise<Blob | null> {
  const database = await openExistingDatabase(LEGACY_DB_NAME);
  if (!database || !database.objectStoreNames.contains(STORE_NAME)) {
    database?.close();
    return null;
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);

    request.onsuccess = () => {
      const blob = request.result as Blob | undefined;
      database.close();
      resolve(blob ?? null);
    };
    request.onerror = () => {
      database.close();
      reject(request.error);
    };
  });
}

export async function deleteMediaBatch(keys: readonly string[]): Promise<void> {
  const uniqueKeys = [...new Set(keys)];
  if (uniqueKeys.length === 0) {
    return;
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    uniqueKeys.forEach((key) => store.delete(key));
    tx.oncomplete = () => {
      uniqueKeys.forEach((key) => {
        advanceMediaVersion(key);
        releaseActiveBlobUrl(key);
      });
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteMediaByPrefix(prefix: string): Promise<void> {
  const keys = await listMediaKeys(prefix);
  await deleteMediaBatch(keys);
}

export async function deleteMedia(key: string): Promise<void> {
  await deleteMediaBatch([key]);
}

export function revokeMedia(key: string): void {
  releaseActiveBlobUrl(key);
}
