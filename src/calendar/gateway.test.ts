import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CALENDAR_EVENT_CACHE_STORAGE_KEY } from './cache';
import { CALENDAR_LIST_STORAGE_KEY } from './calendarListStorage';
import { createCalendarGateway } from './gateway';
import { SELECTED_CALENDAR_IDS_STORAGE_KEY } from './selectionStorage';
import {
  GOOGLE_CALENDAR_READONLY_SCOPES,
  type CalendarFetchPort,
  type CalendarGatewayDependencies,
  type CalendarHostPermissionPort,
  type CalendarIdentityPort,
  type CalendarStoragePort,
} from './types';

type MemoryStorage = CalendarStoragePort & {
  remove: ReturnType<typeof vi.fn<CalendarStoragePort['remove']>>;
  values: Record<string, unknown>;
};

type GatewayHarness = {
  containsHostPermission: ReturnType<
    typeof vi.fn<CalendarHostPermissionPort['contains']>
  >;
  dependencies: CalendarGatewayDependencies;
  fetch: ReturnType<typeof vi.fn<CalendarFetchPort>>;
  getAuthToken: ReturnType<typeof vi.fn<CalendarIdentityPort['getAuthToken']>>;
  localStorage: MemoryStorage;
  removeHostPermission: ReturnType<
    typeof vi.fn<CalendarHostPermissionPort['remove']>
  >;
  removeCachedAuthToken: ReturnType<
    typeof vi.fn<CalendarIdentityPort['removeCachedAuthToken']>
  >;
  sessionStorage: MemoryStorage;
  setNow: (value: string) => void;
  requestHostPermission: ReturnType<
    typeof vi.fn<CalendarHostPermissionPort['request']>
  >;
};

