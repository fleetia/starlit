import { describe, expect, it } from 'vitest';

import {
  CALENDAR_EVENT_CACHE_TTL_MS,
  getCachedCalendarEvents,
  setCachedCalendarEvents,
} from './cache';
import type { CalendarStoragePort } from './types';

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

describe('Calendar session cache', () => {
  it('isolates sources by their opaque key and expires after five minutes', async () => {
    const storage = createStorage();
    const fetchedAt = Date.parse('2026-09-01T00:00:00.000Z');
    await setCachedCalendarEvents(storage, 'source-a', {
      events: [],
      expiresAt: fetchedAt + CALENDAR_EVENT_CACHE_TTL_MS,
      fetchedAt,
      name: 'Work',
    });

    await expect(
      getCachedCalendarEvents(storage, 'source-a', fetchedAt),
    ).resolves.toMatchObject({ isFromCache: true, name: 'Work' });
    await expect(
      getCachedCalendarEvents(storage, 'source-b', fetchedAt),
    ).resolves.toBeNull();
    await expect(
      getCachedCalendarEvents(
        storage,
        'source-a',
        fetchedAt + CALENDAR_EVENT_CACHE_TTL_MS,
      ),
    ).resolves.toBeNull();
  });

  it('rejects cached payloads above the rendered event limit', async () => {
    const storage = createStorage();
    const fetchedAt = Date.parse('2026-09-01T00:00:00.000Z');
    const event = {
      allDay: false,
      calendarColor: null,
      end: '2026-09-01T10:00:00.000Z',
      htmlLink: null,
      start: '2026-09-01T09:00:00.000Z',
      summary: 'Meeting',
    };
    await setCachedCalendarEvents(storage, 'source', {
      events: Array.from({ length: 51 }, () => event),
      expiresAt: fetchedAt + CALENDAR_EVENT_CACHE_TTL_MS,
      fetchedAt,
      name: 'Work',
    });

    await expect(
      getCachedCalendarEvents(storage, 'source', fetchedAt),
    ).resolves.toBeNull();
  });
});
