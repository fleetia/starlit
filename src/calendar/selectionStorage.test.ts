import { describe, expect, it, vi } from 'vitest';

import {
  clearSelectedCalendarIds,
  getSelectedCalendarIds,
  MAX_CALENDAR_ID_LENGTH,
  MAX_SELECTED_CALENDARS,
  normalizeSelectedCalendarIds,
  SELECTED_CALENDAR_IDS_STORAGE_KEY,
  setSelectedCalendarIds,
} from './selectionStorage';
import type { CalendarStoragePort } from './types';

function createStorage(
  initialValue?: unknown,
): CalendarStoragePort & { remove: ReturnType<typeof vi.fn> } {
  const values: Record<string, unknown> = {
    ...(initialValue === undefined
      ? {}
      : { [SELECTED_CALENDAR_IDS_STORAGE_KEY]: initialValue }),
  };
  const remove = vi.fn(async (keys: string | string[]): Promise<void> => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach((key) => delete values[key]);
  });

  return {
    get: async (key) => ({ [key]: values[key] }),
    remove,
    set: async (items) => {
      Object.assign(values, items);
    },
  };
}

describe('Calendar selection storage', () => {
  it('keeps selected calendar IDs local, trimmed, and unique', async () => {
    const storage = createStorage();

    await setSelectedCalendarIds(storage, [
      ' work@example.com ',
      'work@example.com',
      '',
      'personal@example.com',
    ]);

    expect(await getSelectedCalendarIds(storage)).toEqual([
      'personal@example.com',
      'work@example.com',
    ]);
    expect(
      normalizeSelectedCalendarIds([
        'work@example.com',
        'personal@example.com',
      ]),
    ).toEqual(['personal@example.com', 'work@example.com']);
  });

  it('falls back for malformed values and clears selection on disconnect', async () => {
    const storage = createStorage({ id: 'not-an-array' });

    expect(await getSelectedCalendarIds(storage)).toEqual([]);
    expect(normalizeSelectedCalendarIds([])).toEqual([]);

    await clearSelectedCalendarIds(storage);
    expect(storage.remove).toHaveBeenCalledWith(
      SELECTED_CALENDAR_IDS_STORAGE_KEY,
    );
  });

  it('bounds the stored selection and rejects oversized IDs', () => {
    const calendarIds = [
      'x'.repeat(MAX_CALENDAR_ID_LENGTH + 1),
      ...Array.from(
        { length: MAX_SELECTED_CALENDARS + 10 },
        (_, index) => `calendar-${index}`,
      ),
    ];

    const normalizedIds = normalizeSelectedCalendarIds(calendarIds);

    expect(normalizedIds).toHaveLength(MAX_SELECTED_CALENDARS);
    expect(normalizedIds).not.toContain(calendarIds[0]);
    expect(normalizedIds[0]).toBe('calendar-0');
  });
});