function createMemoryStorage(
  initialValues: Record<string, unknown> = {},
): MemoryStorage {
  const values = { ...initialValues };
  const remove = vi.fn<CalendarStoragePort['remove']>(async (keys) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach((key) => delete values[key]);
  });

  return {
    get: async (key) => ({ [key]: values[key] }),
    remove,
    set: async (items) => {
      Object.assign(values, items);
    },
    values,
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function getCalendarIdFromEventsUrl(url: string): string | null {
  const match = /\/calendars\/([^/]+)\/events/u.exec(url);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function createHarness(): GatewayHarness {
  let now = new Date('2026-08-31T00:00:00.000Z');
  const fetch = vi.fn<CalendarFetchPort>();
  const getAuthToken = vi.fn<CalendarIdentityPort['getAuthToken']>(
    async () => ({
      grantedScopes: [...GOOGLE_CALENDAR_READONLY_SCOPES],
      token: 'token-1',
    }),
  );
  const removeCachedAuthToken = vi.fn<
    CalendarIdentityPort['removeCachedAuthToken']
  >(async () => undefined);
  const containsHostPermission = vi.fn<CalendarHostPermissionPort['contains']>(
    async () => true,
  );
  const removeHostPermission = vi.fn<CalendarHostPermissionPort['remove']>(
    async () => true,
  );
  const requestHostPermission = vi.fn<CalendarHostPermissionPort['request']>(
    async () => true,
  );
  const localStorage = createMemoryStorage();
  const sessionStorage = createMemoryStorage();

  return {
    containsHostPermission,
    dependencies: {
      fetch,
      hostPermission: {
        contains: containsHostPermission,
        remove: removeHostPermission,
        request: requestHostPermission,
      },
      identity: { getAuthToken, removeCachedAuthToken },
      localStorage,
      now: () => new Date(now),
      sessionStorage,
    },
    fetch,
    getAuthToken,
    localStorage,
    removeHostPermission,
    removeCachedAuthToken,
    sessionStorage,
    setNow: (value) => {
      now = new Date(value);
    },
    requestHostPermission,
  };
}

beforeEach((): void => {
  vi.clearAllMocks();
});

describe('Google Calendar gateway', () => {
  it('never starts interactive auth until connect is explicitly called', async () => {
    const harness = createHarness();
    harness.fetch.mockResolvedValue(jsonResponse({ items: [] }));
    const gateway = createCalendarGateway(harness.dependencies);

    expect(harness.getAuthToken).not.toHaveBeenCalled();

    await gateway.listCalendars();
    expect(harness.getAuthToken).toHaveBeenLastCalledWith({
      interactive: false,
      scopes: [...GOOGLE_CALENDAR_READONLY_SCOPES],
    });
    const listUrl = new URL(harness.fetch.mock.calls[0]?.[0] ?? '');
    expect(listUrl.searchParams.get('fields')).toBe(
      'items(backgroundColor,deleted,id,primary,summary,summaryOverride),nextPageToken',
    );
    expect(harness.requestHostPermission).not.toHaveBeenCalled();

    harness.containsHostPermission.mockResolvedValueOnce(false);
    await gateway.connect();
    expect(harness.getAuthToken).toHaveBeenLastCalledWith({
      interactive: true,
      scopes: [...GOOGLE_CALENDAR_READONLY_SCOPES],
    });
    expect(harness.requestHostPermission).toHaveBeenCalledOnce();
  });

  it('compensates a newly granted host permission when OAuth is denied', async () => {
    const harness = createHarness();
    harness.containsHostPermission.mockResolvedValue(false);
    harness.getAuthToken.mockRejectedValue(new Error('OAuth denied'));
    const gateway = createCalendarGateway(harness.dependencies);

    await expect(gateway.connect()).rejects.toMatchObject({
      code: 'permission-denied',
    });

    expect(harness.requestHostPermission).toHaveBeenCalledOnce();
    expect(harness.removeHostPermission).toHaveBeenCalledOnce();
  });

  it('removes the token and newly granted host permission when OAuth scopes are incomplete', async () => {
    const harness = createHarness();
    harness.containsHostPermission.mockResolvedValue(false);
    harness.getAuthToken.mockResolvedValue({
      grantedScopes: [GOOGLE_CALENDAR_READONLY_SCOPES[0]],
      token: 'partial-scope-token',
    });
    const gateway = createCalendarGateway(harness.dependencies);

    await expect(gateway.connect()).rejects.toMatchObject({
      code: 'permission-denied',
    });

    expect(harness.removeCachedAuthToken).toHaveBeenCalledWith({
      token: 'partial-scope-token',
    });
    expect(harness.removeHostPermission).toHaveBeenCalledOnce();
  });

  it('preserves a pre-existing host permission when OAuth is denied', async () => {
    const harness = createHarness();
    harness.getAuthToken.mockRejectedValue(new Error('OAuth denied'));
    const gateway = createCalendarGateway(harness.dependencies);

    await expect(gateway.connect()).rejects.toMatchObject({
      code: 'permission-denied',
    });

    expect(harness.requestHostPermission).not.toHaveBeenCalled();
    expect(harness.removeHostPermission).not.toHaveBeenCalled();
  });

  it('never prompts for a missing host permission during passive reads', async () => {
    const harness = createHarness();
    harness.containsHostPermission.mockResolvedValue(false);
    const gateway = createCalendarGateway(harness.dependencies);

    await expect(gateway.listCalendars()).rejects.toMatchObject({
      code: 'permission-denied',
    });

    expect(harness.requestHostPermission).not.toHaveBeenCalled();
    expect(harness.getAuthToken).not.toHaveBeenCalled();
    expect(harness.fetch).not.toHaveBeenCalled();
  });

  it('coalesces concurrent calendar list reads from multiple consumers', async () => {
    const harness = createHarness();
    harness.fetch.mockImplementation(async () =>
      jsonResponse({ items: [{ id: 'work', summary: 'Work' }] }),
    );
    const gateway = createCalendarGateway(harness.dependencies);

    const [first, second] = await Promise.all([
      gateway.listCalendars(),
      gateway.listCalendars(),
    ]);

    expect(first).toEqual([
      { color: null, id: 'work', isPrimary: false, name: 'Work' },
    ]);
    expect(second).toEqual(first);
    expect(harness.fetch).toHaveBeenCalledOnce();
    expect(harness.getAuthToken).toHaveBeenCalledOnce();
    expect(harness.localStorage.values[CALENDAR_LIST_STORAGE_KEY]).toEqual({
      calendars: [{ color: null, id: 'work', name: 'Work', primary: false }],
      schemaVersion: 1,
    });
  });

  it('keeps a successful calendar-list response when the local cache write fails', async () => {
    const harness = createHarness();
    harness.fetch.mockResolvedValue(
      jsonResponse({ items: [{ id: 'work', summary: 'Work' }] }),
    );
    harness.localStorage.set = async () => {
      throw new Error('Local storage unavailable');
    };
    const gateway = createCalendarGateway(harness.dependencies);

    await expect(gateway.listCalendars()).resolves.toEqual([
      { color: null, id: 'work', isPrimary: false, name: 'Work' },
    ]);
  });

  it('rejects a passive token that does not include both readonly scopes', async () => {
    const harness = createHarness();
    harness.getAuthToken.mockResolvedValue({
      grantedScopes: [GOOGLE_CALENDAR_READONLY_SCOPES[0]],
      token: 'partial-scope-token',
    });
    const gateway = createCalendarGateway(harness.dependencies);

    await expect(gateway.listCalendars()).rejects.toMatchObject({
      code: 'auth-required',
    });

    expect(harness.removeCachedAuthToken).toHaveBeenCalledWith({
      token: 'partial-scope-token',
    });
    expect(harness.fetch).not.toHaveBeenCalled();
  });

  it('merges multiple calendars in time order with concurrency limited to four', async () => {
    const harness = createHarness();
    const calendarIds = ['cal-e', 'cal-c', 'cal-a', 'cal-d', 'cal-b'];
    let activeEventRequests = 0;
    let maxActiveEventRequests = 0;
    let releaseEventRequests = (): void => undefined;
    const eventRequestBarrier = new Promise<void>((resolve) => {
      releaseEventRequests = resolve;
    });

    harness.fetch.mockImplementation(async (url) => {
      if (url.includes('/users/me/calendarList')) {
        return jsonResponse({
          items: calendarIds.map((id, index) => ({
            backgroundColor: index % 2 === 0 ? '#4285f4' : '#0f9d58',
            id,
            summary: id,
          })),
        });
      }

      const calendarId = getCalendarIdFromEventsUrl(url);
      if (!calendarId) {
        throw new Error('Unexpected Calendar URL');
      }

      activeEventRequests += 1;
      maxActiveEventRequests = Math.max(
        maxActiveEventRequests,
        activeEventRequests,
      );
      await eventRequestBarrier;
      activeEventRequests -= 1;
      const day = calendarId.charCodeAt(calendarId.length - 1) - 96;

      return jsonResponse({
        items: [
          {
            description: 'discard me',
            end: { dateTime: `2026-09-0${day}T11:00:00+09:00` },
            htmlLink: `https://calendar.google.com/event?eid=${calendarId}`,
            start: { dateTime: `2026-09-0${day}T10:00:00+09:00` },
            summary: calendarId,
          },
        ],
      });
    });
    const gateway = createCalendarGateway(harness.dependencies);
    const resultPromise = gateway.listEvents(calendarIds);

    await vi.waitFor(() => expect(maxActiveEventRequests).toBe(4));
    releaseEventRequests();
    const result = await resultPromise;

    expect(maxActiveEventRequests).toBe(4);
    expect(result.events.map((event) => event.summary)).toEqual([
      'cal-a',
      'cal-b',
      'cal-c',
      'cal-d',
      'cal-e',
    ]);
    expect(result.events[0]).toEqual({
      allDay: false,
      calendarColor: '#4285f4',
      end: '2026-09-01T11:00:00+09:00',
      htmlLink: 'https://calendar.google.com/event?eid=cal-a',
      start: '2026-09-01T10:00:00+09:00',
      summary: 'cal-a',
    });
    expect(result.events[0]).not.toHaveProperty('description');
    expect(result.failures).toEqual([]);

    const eventUrls = harness.fetch.mock.calls
      .map(([url]) => url)
      .filter((url) => url.includes('/events?'));
    expect(eventUrls).toHaveLength(calendarIds.length);
    eventUrls.forEach((url) => {
      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('timeMin')).toBe(
        '2026-08-31T00:00:00.000Z',
      );
      expect(parsedUrl.searchParams.get('timeMax')).toBe(
        '2026-09-07T00:00:00.000Z',
      );
      expect(parsedUrl.searchParams.get('maxResults')).toBe('50');
      expect(parsedUrl.searchParams.get('singleEvents')).toBe('true');
      expect(parsedUrl.searchParams.get('orderBy')).toBe('startTime');
      expect(parsedUrl.searchParams.get('fields')).toBe(
        'items(end,htmlLink,start,status,summary)',
      );
      expect(parsedUrl.search).not.toContain('description');
      expect(parsedUrl.search).not.toContain('attendees');
    });
  });

  it('coalesces equivalent concurrent event reads without rewriting selection storage', async () => {
    const harness = createHarness();
    harness.fetch.mockImplementation(async (url) => {
      if (url.includes('/users/me/calendarList')) {
        return jsonResponse({
          items: [
            { id: 'personal', summary: 'Personal' },
            { id: 'work', summary: 'Work' },
          ],
        });
      }

      return jsonResponse({ items: [] });
    });
    const gateway = createCalendarGateway(harness.dependencies);

    const [first, second] = await Promise.all([
      gateway.listEvents(['work', 'personal']),
      gateway.listEvents(['personal', 'work']),
    ]);

    expect(second).toEqual(first);
    expect(harness.fetch).toHaveBeenCalledTimes(3);
    expect(harness.getAuthToken).toHaveBeenCalledOnce();
    expect(harness.localStorage.values).not.toHaveProperty(
      SELECTED_CALENDAR_IDS_STORAGE_KEY,
    );
  });

  it('sorts all-day events before timed events on the same civil date across offsets', async () => {
    const harness = createHarness();
    harness.fetch.mockImplementation(async (url) => {
      if (url.includes('/users/me/calendarList')) {
        return jsonResponse({ items: [{ id: 'work', summary: 'Work' }] });
      }

      return jsonResponse({
        items: [
          {
            end: { dateTime: '2026-09-02T02:00:00+09:00' },
            start: { dateTime: '2026-09-02T01:00:00+09:00' },
            summary: 'East morning',
          },
          {
            end: { date: '2026-09-03' },
            start: { date: '2026-09-02' },
            summary: 'All day',
          },
          {
            end: { dateTime: '2026-09-02T02:00:00-08:00' },
            start: { dateTime: '2026-09-02T01:00:00-08:00' },
            summary: 'West morning',
          },
        ],
      });
    });
    const gateway = createCalendarGateway(harness.dependencies);

    const result = await gateway.listEvents(['work']);

    expect(result.events.map((event) => event.summary)).toEqual([
      'All day',
      'East morning',
      'West morning',
    ]);
  });

  it('keeps timed events chronological when offsets cross civil dates', async () => {
    const harness = createHarness();
    harness.fetch.mockImplementation(async (url) => {
      if (url.includes('/users/me/calendarList')) {
        return jsonResponse({ items: [{ id: 'work', summary: 'Work' }] });
      }

      return jsonResponse({
        items: [
          {
            end: { dateTime: '2026-09-03T01:30:00+14:00' },
            start: { dateTime: '2026-09-03T00:30:00+14:00' },
            summary: 'Earlier instant',
          },
          {
            end: { dateTime: '2026-09-03T00:30:00-10:00' },
            start: { dateTime: '2026-09-02T23:30:00-10:00' },
            summary: 'Later instant',
          },
        ],
      });
    });
    const gateway = createCalendarGateway(harness.dependencies);

    const result = await gateway.listEvents(['work']);

    expect(result.events.map((event) => event.summary)).toEqual([
      'Earlier instant',
      'Later instant',
    ]);
  });

  it('keeps successful calendars when another calendar fails', async () => {
    const harness = createHarness();
    harness.fetch.mockImplementation(async (url) => {
      if (url.includes('/users/me/calendarList')) {
        return jsonResponse({
          items: [
            { backgroundColor: '#4285f4', id: 'work', summary: 'Work' },
            { backgroundColor: '#0f9d58', id: 'private', summary: 'Private' },
          ],
        });
      }

      if (getCalendarIdFromEventsUrl(url) === 'private') {
        return jsonResponse({ error: 'forbidden' }, 403);
      }

      return jsonResponse({
        items: [
          {
            end: { date: '2026-09-02' },
            start: { date: '2026-09-01' },
            summary: 'All day',
          },
        ],
      });
    });
    const gateway = createCalendarGateway(harness.dependencies);

    const result = await gateway.listEvents(['work', 'private']);

    expect(result.events).toEqual([
      {
        allDay: true,
        calendarColor: '#4285f4',
        end: '2026-09-02',
        htmlLink: null,
        start: '2026-09-01',
        summary: 'All day',
      },
    ]);
    expect(result.failures).toEqual([
      { calendarId: 'private', reason: 'forbidden' },
    ]);
  });

  it('removes a rejected token and retries once without interaction after 401', async () => {
    const harness = createHarness();
    harness.getAuthToken
      .mockResolvedValueOnce({ token: 'stale-token' })
      .mockResolvedValueOnce({ token: 'fresh-token' });
    harness.fetch
      .mockResolvedValueOnce(jsonResponse({ error: 'unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    const gateway = createCalendarGateway(harness.dependencies);

    await expect(gateway.listCalendars()).resolves.toEqual([]);

    expect(harness.removeCachedAuthToken).toHaveBeenCalledOnce();
    expect(harness.removeCachedAuthToken).toHaveBeenCalledWith({
      token: 'stale-token',
    });
    expect(harness.getAuthToken).toHaveBeenCalledTimes(2);
    expect(harness.getAuthToken.mock.calls).toEqual([
      [
        {
          interactive: false,
          scopes: [...GOOGLE_CALENDAR_READONLY_SCOPES],
        },
      ],
      [
        {
          interactive: false,
          scopes: [...GOOGLE_CALENDAR_READONLY_SCOPES],
        },
      ],
    ]);
    expect(harness.fetch.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer stale-token' },
    });
    expect(harness.fetch.mock.calls[1]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer fresh-token' },
    });
  });

  it('shares one token refresh across concurrent 401 responses', async () => {
    const harness = createHarness();
    const calendarIds = ['cal-a', 'cal-b', 'cal-c', 'cal-d'];
    let staleEventRequestCount = 0;
    let releaseStaleRequests = (): void => undefined;
    const staleRequestBarrier = new Promise<void>((resolve) => {
      releaseStaleRequests = resolve;
    });
    harness.getAuthToken
      .mockResolvedValueOnce({ token: 'stale-token' })
      .mockResolvedValueOnce({ token: 'fresh-token' });
    harness.fetch.mockImplementation(async (url, init) => {
      if (url.includes('/users/me/calendarList')) {
        return jsonResponse({
          items: calendarIds.map((id) => ({ id, summary: id })),
        });
      }

      const authorization = new Headers(init.headers).get('Authorization');
      if (authorization === 'Bearer stale-token') {
        staleEventRequestCount += 1;
        await staleRequestBarrier;
        return jsonResponse({ error: 'unauthorized' }, 401);
      }

      return jsonResponse({ items: [] });
    });
    const gateway = createCalendarGateway(harness.dependencies);
    const resultPromise = gateway.listEvents(calendarIds);

    await vi.waitFor(() => expect(staleEventRequestCount).toBe(4));
    releaseStaleRequests();

    await expect(resultPromise).resolves.toMatchObject({
      events: [],
      failures: [],
    });
    expect(harness.removeCachedAuthToken).toHaveBeenCalledTimes(1);
    expect(harness.getAuthToken).toHaveBeenCalledTimes(2);
  });

  it('does not chain another token refresh after the one allowed retry', async () => {
    const harness = createHarness();
    harness.getAuthToken
      .mockResolvedValueOnce({ token: 'stale-token' })
      .mockResolvedValueOnce({ token: 'fresh-token' })
      .mockResolvedValueOnce({ token: 'unexpected-third-token' });
    harness.fetch
      .mockResolvedValueOnce(jsonResponse({ error: 'unauthorized' }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ items: [], nextPageToken: 'next-page' }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: 'unauthorized' }, 401));
    const gateway = createCalendarGateway(harness.dependencies);

    await expect(gateway.listCalendars()).rejects.toMatchObject({
      code: 'auth-required',
      status: 401,
    });

    expect(harness.removeCachedAuthToken).toHaveBeenCalledTimes(1);
    expect(harness.getAuthToken).toHaveBeenCalledTimes(2);
    expect(harness.fetch).toHaveBeenCalledTimes(3);
  });

  it('surfaces a terminal event 401 as disconnected and does not cache it', async () => {
    const harness = createHarness();
    harness.getAuthToken
      .mockResolvedValueOnce({ token: 'stale-token' })
      .mockResolvedValueOnce({ token: 'fresh-token' });
    harness.fetch.mockImplementation(async (url) => {
      if (url.includes('/users/me/calendarList')) {
        return jsonResponse({ items: [{ id: 'work', summary: 'Work' }] });
      }

      return jsonResponse({ error: 'unauthorized' }, 401);
    });
    const gateway = createCalendarGateway(harness.dependencies);

    await expect(gateway.listEvents(['work'])).rejects.toMatchObject({
      code: 'auth-required',
      status: 401,
    });

    expect(harness.removeCachedAuthToken).toHaveBeenCalledTimes(1);
    expect(harness.sessionStorage.values).not.toHaveProperty(
      CALENDAR_EVENT_CACHE_STORAGE_KEY,
    );
  });

  it('keeps another calendar result when one calendar still returns 401 after retry', async () => {
    const harness = createHarness();
    harness.getAuthToken
      .mockResolvedValueOnce({ token: 'stale-token' })
      .mockResolvedValueOnce({ token: 'fresh-token' });
    harness.fetch.mockImplementation(async (url) => {
      if (url.includes('/users/me/calendarList')) {
        return jsonResponse({
          items: [
            { id: 'private', summary: 'Private' },
            { id: 'work', summary: 'Work' },
          ],
        });
      }

      if (getCalendarIdFromEventsUrl(url) === 'private') {
        return jsonResponse({ error: 'unauthorized' }, 401);
      }

      return jsonResponse({
        items: [
          {
            end: { dateTime: '2026-09-01T02:00:00Z' },
            start: { dateTime: '2026-09-01T01:00:00Z' },
            summary: 'Work meeting',
          },
        ],
      });
    });
    const gateway = createCalendarGateway(harness.dependencies);

    await expect(
      gateway.listEvents(['work', 'private']),
    ).resolves.toMatchObject({
      events: [{ summary: 'Work meeting' }],
      failures: [{ calendarId: 'private', reason: 'auth-required' }],
    });
    expect(harness.sessionStorage.values).not.toHaveProperty(
      CALENDAR_EVENT_CACHE_STORAGE_KEY,
    );
  });

  it('serves a five-minute session cache without auth or network access', async () => {
    const harness = createHarness();
    harness.fetch.mockImplementation(async (url) => {
      if (url.includes('/users/me/calendarList')) {
        return jsonResponse({
          items: [{ backgroundColor: '#4285f4', id: 'work', summary: 'Work' }],
        });
      }

      return jsonResponse({
        items: [
          {
            end: { dateTime: '2026-08-31T02:00:00Z' },
            start: { dateTime: '2026-08-31T01:00:00Z' },
            summary: 'Cached meeting',
          },
        ],
      });
    });
    const gateway = createCalendarGateway(harness.dependencies);
    const firstResult = await gateway.listEvents(['work']);
    expect(firstResult.isFromCache).toBe(false);

    harness.fetch.mockClear();
    harness.getAuthToken.mockClear();
    harness.fetch.mockRejectedValue(new Error('offline'));
    harness.getAuthToken.mockRejectedValue(new Error('offline'));
    harness.setNow('2026-08-31T00:04:59.000Z');

    const cachedResult = await gateway.listEvents(['work']);

    expect(cachedResult.isFromCache).toBe(true);
    expect(cachedResult.events[0]?.summary).toBe('Cached meeting');
    expect(harness.fetch).not.toHaveBeenCalled();
    expect(harness.getAuthToken).not.toHaveBeenCalled();
    expect(harness.sessionStorage.values).toHaveProperty(
      CALENDAR_EVENT_CACHE_STORAGE_KEY,
    );
  });

  it('does not cache a partial transient failure and retries on the next read', async () => {
    const harness = createHarness();
    let shouldFailEventRead = true;
    harness.fetch.mockImplementation(async (url) => {
      if (url.includes('/users/me/calendarList')) {
        return jsonResponse({ items: [{ id: 'work', summary: 'Work' }] });
      }
      if (shouldFailEventRead) {
        throw new Error('offline');
      }

      return jsonResponse({
        items: [
          {
            end: { dateTime: '2026-08-31T02:00:00Z' },
            start: { dateTime: '2026-08-31T01:00:00Z' },
            summary: 'Recovered meeting',
          },
        ],
      });
    });
    const gateway = createCalendarGateway(harness.dependencies);

    const failedResult = await gateway.listEvents(['work']);

    expect(failedResult.failures).toEqual([
      { calendarId: 'work', reason: 'network' },
    ]);
    expect(harness.sessionStorage.values).not.toHaveProperty(
      CALENDAR_EVENT_CACHE_STORAGE_KEY,
    );

    shouldFailEventRead = false;
    const recoveredResult = await gateway.listEvents(['work']);

    expect(recoveredResult.events[0]?.summary).toBe('Recovered meeting');
    expect(recoveredResult.isFromCache).toBe(false);
  });

  it('does not expose cached events after the optional host permission is revoked', async () => {
    const harness = createHarness();
    harness.fetch.mockImplementation(async (url) => {
      if (url.includes('/users/me/calendarList')) {
        return jsonResponse({ items: [{ id: 'work', summary: 'Work' }] });
      }

      return jsonResponse({
        items: [
          {
            end: { dateTime: '2026-08-31T02:00:00Z' },
            start: { dateTime: '2026-08-31T01:00:00Z' },
            summary: 'Cached meeting',
          },
        ],
      });
    });
    const gateway = createCalendarGateway(harness.dependencies);
    await gateway.listEvents(['work']);

    harness.containsHostPermission.mockResolvedValue(false);
    harness.fetch.mockClear();
    harness.getAuthToken.mockClear();
    harness.setNow('2026-08-31T00:04:59.000Z');

    await expect(gateway.listEvents(['work'])).rejects.toMatchObject({
      code: 'permission-denied',
    });
    expect(harness.fetch).not.toHaveBeenCalled();
    expect(harness.getAuthToken).not.toHaveBeenCalled();
    expect(harness.requestHostPermission).not.toHaveBeenCalled();
  });

  it('limits merged output to the first 50 events', async () => {
    const harness = createHarness();
    harness.fetch.mockImplementation(async (url) => {
      if (url.includes('/users/me/calendarList')) {
        return jsonResponse({ items: [{ id: 'work', summary: 'Work' }] });
      }

      return jsonResponse({
        items: Array.from({ length: 60 }, (_, index) => ({
          end: {
            dateTime: `2026-09-01T${String(index % 24).padStart(2, '0')}:30:00Z`,
          },
          start: {
            dateTime: `2026-09-01T${String(index % 24).padStart(2, '0')}:00:00Z`,
          },
          summary: `Event ${String(index).padStart(2, '0')}`,
        })),
      });
    });
    const gateway = createCalendarGateway(harness.dependencies);

    const result = await gateway.listEvents(['work']);

    expect(result.events).toHaveLength(50);
  });

  it('clears the cached token, calendar list, selected IDs, and session events on disconnect', async () => {
    const harness = createHarness();
    harness.localStorage.values[CALENDAR_LIST_STORAGE_KEY] = {
      calendars: [],
      schemaVersion: 1,
    };
    harness.localStorage.values[SELECTED_CALENDAR_IDS_STORAGE_KEY] = ['work'];
    harness.sessionStorage.values[CALENDAR_EVENT_CACHE_STORAGE_KEY] = {
      events: [],
    };
    const gateway = createCalendarGateway(harness.dependencies);

    await gateway.disconnect();

    expect(harness.getAuthToken).toHaveBeenCalledWith({
      interactive: false,
      scopes: [...GOOGLE_CALENDAR_READONLY_SCOPES],
    });
    expect(harness.removeCachedAuthToken).toHaveBeenCalledWith({
      token: 'token-1',
    });
    expect(harness.removeHostPermission).toHaveBeenCalledOnce();
    expect(harness.localStorage.values).not.toHaveProperty(
      SELECTED_CALENDAR_IDS_STORAGE_KEY,
    );
    expect(harness.localStorage.values).not.toHaveProperty(
      CALENDAR_LIST_STORAGE_KEY,
    );
    expect(harness.sessionStorage.values).not.toHaveProperty(
      CALENDAR_EVENT_CACHE_STORAGE_KEY,
    );
  });

  it('still clears local data and host permission when no cached token exists', async () => {
    const harness = createHarness();
    harness.getAuthToken.mockRejectedValue(new Error('No cached token'));
    harness.localStorage.values[CALENDAR_LIST_STORAGE_KEY] = {
      calendars: [],
      schemaVersion: 1,
    };
    harness.localStorage.values[SELECTED_CALENDAR_IDS_STORAGE_KEY] = ['work'];
    harness.sessionStorage.values[CALENDAR_EVENT_CACHE_STORAGE_KEY] = {
      events: [],
    };
    const gateway = createCalendarGateway(harness.dependencies);

    await gateway.disconnect();

    expect(harness.removeCachedAuthToken).not.toHaveBeenCalled();
    expect(harness.removeHostPermission).toHaveBeenCalledOnce();
    expect(harness.localStorage.values).not.toHaveProperty(
      SELECTED_CALENDAR_IDS_STORAGE_KEY,
    );
    expect(harness.localStorage.values).not.toHaveProperty(
      CALENDAR_LIST_STORAGE_KEY,
    );
    expect(harness.sessionStorage.values).not.toHaveProperty(
      CALENDAR_EVENT_CACHE_STORAGE_KEY,
    );
  });
});
