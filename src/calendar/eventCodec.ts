import type { CalendarEvent, CalendarEventsResult } from './types';

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

function isStoredDate(value: unknown, allDay: boolean): value is string {
  if (typeof value !== 'string') return false;
  return allDay
    ? /^\d{4}-\d{2}-\d{2}$/u.test(value)
    : Number.isFinite(Date.parse(value));
}

export function isCalendarEvent(value: unknown): value is CalendarEvent {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'allDay',
      'calendarColor',
      'end',
      'htmlLink',
      'start',
      'summary',
    ]) ||
    typeof value.allDay !== 'boolean'
  ) {
    return false;
  }

  return (
    isStoredDate(value.start, value.allDay) &&
    isStoredDate(value.end, value.allDay) &&
    (value.calendarColor === null ||
      (typeof value.calendarColor === 'string' &&
        /^#[0-9a-f]{6}$/iu.test(value.calendarColor))) &&
    (value.htmlLink === null ||
      (typeof value.htmlLink === 'string' &&
        value.htmlLink.startsWith('https://'))) &&
    typeof value.summary === 'string' &&
    value.summary.length <= 240
  );
}

export function isCalendarEventsResult(
  value: unknown,
): value is CalendarEventsResult {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      'events',
      'expiresAt',
      'fetchedAt',
      'isFromCache',
      'name',
    ]) &&
    Array.isArray(value.events) &&
    value.events.length <= 50 &&
    value.events.every(isCalendarEvent) &&
    typeof value.name === 'string' &&
    value.name.length <= 240 &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt) &&
    typeof value.fetchedAt === 'number' &&
    Number.isFinite(value.fetchedAt) &&
    value.expiresAt >= value.fetchedAt &&
    typeof value.isFromCache === 'boolean'
  );
}
