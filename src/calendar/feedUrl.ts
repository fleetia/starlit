export const MAX_CALENDAR_FEED_URL_LENGTH = 4_096;

export type CalendarFeedLocation = {
  originPattern: string;
  url: string;
};

export function normalizeCalendarFeedUrl(
  value: string,
): CalendarFeedLocation | null {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > MAX_CALENDAR_FEED_URL_LENGTH) {
    return null;
  }

  const candidate = /^webcal:/iu.test(trimmed)
    ? trimmed.replace(/^webcal:/iu, 'https:')
    : trimmed;

  try {
    const url = new URL(candidate);
    if (
      url.protocol !== 'https:' ||
      url.hostname === '' ||
      url.username !== '' ||
      url.password !== ''
    ) {
      return null;
    }

    url.hash = '';
    return {
      originPattern: `${url.origin}/*`,
      url: url.toString(),
    };
  } catch {
    return null;
  }
}

export function isCalendarFeedUrl(value: unknown): value is string {
  return typeof value === 'string' && normalizeCalendarFeedUrl(value) !== null;
}

export async function getCalendarFeedCacheKey(
  feedUrl: string,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(feedUrl),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
