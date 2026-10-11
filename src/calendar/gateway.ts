import {
  CALENDAR_EVENT_CACHE_TTL_MS,
  getCachedCalendarEvents,
  setCachedCalendarEvents,
} from './cache';
import { createCalendarGatewayError, isCalendarGatewayError } from './errors';
import { getCalendarFeedCacheKey, normalizeCalendarFeedUrl } from './feedUrl';
import { parseCalendarFeed } from './ical';
import type {
  CalendarEventsResult,
  CalendarGateway,
  CalendarGatewayDependencies,
  CalendarSubscription,
} from './types';

const CALENDAR_EVENT_LOOKAHEAD_MS = 7 * 24 * 60 * 60 * 1_000;
const CALENDAR_FETCH_TIMEOUT_MS = 10_000;
const MAX_CALENDAR_EVENTS = 50;
const MAX_CALENDAR_RESPONSE_BYTES = 2 * 1_024 * 1_024;

async function hasHostPermission(
  dependencies: CalendarGatewayDependencies,
  originPattern: string,
): Promise<boolean> {
  try {
    return await dependencies.hostPermission.contains(originPattern);
  } catch {
    throw createCalendarGatewayError('unavailable');
  }
}

async function requireHostPermission(
  dependencies: CalendarGatewayDependencies,
  originPattern: string,
): Promise<void> {
  if (!(await hasHostPermission(dependencies, originPattern))) {
    throw createCalendarGatewayError('permission-denied');
  }
}

async function readBoundedResponse(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get('content-length'));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_CALENDAR_RESPONSE_BYTES
  ) {
    throw createCalendarGatewayError('response-too-large');
  }

  if (!response.body) {
    const text = await response.text();
    if (
      new TextEncoder().encode(text).byteLength > MAX_CALENDAR_RESPONSE_BYTES
    ) {
      throw createCalendarGatewayError('response-too-large');
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = '';

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    byteLength += chunk.value.byteLength;
    if (byteLength > MAX_CALENDAR_RESPONSE_BYTES) {
      await reader.cancel();
      throw createCalendarGatewayError('response-too-large');
    }
    text += decoder.decode(chunk.value, { stream: true });
  }

  return text + decoder.decode();
}

async function fetchCalendarSource(
  dependencies: CalendarGatewayDependencies,
  feedUrl: string,
): Promise<string> {
  let response: Response;

  try {
    response = await dependencies.fetch(feedUrl, {
      cache: 'no-store',
      credentials: 'omit',
      method: 'GET',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(CALENDAR_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (isCalendarGatewayError(error)) throw error;
    throw createCalendarGatewayError('network-error');
  }

  if (!response.ok) {
    throw createCalendarGatewayError('api-error', response.status);
  }

  return readBoundedResponse(response);
}

export function createCalendarGateway(
  dependencies: CalendarGatewayDependencies,
): CalendarGateway {
  const activeRequests = new Map<string, Promise<CalendarEventsResult>>();

  async function subscribe(feedUrl: string): Promise<CalendarSubscription> {
    const location = normalizeCalendarFeedUrl(feedUrl);
    if (!location) throw createCalendarGatewayError('invalid-request');

    await requireHostPermission(dependencies, location.originPattern);

    return { isConnected: true };
  }

  async function fetchEvents(
    feedUrl: string,
    forceRefresh: boolean,
  ): Promise<CalendarEventsResult> {
    const location = normalizeCalendarFeedUrl(feedUrl);
    if (!location) throw createCalendarGatewayError('invalid-request');
    await requireHostPermission(dependencies, location.originPattern);

    const sourceKey = await getCalendarFeedCacheKey(location.url);
    const startedAt = dependencies.now();
    if (!forceRefresh) {
      const cached = await getCachedCalendarEvents(
        dependencies.sessionStorage,
        sourceKey,
        startedAt.getTime(),
      );
      if (cached) return cached;
    }

    const parsed = parseCalendarFeed(
      await fetchCalendarSource(dependencies, location.url),
      startedAt,
      new Date(startedAt.getTime() + CALENDAR_EVENT_LOOKAHEAD_MS),
    );
    const fetchedAt = dependencies.now().getTime();
    const result = {
      events: parsed.events.slice(0, MAX_CALENDAR_EVENTS),
      expiresAt: fetchedAt + CALENDAR_EVENT_CACHE_TTL_MS,
      fetchedAt,
      name: parsed.name,
    };
    await setCachedCalendarEvents(
      dependencies.sessionStorage,
      sourceKey,
      result,
    );
    return { ...result, isFromCache: false };
  }

  async function listEvents(
    feedUrl: string,
    forceRefresh = false,
  ): Promise<CalendarEventsResult> {
    const location = normalizeCalendarFeedUrl(feedUrl);
    if (!location) throw createCalendarGatewayError('invalid-request');

    const requestKey = `${location.url}:${forceRefresh}`;
    const activeRequest = activeRequests.get(requestKey);
    if (activeRequest) return activeRequest;

    const request = fetchEvents(location.url, forceRefresh);
    activeRequests.set(requestKey, request);
    try {
      return await request;
    } finally {
      if (activeRequests.get(requestKey) === request) {
        activeRequests.delete(requestKey);
      }
    }
  }

  return { listEvents, subscribe };
}
