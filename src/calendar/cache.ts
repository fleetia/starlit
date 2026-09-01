import { isCalendarEvent } from './eventCodec';
import type {
  CalendarEventsResult,
  CalendarStoragePort,
  ParsedCalendarFeed,
} from './types';

export const CALENDAR_EVENT_CACHE_STORAGE_KEY_PREFIX =
  'calendar.feedEventCache.v1.';
export const CALENDAR_EVENT_CACHE_TTL_MS = 5 * 60 * 1_000;
const CALENDAR_EVENT_CACHE_SCHEMA_VERSION = 1;

type CalendarEventCache = ParsedCalendarFeed & {
  expiresAt: number;
  fetchedAt: number;
  schemaVersion: typeof CALENDAR_EVENT_CACHE_SCHEMA_VERSION;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCalendarEventCache(value: unknown): CalendarEventCache | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 5 ||
    value.schemaVersion !== CALENDAR_EVENT_CACHE_SCHEMA_VERSION ||
    !Array.isArray(value.events) ||
    value.events.length > 50 ||
    !value.events.every(isCalendarEvent) ||
    typeof value.name !== 'string' ||
    value.name.length > 240 ||
    typeof value.fetchedAt !== 'number' ||
    !Number.isFinite(value.fetchedAt) ||
    typeof value.expiresAt !== 'number' ||
    !Number.isFinite(value.expiresAt) ||
    value.expiresAt <= value.fetchedAt ||
    value.expiresAt - value.fetchedAt > CALENDAR_EVENT_CACHE_TTL_MS
  ) {
    return null;
  }

  return {
    events: value.events,
    expiresAt: value.expiresAt,
    fetchedAt: value.fetchedAt,
    name: value.name,
    schemaVersion: CALENDAR_EVENT_CACHE_SCHEMA_VERSION,
  };
}

function getStorageKey(sourceKey: string): string {
  return `${CALENDAR_EVENT_CACHE_STORAGE_KEY_PREFIX}${sourceKey}`;
}

export async function getCachedCalendarEvents(
  sessionStorage: CalendarStoragePort,
  sourceKey: string,
  now: number,
): Promise<CalendarEventsResult | null> {
  const storageKey = getStorageKey(sourceKey);
  const storedValues = await sessionStorage.get(storageKey);
  const cache = parseCalendarEventCache(storedValues[storageKey]);
  if (!cache || cache.expiresAt <= now) return null;

  return {
    events: cache.events,
    expiresAt: cache.expiresAt,
    fetchedAt: cache.fetchedAt,
    isFromCache: true,
    name: cache.name,
  };
}

export async function setCachedCalendarEvents(
  sessionStorage: CalendarStoragePort,
  sourceKey: string,
  result: Omit<CalendarEventsResult, 'isFromCache'>,
): Promise<void> {
  await sessionStorage.set({
    [getStorageKey(sourceKey)]: {
      events: result.events,
      expiresAt: result.expiresAt,
      fetchedAt: result.fetchedAt,
      name: result.name,
      schemaVersion: CALENDAR_EVENT_CACHE_SCHEMA_VERSION,
    } satisfies CalendarEventCache,
  });
}

export async function clearCachedCalendarEvents(
  sessionStorage: CalendarStoragePort,
  sourceKey: string,
): Promise<void> {
  await sessionStorage.remove(getStorageKey(sourceKey));
}
