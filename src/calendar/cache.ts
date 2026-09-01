import { isStoredCalendarEvent } from './parsers';
import { isCalendarId, MAX_SELECTED_CALENDARS } from './selectionStorage';
import type {
  CalendarEvent,
  CalendarEventsResult,
  CalendarFetchFailure,
  CalendarFetchFailureReason,
  CalendarStoragePort,
} from './types';

export const CALENDAR_EVENT_CACHE_STORAGE_KEY = 'googleCalendar.eventCache.v1';
export const CALENDAR_EVENT_CACHE_TTL_MS = 5 * 60 * 1_000;
const CALENDAR_EVENT_CACHE_SCHEMA_VERSION = 1;

type CalendarEventCache = {
  calendarIds: string[];
  events: CalendarEvent[];
  expiresAt: number;
  failures: CalendarFetchFailure[];
  fetchedAt: number;
  schemaVersion: typeof CALENDAR_EVENT_CACHE_SCHEMA_VERSION;
};

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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFailureReason(value: unknown): value is CalendarFetchFailureReason {
  return (
    value === 'auth-required' ||
    value === 'forbidden' ||
    value === 'invalid-response' ||
    value === 'network' ||
    value === 'not-found' ||
    value === 'unknown'
  );
}

function isStoredFailure(value: unknown): value is CalendarFetchFailure {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['calendarId', 'reason']) &&
    isCalendarId(value.calendarId) &&
    isFailureReason(value.reason)
  );
}

function parseCalendarEventCache(value: unknown): CalendarEventCache | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'calendarIds',
      'events',
      'expiresAt',
      'failures',
      'fetchedAt',
      'schemaVersion',
    ]) ||
    value.schemaVersion !== CALENDAR_EVENT_CACHE_SCHEMA_VERSION ||
    !Array.isArray(value.calendarIds) ||
    value.calendarIds.length > MAX_SELECTED_CALENDARS ||
    !value.calendarIds.every(isCalendarId) ||
    !Array.isArray(value.events) ||
    !value.events.every(isStoredCalendarEvent) ||
    !Array.isArray(value.failures) ||
    !value.failures.every(isStoredFailure) ||
    !isFiniteNumber(value.fetchedAt) ||
    !isFiniteNumber(value.expiresAt) ||
    value.expiresAt <= value.fetchedAt ||
    value.expiresAt - value.fetchedAt > CALENDAR_EVENT_CACHE_TTL_MS
  ) {
    return null;
  }

  return {
    calendarIds: [...value.calendarIds],
    events: value.events.map((event) => ({
      allDay: event.allDay,
      calendarColor: event.calendarColor,
      end: event.end,
      htmlLink: event.htmlLink,
      start: event.start,
      summary: event.summary,
    })),
    expiresAt: value.expiresAt,
    failures: value.failures.map((failure) => ({
      calendarId: failure.calendarId,
      reason: failure.reason,
    })),
    fetchedAt: value.fetchedAt,
    schemaVersion: CALENDAR_EVENT_CACHE_SCHEMA_VERSION,
  };
}

function hasSameCalendarIds(
  firstIds: readonly string[],
  secondIds: readonly string[],
): boolean {
  return (
    firstIds.length === secondIds.length &&
    firstIds.every((calendarId, index) => calendarId === secondIds[index])
  );
}

export async function getCachedCalendarEvents(
  sessionStorage: CalendarStoragePort,
  calendarIds: readonly string[],
  now: number,
): Promise<CalendarEventsResult | null> {
  const storedValues = await sessionStorage.get(
    CALENDAR_EVENT_CACHE_STORAGE_KEY,
  );
  const cache = parseCalendarEventCache(
    storedValues[CALENDAR_EVENT_CACHE_STORAGE_KEY],
  );

  if (
    !cache ||
    cache.expiresAt <= now ||
    !hasSameCalendarIds(cache.calendarIds, calendarIds)
  ) {
    return null;
  }

  return {
    events: cache.events,
    expiresAt: cache.expiresAt,
    failures: cache.failures,
    fetchedAt: cache.fetchedAt,
    isFromCache: true,
  };
}

export async function setCachedCalendarEvents(
  sessionStorage: CalendarStoragePort,
  calendarIds: readonly string[],
  result: Omit<CalendarEventsResult, 'isFromCache'>,
): Promise<void> {
  const cache: CalendarEventCache = {
    calendarIds: [...calendarIds],
    events: result.events,
    expiresAt: result.expiresAt,
    failures: result.failures,
    fetchedAt: result.fetchedAt,
    schemaVersion: CALENDAR_EVENT_CACHE_SCHEMA_VERSION,
  };

  await sessionStorage.set({
    [CALENDAR_EVENT_CACHE_STORAGE_KEY]: cache,
  });
}

export async function clearCachedCalendarEvents(
  sessionStorage: CalendarStoragePort,
): Promise<void> {
  await sessionStorage.remove(CALENDAR_EVENT_CACHE_STORAGE_KEY);
}
