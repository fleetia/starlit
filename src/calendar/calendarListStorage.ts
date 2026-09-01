import { isCalendarId } from './selectionStorage';
import type { CalendarInfo, CalendarStoragePort } from './types';

export const CALENDAR_LIST_STORAGE_KEY = 'googleCalendar.calendarList.v1';

const CALENDAR_LIST_SCHEMA_VERSION = 1;
const CALENDAR_LIST_KEYS = ['calendars', 'schemaVersion'] as const;
const CALENDAR_KEYS = ['color', 'id', 'name', 'primary'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const valueKeys = Object.keys(value);
  return (
    valueKeys.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function parseCalendarInfo(value: unknown): CalendarInfo | null {
  if (!isRecord(value) || !hasExactKeys(value, CALENDAR_KEYS)) {
    return null;
  }

  if (
    !isCalendarId(value.id) ||
    value.id !== value.id.trim() ||
    typeof value.name !== 'string' ||
    value.name.trim() === '' ||
    typeof value.primary !== 'boolean' ||
    (value.color !== null &&
      (typeof value.color !== 'string' ||
        !/^#[0-9a-f]{6}$/iu.test(value.color)))
  ) {
    return null;
  }

  return {
    color: value.color,
    id: value.id,
    isPrimary: value.primary,
    name: value.name,
  };
}

export function parseStoredCalendarList(value: unknown): CalendarInfo[] | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, CALENDAR_LIST_KEYS) ||
    value.schemaVersion !== CALENDAR_LIST_SCHEMA_VERSION ||
    !Array.isArray(value.calendars)
  ) {
    return null;
  }

  const calendars = value.calendars.flatMap((item) => {
    const calendar = parseCalendarInfo(item);
    return calendar ? [calendar] : [];
  });
  if (calendars.length !== value.calendars.length) {
    return null;
  }

  if (
    new Set(calendars.map((calendar) => calendar.id)).size !== calendars.length
  ) {
    return null;
  }

  return calendars;
}

export async function getStoredCalendarList(
  localStorage: CalendarStoragePort,
): Promise<CalendarInfo[]> {
  const storedValues = await localStorage.get(CALENDAR_LIST_STORAGE_KEY);
  return parseStoredCalendarList(storedValues[CALENDAR_LIST_STORAGE_KEY]) ?? [];
}

export async function setStoredCalendarList(
  localStorage: CalendarStoragePort,
  calendars: readonly CalendarInfo[],
): Promise<void> {
  const uniqueCalendars = [
    ...new Map(calendars.map((calendar) => [calendar.id, calendar])).values(),
  ];
  await localStorage.set({
    [CALENDAR_LIST_STORAGE_KEY]: {
      calendars: uniqueCalendars.map((calendar) => ({
        color: calendar.color,
        id: calendar.id,
        name: calendar.name,
        primary: calendar.isPrimary,
      })),
      schemaVersion: CALENDAR_LIST_SCHEMA_VERSION,
    },
  });
}

export async function clearStoredCalendarList(
  localStorage: CalendarStoragePort,
): Promise<void> {
  await localStorage.remove(CALENDAR_LIST_STORAGE_KEY);
}
