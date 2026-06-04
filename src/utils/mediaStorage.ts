const DB_NAME = "starlit";
const STORE_NAME = "media";
const DB_VERSION = 1;

let cachedDB: IDBDatabase | null = null;
const activeBlobUrls = new Map<string, string>();

function openDB(): Promise<IDBDatabase> {
  if (cachedDB) return Promise.resolve(cachedDB);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      cachedDB = request.result;
      cachedDB.onclose = () => {
        cachedDB = null;
      };
      resolve(cachedDB);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveMedia(key: string, blob: Blob): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, key);
    tx.oncomplete = () => {
      const prev = activeBlobUrls.get(key);
      if (prev) URL.revokeObjectURL(prev);
      const url = URL.createObjectURL(blob);
      activeBlobUrls.set(key, url);
      resolve(url);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadMedia(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => {
      const blob = request.result as Blob | undefined;
      if (blob) {
        const prev = activeBlobUrls.get(key);
        if (prev) URL.revokeObjectURL(prev);
        const url = URL.createObjectURL(blob);
        activeBlobUrls.set(key, url);
        resolve(url);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function loadMediaBlob(key: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => {
      const blob = request.result as Blob | undefined;
      resolve(blob ?? null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMedia(key: string): Promise<void> {
  const prev = activeBlobUrls.get(key);
  if (prev) {
    URL.revokeObjectURL(prev);
    activeBlobUrls.delete(key);
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function revokeMedia(key: string): void {
  const url = activeBlobUrls.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    activeBlobUrls.delete(key);
  }
}
