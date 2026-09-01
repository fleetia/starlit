import type { CalendarStoragePort } from './types';

export const SELECTED_CALENDAR_IDS_STORAGE_KEY =
  'googleCalendar.selectedCalendarIds';
export const MAX_SELECTED_CALENDARS = 100;
export const MAX_CALENDAR_ID_LENGTH = 2_048;

export function isCalendarId(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmedValue = value.trim();
  return (
    trimmedValue.length > 0 && trimmedValue.length <= MAX_CALENDAR_ID_LENGTH
  );
}

export function normalizeSelectedCalendarIds(
  calendarIds: readonly string[],
): string[] {
  const normalizedIds = calendarIds
    .map((calendarId) => calendarId.trim())
    .filter(isCalendarId);

  return [...new Set(normalizedIds)].sort().slice(0, MAX_SELECTED_CALENDARS);
}

export async function getSelectedCalendarIds(
  localStorage: CalendarStoragePort,
): Promise<string[]> {
  const storedValues = await localStorage.get(
    SELECTED_CALENDAR_IDS_STORAGE_KEY,
  );
  const value = storedValues[SELECTED_CALENDAR_IDS_STORAGE_KEY];

  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string')
  ) {
    return [];
  }

  return normalizeSelectedCalendarIds(value);
}

export async function setSelectedCalendarIds(
  localStorage: CalendarStoragePort,
  calendarIds: readonly string[],
): Promise<void> {
  await localStorage.set({
    [SELECTED_CALENDAR_IDS_STORAGE_KEY]:
      normalizeSelectedCalendarIds(calendarIds),
  });
}

export async function clearSelectedCalendarIds(
  localStorage: CalendarStoragePort,
): Promise<void> {
  await localStorage.remove(SELECTED_CALENDAR_IDS_STORAGE_KEY);
}
