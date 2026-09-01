import { describe, expect, it, vi } from 'vitest';

import {
  CALENDAR_EVENT_CACHE_STORAGE_KEY,
  CALENDAR_EVENT_CACHE_TTL_MS,
  clearCachedCalendarEvents,
  getCachedCalendarEvents,
  setCachedCalendarEvents,
} from './cache';
import type { CalendarStoragePort } from './types';

function createStorage(): CalendarStoragePort & {
  remove: ReturnType<typeof vi.fn<CalendarStoragePort['remove']>>;
  values: Record<string, unknown>;
} {
  const values: Record<string, unknown> = {};
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

describe('Calendar session cache', () => {
  it('expires five minutes after fetch and never returns an expired entry', async () => {
    const storage = createStorage();
    const fetchedAt = Date.parse('2026-09-01T00:00:00.000Z');

    await setCachedCalendarEvents(storage, ['work'], {
      events: [
        {
          allDay: false,
          calendarColor: '#4285f4',
          end: '2026-09-01T02:00:00Z',
          htmlLink: null,
          start: '2026-09-01T01:00:00Z',
          summary: 'Meeting',
        },
      ],
      expiresAt: fetchedAt + CALENDAR_EVENT_CACHE_TTL_MS,
      failures: [],
      fetchedAt,
    });

    await expect(
      getCachedCalendarEvents(
        storage,
        ['work'],
        fetchedAt + CALENDAR_EVENT_CACHE_TTL_MS - 1,
      ),
    ).resolves.toMatchObject({
      isFromCache: true,
      fetchedAt,
    });
    await expect(
      getCachedCalendarEvents(
        storage,
        ['work'],
        fetchedAt + CALENDAR_EVENT_CACHE_TTL_MS,
      ),
    ).resolves.toBeNull();
  });

  it('rejects malformed cached payloads containing private event fields', async () => {
    const storage = createStorage();
    const fetchedAt = Date.parse('2026-09-01T00:00:00.000Z');
    storage.values[CALENDAR_EVENT_CACHE_STORAGE_KEY] = {
      calendarIds: ['work'],
      events: [
        {
          allDay: false,
          calendarColor: null,
          description: 'private',
          end: '2026-09-01T02:00:00Z',
          htmlLink: null,
          start: '2026-09-01T01:00:00Z',
          summary: 'Meeting',
        },
      ],
      expiresAt: fetchedAt + CALENDAR_EVENT_CACHE_TTL_MS,
      failures: [],
      fetchedAt,
      schemaVersion: 1,
    };

    await expect(
      getCachedCalendarEvents(storage, ['work'], fetchedAt),
    ).resolves.toBeNull();
  });

  it('uses an exact calendar selection key and clears the session entry', async () => {
    const storage = createStorage();
    const fetchedAt = Date.parse('2026-09-01T00:00:00.000Z');
    await setCachedCalendarEvents(storage, ['personal', 'work'], {
      events: [],
      expiresAt: fetchedAt + CALENDAR_EVENT_CACHE_TTL_MS,
      failures: [],
      fetchedAt,
    });

    await expect(
      getCachedCalendarEvents(storage, ['work', 'personal'], fetchedAt),
    ).resolves.toBeNull();

    await clearCachedCalendarEvents(storage);
    expect(storage.remove).toHaveBeenCalledWith(
      CALENDAR_EVENT_CACHE_STORAGE_KEY,
    );
    expect(storage.values).not.toHaveProperty(CALENDAR_EVENT_CACHE_STORAGE_KEY);
  });
});
