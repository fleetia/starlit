import { describe, expect, it } from 'vitest';

import {
  CALENDAR_LIST_STORAGE_KEY,
  clearStoredCalendarList,
  getStoredCalendarList,
  parseStoredCalendarList,
  setStoredCalendarList,
} from './calendarListStorage';
import type { CalendarInfo, CalendarStoragePort } from './types';

function createMemoryStorage(): CalendarStoragePort & {
  values: Record<string, unknown>;
} {
  const values: Record<string, unknown> = {};

  return {
    get: async (key) => ({ [key]: values[key] }),
    remove: async (keys) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      keyList.forEach((key) => delete values[key]);
    },
    set: async (items) => {
      Object.assign(values, items);
    },
    values,
  };
}

const CALENDARS: CalendarInfo[] = [
  {
    color: '#4285f4',
    id: 'work',
    isPrimary: true,
    name: 'Work',
  },
  {
    color: null,
    id: 'personal',
    isPrimary: false,
    name: 'Personal',
  },
];

describe('calendar list local storage', () => {
  it('parses only the versioned calendar-list shape', () => {
    expect(
      parseStoredCalendarList({
        calendars: [
          {
            color: '#4285f4',
            id: 'work',
            name: 'Work',
            primary: true,
          },
        ],
        schemaVersion: 1,
      }),
    ).toEqual([CALENDARS[0]]);

    expect(
      parseStoredCalendarList({
        calendars: [
          {
            accessToken: 'must-not-survive',
            color: '#4285f4',
            id: 'work',
            name: 'Work',
            primary: true,
          },
        ],
        schemaVersion: 1,
      }),
    ).toBeNull();
    expect(
      parseStoredCalendarList({
        calendars: [{ color: 'blue', id: 'work', name: 'Work', primary: true }],
        schemaVersion: 1,
      }),
    ).toBeNull();
    expect(
      parseStoredCalendarList({ calendars: [], schemaVersion: 2 }),
    ).toBeNull();
  });

  it('round-trips only id, name, color, and primary in local storage', async () => {
    const storage = createMemoryStorage();
    const calendarsWithPrivateFields = CALENDARS.map((calendar) => ({
      ...calendar,
      accessToken: 'must-not-survive',
      events: [{ summary: 'must-not-survive' }],
    })) as CalendarInfo[];

    await setStoredCalendarList(storage, calendarsWithPrivateFields);

    expect(storage.values[CALENDAR_LIST_STORAGE_KEY]).toEqual({
      calendars: [
        {
          color: '#4285f4',
          id: 'work',
          name: 'Work',
          primary: true,
        },
        {
          color: null,
          id: 'personal',
          name: 'Personal',
          primary: false,
        },
      ],
      schemaVersion: 1,
    });
    await expect(getStoredCalendarList(storage)).resolves.toEqual(CALENDARS);
  });

  it('falls back for malformed data and removes the list on cleanup', async () => {
    const storage = createMemoryStorage();
    storage.values[CALENDAR_LIST_STORAGE_KEY] = {
      calendars: 'not-an-array',
      schemaVersion: 1,
    };

    await expect(getStoredCalendarList(storage)).resolves.toEqual([]);

    await setStoredCalendarList(storage, CALENDARS);
    await clearStoredCalendarList(storage);

    expect(storage.values).not.toHaveProperty(CALENDAR_LIST_STORAGE_KEY);
  });
});
