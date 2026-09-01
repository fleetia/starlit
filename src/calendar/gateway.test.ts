import { describe, expect, it, vi } from 'vitest';

import { createCalendarGateway } from './gateway';
import type { CalendarGatewayDependencies, CalendarStoragePort } from './types';

const FEED = `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//Starlit Test//EN\r
BEGIN:VEVENT\r
UID:meeting@example.com\r
DTSTAMP:20260801T000000Z\r
DTSTART:20260901T090000Z\r
DTEND:20260901T100000Z\r
SUMMARY:Meeting\r
END:VEVENT\r
END:VCALENDAR\r
`;

function createStorage(): CalendarStoragePort {
  const values: Record<string, unknown> = {};
  return {
    get: async (key) => ({ [key]: values[key] }),
    remove: async (keys) => {
      (Array.isArray(keys) ? keys : [keys]).forEach(
        (key) => delete values[key],
      );
    },
    set: async (items) => {
      Object.assign(values, items);
    },
  };
}

function createDependencies(isGranted = true): CalendarGatewayDependencies & {
  contains: ReturnType<
    typeof vi.fn<CalendarGatewayDependencies['hostPermission']['contains']>
  >;
  fetch: ReturnType<typeof vi.fn<CalendarGatewayDependencies['fetch']>>;
} {
  const contains = vi.fn(async (): Promise<boolean> => isGranted);
  const fetch = vi.fn(async (): Promise<Response> => new Response(FEED));
  return {
    contains,
    fetch,
    hostPermission: {
      contains,
    },
    now: () => new Date('2026-09-01T00:00:00.000Z'),
    sessionStorage: createStorage(),
  };
}

describe('Calendar gateway', () => {
  it('requires the entered origin grant and fetches without credentials', async () => {
    const dependencies = createDependencies(false);
    const gateway = createCalendarGateway(dependencies);
    const feedUrl = 'https://calendar.example.com/private.ics';

    await expect(gateway.listEvents(feedUrl)).rejects.toMatchObject({
      code: 'permission-denied',
    });
    await expect(gateway.subscribe(feedUrl)).rejects.toMatchObject({
      code: 'permission-denied',
    });
    expect(dependencies.contains).toHaveBeenCalledWith(
      'https://calendar.example.com/*',
    );

    dependencies.contains.mockResolvedValue(true);
    await expect(gateway.subscribe(feedUrl)).resolves.toEqual({
      isConnected: true,
    });

    await expect(gateway.listEvents(feedUrl)).resolves.toMatchObject({
      events: [expect.objectContaining({ summary: 'Meeting' })],
      isFromCache: false,
    });
    expect(dependencies.fetch).toHaveBeenCalledWith(
      feedUrl,
      expect.objectContaining({ credentials: 'omit', method: 'GET' }),
    );
  });

  it('uses the session cache and bypasses it for an explicit refresh', async () => {
    const dependencies = createDependencies();
    const gateway = createCalendarGateway(dependencies);
    const feedUrl = 'https://calendar.example.com/private.ics';
    await gateway.subscribe(feedUrl);

    await gateway.listEvents(feedUrl);
    await expect(gateway.listEvents(feedUrl)).resolves.toMatchObject({
      isFromCache: true,
    });
    expect(dependencies.fetch).toHaveBeenCalledTimes(1);

    await gateway.listEvents(feedUrl, true);
    expect(dependencies.fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid and oversized feeds', async () => {
    const dependencies = createDependencies();
    const gateway = createCalendarGateway(dependencies);

    await expect(
      gateway.subscribe('http://example.com/feed.ics'),
    ).rejects.toMatchObject({
      code: 'invalid-request',
    });

    dependencies.fetch.mockResolvedValueOnce(
      new Response('', { headers: { 'content-length': '3000000' } }),
    );
    await gateway.subscribe('https://example.com/feed.ics');
    await expect(
      gateway.listEvents('https://example.com/feed.ics'),
    ).rejects.toMatchObject({ code: 'response-too-large' });
  });
});
