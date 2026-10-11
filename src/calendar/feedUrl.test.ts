import { describe, expect, it } from 'vitest';

import { getCalendarFeedCacheKey, normalizeCalendarFeedUrl } from './feedUrl';

describe('Calendar feed URLs', () => {
  it('normalizes webcal and derives the exact host permission', () => {
    expect(
      normalizeCalendarFeedUrl(' webcal://calendar.example.com/private.ics#x '),
    ).toEqual({
      originPattern: 'https://calendar.example.com/*',
      url: 'https://calendar.example.com/private.ics',
    });
  });

  it('rejects insecure and credential-bearing URLs', () => {
    expect(
      normalizeCalendarFeedUrl('http://calendar.example.com/a.ics'),
    ).toBeNull();
    expect(
      normalizeCalendarFeedUrl('https://user:secret@example.com/a.ics'),
    ).toBeNull();
  });

  it('uses a stable collision-resistant cache key without retaining the URL', async () => {
    const url = 'https://calendar.example.com/private-token.ics';
    const cacheKey = await getCalendarFeedCacheKey(url);

    expect(cacheKey).toBe(await getCalendarFeedCacheKey(url));
    expect(cacheKey).not.toContain('private-token');
    expect(cacheKey).toHaveLength(64);
    expect(cacheKey).not.toBe(
      await getCalendarFeedCacheKey('https://calendar.example.com/other.ics'),
    );
  });
});
