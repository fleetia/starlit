export type BackgroundMedia = {
  type: 'image' | 'video';
  source: 'url' | 'file';
  url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isBackgroundMedia(value: unknown): value is BackgroundMedia {
  return (
    isRecord(value) &&
    (value.type === 'image' || value.type === 'video') &&
    (value.source === 'url' || value.source === 'file') &&
    typeof value.url === 'string'
  );
}

export function decodeBackgroundMedia(
  value: unknown,
  fallback: BackgroundMedia | null,
): BackgroundMedia | null {
  return value === null || isBackgroundMedia(value) ? value : fallback;
}
