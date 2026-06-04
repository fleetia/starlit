import storage from "@/utils/storage";

const FAVICON_SIZE = 48;
const STORAGE_KEY = "favicons";

type FaviconMap = Record<string, string>;

function toDataUrl(faviconUrl: string): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = FAVICON_SIZE;
      canvas.height = FAVICON_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(faviconUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, FAVICON_SIZE, FAVICON_SIZE);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(faviconUrl);
    img.src = faviconUrl;
  });
}

export async function loadFavicons(): Promise<FaviconMap> {
  return ((await storage.local.get(STORAGE_KEY)) as FaviconMap) ?? {};
}

export async function cacheFavicons(
  items: { id: string; favicon?: string }[]
): Promise<void> {
  const existing = await loadFavicons();
  const newEntries = items.filter(item => item.favicon && !existing[item.id]);
  if (newEntries.length === 0) return;

  const MAX_CONCURRENT = 5;
  const results: { id: string; dataUrl: string }[] = [];
  for (let i = 0; i < newEntries.length; i += MAX_CONCURRENT) {
    const chunk = newEntries.slice(i, i + MAX_CONCURRENT);
    const chunkResults = await Promise.all(
      chunk.map(async item => ({
        id: item.id,
        dataUrl: await toDataUrl(item.favicon!)
      }))
    );
    results.push(...chunkResults);
  }

  const updated = { ...existing };
  for (const { id, dataUrl } of results) {
    updated[id] = dataUrl;
  }
  await storage.local.set({ [STORAGE_KEY]: updated });
}

export async function saveFavicon(id: string, dataUrl: string): Promise<void> {
  const existing = await loadFavicons();
  existing[id] = dataUrl;
  await storage.local.set({ [STORAGE_KEY]: existing });
}

export async function removeFavicon(id: string): Promise<void> {
  const existing = await loadFavicons();
  delete existing[id];
  await storage.local.set({ [STORAGE_KEY]: existing });
}

export function getFavicon(
  favicons: FaviconMap,
  id: string,
  fallback?: string
): string {
  return favicons[id] ?? fallback ?? "";
}
