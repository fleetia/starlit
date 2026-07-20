import {
  decodeFaviconMap,
  type FaviconMap,
} from '../../bookmarks/storageDecoders';
import { withExclusiveLock } from '../locks/exclusiveLock';
import storage from '../storage/storage';

const FAVICON_SIZE = 48;
const FAVICON_MUTATION_LOCK_NAME = 'starlit-favicon-mutation';
const STORAGE_KEY = 'favicons';

function withFaviconMutationLock<Result>(
  operation: () => Promise<Result>,
): Promise<Result> {
  return withExclusiveLock(FAVICON_MUTATION_LOCK_NAME, operation);
}

function toDataUrl(faviconUrl: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = FAVICON_SIZE;
          canvas.height = FAVICON_SIZE;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(faviconUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, FAVICON_SIZE, FAVICON_SIZE);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(faviconUrl);
        }
      };
      img.onerror = () => resolve(faviconUrl);
      img.src = faviconUrl;
    } catch {
      resolve(faviconUrl);
    }
  });
}

export async function loadFavicons(): Promise<FaviconMap> {
  return decodeFaviconMap(await storage.local.get(STORAGE_KEY), {});
}

export async function cacheFavicons(
  items: { id: string; favicon?: string }[],
): Promise<FaviconMap> {
  const existing = await loadFavicons();
  const newEntries = items.filter(
    (item): item is { id: string; favicon: string } =>
      Boolean(item.favicon) && !existing[item.id],
  );
  if (newEntries.length === 0) {
    return withFaviconMutationLock(loadFavicons);
  }

  const MAX_CONCURRENT = 5;
  const results: { id: string; dataUrl: string }[] = [];
  for (let i = 0; i < newEntries.length; i += MAX_CONCURRENT) {
    const chunk = newEntries.slice(i, i + MAX_CONCURRENT);
    const chunkResults = await Promise.all(
      chunk.map(async (item) => ({
        id: item.id,
        dataUrl: await toDataUrl(item.favicon),
      })),
    );
    results.push(...chunkResults);
  }

  return withFaviconMutationLock(async (): Promise<FaviconMap> => {
    const current = await loadFavicons();
    const updated = { ...current };
    let hasChanges = false;
    for (const { id, dataUrl } of results) {
      if (!updated[id]) {
        updated[id] = dataUrl;
        hasChanges = true;
      }
    }
    if (hasChanges) {
      await storage.local.set({ [STORAGE_KEY]: updated });
    }
    return updated;
  });
}

export async function saveFavicon(
  id: string,
  dataUrl: string,
): Promise<FaviconMap> {
  return withFaviconMutationLock(async (): Promise<FaviconMap> => {
    const existing = await loadFavicons();
    const updated = { ...existing, [id]: dataUrl };
    await storage.local.set({ [STORAGE_KEY]: updated });
    return updated;
  });
}

export async function removeFavicon(id: string): Promise<FaviconMap> {
  return withFaviconMutationLock(async (): Promise<FaviconMap> => {
    const existing = await loadFavicons();
    const updated = { ...existing };
    delete updated[id];
    await storage.local.set({ [STORAGE_KEY]: updated });
    return updated;
  });
}

export function getFavicon(
  favicons: FaviconMap,
  id: string,
  fallback?: string,
): string {
  return favicons[id] ?? fallback ?? '';
}
