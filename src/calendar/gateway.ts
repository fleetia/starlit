import {
  CALENDAR_EVENT_CACHE_TTL_MS,
  clearCachedCalendarEvents,
  getCachedCalendarEvents,
  setCachedCalendarEvents,
} from './cache';
import {
  createCalendarGatewayError,
  getCalendarFetchFailureReason,
  isCalendarGatewayError,
} from './errors';
import {
  clearStoredCalendarList,
  setStoredCalendarList,
} from './calendarListStorage';
import { parseCalendarEventsPage, parseCalendarListPage } from './parsers';
import {
  clearSelectedCalendarIds,
  getSelectedCalendarIds,
  normalizeSelectedCalendarIds,
  setSelectedCalendarIds,
} from './selectionStorage';
import {
  GOOGLE_CALENDAR_API_ORIGIN,
  GOOGLE_CALENDAR_READONLY_SCOPES,
  type CalendarConnection,
  type CalendarEvent,
  type CalendarEventsResult,
  type CalendarGateway,
  type CalendarGatewayDependencies,
  type CalendarInfo,
} from './types';

const CALENDAR_API_BASE_URL = `${GOOGLE_CALENDAR_API_ORIGIN}/calendar/v3`;
const EVENT_LOOKAHEAD_MS = 7 * 24 * 60 * 60 * 1_000;
const EVENT_FETCH_CONCURRENCY = 4;
const MAX_MERGED_EVENTS = 50;

type AuthorizedRequester = {
  getJson: (url: string) => Promise<unknown>;
};

type CalendarFetchResult =
  | { events: CalendarEvent[]; status: 'fulfilled' }
  | {
      calendarId: string;
      reason: ReturnType<typeof getCalendarFetchFailureReason>;
      status: 'rejected';
    };

async function getRequiredToken(
  dependencies: CalendarGatewayDependencies,
  interactive: boolean,
): Promise<{ token: string }> {
  let tokenResult: Awaited<
    ReturnType<CalendarGatewayDependencies['identity']['getAuthToken']>
  >;

  try {
    tokenResult = await dependencies.identity.getAuthToken({
      interactive,
      scopes: [...GOOGLE_CALENDAR_READONLY_SCOPES],
    });
  } catch {
    throw createCalendarGatewayError(
      interactive ? 'permission-denied' : 'auth-required',
    );
  }

  if (!tokenResult.token) {
    throw createCalendarGatewayError(
      interactive ? 'permission-denied' : 'auth-required',
    );
  }

  if (
    tokenResult.grantedScopes &&
    GOOGLE_CALENDAR_READONLY_SCOPES.some(
      (scope) => !tokenResult.grantedScopes?.includes(scope),
    )
  ) {
    try {
      await dependencies.identity.removeCachedAuthToken({
        token: tokenResult.token,
      });
    } catch {
      // The missing-scope result remains unusable even if cache cleanup fails.
    }

    throw createCalendarGatewayError(
      interactive ? 'permission-denied' : 'auth-required',
    );
  }

  return { token: tokenResult.token };
}

async function hasHostPermission(
  dependencies: CalendarGatewayDependencies,
): Promise<boolean> {
  try {
    return await dependencies.hostPermission.contains();
  } catch {
    throw createCalendarGatewayError('unavailable');
  }
}

async function requireHostPermission(
  dependencies: CalendarGatewayDependencies,
): Promise<void> {
  if (!(await hasHostPermission(dependencies))) {
    throw createCalendarGatewayError('permission-denied');
  }
}

async function fetchResponse(
  dependencies: CalendarGatewayDependencies,
  url: string,
  token: string,
): Promise<Response> {
  try {
    return await dependencies.fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      method: 'GET',
    });
  } catch (error) {
    if (isCalendarGatewayError(error)) {
      throw error;
    }

    throw createCalendarGatewayError('network-error');
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  if (!response.ok) {
    if (response.status === 401) {
      throw createCalendarGatewayError('auth-required', response.status);
    }

    throw createCalendarGatewayError('api-error', response.status);
  }

  try {
    const data: unknown = await response.json();
    return data;
  } catch {
    throw createCalendarGatewayError('invalid-response');
  }
}

function createAuthorizedRequester(
  dependencies: CalendarGatewayDependencies,
  initialToken: string,
): AuthorizedRequester {
  let currentToken = initialToken;
  let hasAttemptedRefresh = false;
  let refreshPromise: Promise<string> | null = null;

  async function refreshToken(staleToken: string): Promise<string> {
    if (currentToken !== staleToken) {
      return currentToken;
    }

    if (!refreshPromise) {
      if (hasAttemptedRefresh) {
        throw createCalendarGatewayError('auth-required', 401);
      }

      hasAttemptedRefresh = true;
      refreshPromise = (async (): Promise<string> => {
        try {
          await dependencies.identity.removeCachedAuthToken({
            token: staleToken,
          });
        } catch {
          throw createCalendarGatewayError('auth-required', 401);
        }

        const tokenResult = await getRequiredToken(dependencies, false);
        return tokenResult.token;
      })();
    }

    const activeRefresh = refreshPromise;

    try {
      currentToken = await activeRefresh;
      return currentToken;
    } finally {
      if (refreshPromise === activeRefresh) {
        refreshPromise = null;
      }
    }
  }

  async function getJson(url: string): Promise<unknown> {
    const requestToken = currentToken;
    let response = await fetchResponse(dependencies, url, requestToken);

    if (response.status === 401) {
      const retryToken = await refreshToken(requestToken);
      response = await fetchResponse(dependencies, url, retryToken);
    }

    return parseJsonResponse(response);
  }

  return { getJson };
}

async function fetchCalendars(
  requester: AuthorizedRequester,
): Promise<CalendarInfo[]> {
  let pageToken: string | undefined;
  let calendars: CalendarInfo[] = [];

  do {
    const searchParams = new URLSearchParams({
      colorRgbFormat: 'true',
      fields:
        'items(backgroundColor,deleted,id,primary,summary,summaryOverride),nextPageToken',
      maxResults: '250',
      minAccessRole: 'reader',
      showHidden: 'false',
    });

    if (pageToken) {
      searchParams.set('pageToken', pageToken);
    }

    const page = parseCalendarListPage(
      await requester.getJson(
        `${CALENDAR_API_BASE_URL}/users/me/calendarList?${searchParams.toString()}`,
      ),
    );
    calendars = [...calendars, ...page.calendars];
    pageToken = page.nextPageToken;
  } while (pageToken);

  return [
    ...new Map(calendars.map((calendar) => [calendar.id, calendar])).values(),
  ];
}

function createEventsUrl(
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): string {
  const searchParams = new URLSearchParams({
    fields: 'items(end,htmlLink,start,status,summary)',
    maxResults: String(MAX_MERGED_EVENTS),
    orderBy: 'startTime',
    singleEvents: 'true',
    timeMax: timeMax.toISOString(),
    timeMin: timeMin.toISOString(),
  });

  return `${CALENDAR_API_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events?${searchParams.toString()}`;
}

async function mapWithConcurrency<Input, Output>(
  values: readonly Input[],
  concurrency: number,
  operation: (value: Input) => Promise<Output>,
): Promise<Output[]> {
  if (values.length === 0) {
    return [];
  }

  const workerCount = Math.min(values.length, concurrency);
  const indexedValues = values.map((value, index) => ({ index, value }));
  const workerResults = await Promise.all(
    Array.from({ length: workerCount }, async (_, workerIndex) => {
      const assignedValues = indexedValues.filter(
        ({ index }) => index % workerCount === workerIndex,
      );
      const results: Array<{ index: number; value: Output }> = [];

      for (const assignedValue of assignedValues) {
        results.push({
          index: assignedValue.index,
          value: await operation(assignedValue.value),
        });
      }

      return results;
    }),
  );

  return workerResults
    .flat()
    .sort((first, second) => first.index - second.index)
    .map(({ value }) => value);
}

function compareCalendarEvents(
  first: CalendarEvent,
  second: CalendarEvent,
): number {
  const timeDifference = Date.parse(first.start) - Date.parse(second.start);
  if (!first.allDay && !second.allDay && timeDifference !== 0) {
    return timeDifference;
  }

  const firstCivilDate = first.start.slice(0, 10);
  const secondCivilDate = second.start.slice(0, 10);
  if (firstCivilDate !== secondCivilDate) {
    return firstCivilDate < secondCivilDate ? -1 : 1;
  }

  if (first.allDay !== second.allDay) {
    return first.allDay ? -1 : 1;
  }

  if (timeDifference !== 0) {
    return timeDifference;
  }

  if (first.summary !== second.summary) {
    return first.summary < second.summary ? -1 : 1;
  }

  return (first.htmlLink ?? '').localeCompare(second.htmlLink ?? '');
}

async function fetchCalendarEvents(
  requester: AuthorizedRequester,
  calendarIds: readonly string[],
  calendarColors: ReadonlyMap<string, string | null>,
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarFetchResult[]> {
  return mapWithConcurrency(
    calendarIds,
    EVENT_FETCH_CONCURRENCY,
    async (calendarId): Promise<CalendarFetchResult> => {
      try {
        const response = await requester.getJson(
          createEventsUrl(calendarId, timeMin, timeMax),
        );
        return {
          events: parseCalendarEventsPage(
            response,
            calendarColors.get(calendarId) ?? null,
          ),
          status: 'fulfilled',
        };
      } catch (error) {
        return {
          calendarId,
          reason: getCalendarFetchFailureReason(error),
          status: 'rejected',
        };
      }
    },
  );
}

export function createCalendarGateway(
  dependencies: CalendarGatewayDependencies,
): CalendarGateway {
  let activeCalendarListRequest: Promise<CalendarInfo[]> | null = null;
  const activeEventRequests = new Map<string, Promise<CalendarEventsResult>>();

  async function connect(): Promise<CalendarConnection> {
    const hadHostPermission = await hasHostPermission(dependencies);

    if (!hadHostPermission) {
      let wasGranted: boolean;

      try {
        wasGranted = await dependencies.hostPermission.request();
      } catch {
        throw createCalendarGatewayError('permission-denied');
      }

      if (!wasGranted) {
        throw createCalendarGatewayError('permission-denied');
      }
    }

    try {
      await getRequiredToken(dependencies, true);

      return {
        isConnected: true,
      };
    } catch (error) {
      if (!hadHostPermission) {
        try {
          await dependencies.hostPermission.remove();
        } catch {
          // Preserve the auth failure when compensating permission cleanup fails.
        }
      }

      throw error;
    }
  }

  async function disconnect(): Promise<void> {
    let token: string | undefined;

    try {
      token = (await getRequiredToken(dependencies, false)).token;
    } catch {
      token = undefined;
    }

    const cleanupOperations: Promise<unknown>[] = [
      clearCachedCalendarEvents(dependencies.sessionStorage),
      clearStoredCalendarList(dependencies.localStorage),
      clearSelectedCalendarIds(dependencies.localStorage),
      dependencies.hostPermission.remove(),
    ];

    if (token) {
      cleanupOperations.push(
        dependencies.identity.removeCachedAuthToken({ token }),
      );
    }

    const cleanupResults = await Promise.allSettled(cleanupOperations);
    if (cleanupResults.some((result) => result.status === 'rejected')) {
      throw createCalendarGatewayError('unavailable');
    }
  }

  async function fetchCalendarList(): Promise<CalendarInfo[]> {
    await requireHostPermission(dependencies);
    const tokenResult = await getRequiredToken(dependencies, false);
    const calendars = await fetchCalendars(
      createAuthorizedRequester(dependencies, tokenResult.token),
    );
    try {
      await setStoredCalendarList(dependencies.localStorage, calendars);
    } catch {
      // A derived local cache must not turn a successful Google API read into an error.
    }
    return calendars;
  }

  async function listCalendars(): Promise<CalendarInfo[]> {
    if (activeCalendarListRequest) {
      return activeCalendarListRequest;
    }

    const request = fetchCalendarList();
    activeCalendarListRequest = request;
    try {
      return await request;
    } finally {
      if (activeCalendarListRequest === request) {
        activeCalendarListRequest = null;
      }
    }
  }

  async function fetchEventsForCalendars(
    calendarIds: readonly string[],
  ): Promise<CalendarEventsResult> {
    const startedAt = dependencies.now();

    if (calendarIds.length > 0) {
      await requireHostPermission(dependencies);
    }

    const cachedResult = await getCachedCalendarEvents(
      dependencies.sessionStorage,
      calendarIds,
      startedAt.getTime(),
    );

    if (cachedResult) {
      return cachedResult;
    }

    if (calendarIds.length === 0) {
      const emptyResult = {
        events: [],
        expiresAt: startedAt.getTime() + CALENDAR_EVENT_CACHE_TTL_MS,
        failures: [],
        fetchedAt: startedAt.getTime(),
      };
      await setCachedCalendarEvents(
        dependencies.sessionStorage,
        calendarIds,
        emptyResult,
      );
      return { ...emptyResult, isFromCache: false };
    }

    const tokenResult = await getRequiredToken(dependencies, false);
    const requester = createAuthorizedRequester(
      dependencies,
      tokenResult.token,
    );
    const calendars = await fetchCalendars(requester);
    const calendarColors = new Map(
      calendars.map((calendar) => [calendar.id, calendar.color]),
    );
    const fetchResults = await fetchCalendarEvents(
      requester,
      calendarIds,
      calendarColors,
      startedAt,
      new Date(startedAt.getTime() + EVENT_LOOKAHEAD_MS),
    );
    const events = fetchResults
      .flatMap((result) => (result.status === 'fulfilled' ? result.events : []))
      .sort(compareCalendarEvents)
      .slice(0, MAX_MERGED_EVENTS);
    const failures = fetchResults.flatMap((result) =>
      result.status === 'rejected'
        ? [{ calendarId: result.calendarId, reason: result.reason }]
        : [],
    );

    const hasAuthenticationFailure = failures.some(
      (failure) => failure.reason === 'auth-required',
    );

    if (hasAuthenticationFailure) {
      try {
        await clearCachedCalendarEvents(dependencies.sessionStorage);
      } catch {
        // Authentication state takes precedence over optional cache cleanup.
      }

      if (fetchResults.every((result) => result.status === 'rejected')) {
        throw createCalendarGatewayError('auth-required', 401);
      }
    }

    const fetchedAt = dependencies.now().getTime();
    const result = {
      events,
      expiresAt: fetchedAt + CALENDAR_EVENT_CACHE_TTL_MS,
      failures,
      fetchedAt,
    };

    if (!hasAuthenticationFailure && failures.length === 0) {
      await setCachedCalendarEvents(
        dependencies.sessionStorage,
        calendarIds,
        result,
      );
    }

    return { ...result, isFromCache: false };
  }

  async function listEvents(
    requestedCalendarIds: readonly string[],
  ): Promise<CalendarEventsResult> {
    const calendarIds = normalizeSelectedCalendarIds(requestedCalendarIds);
    const requestKey = JSON.stringify(calendarIds);
    const activeRequest = activeEventRequests.get(requestKey);
    if (activeRequest) {
      return activeRequest;
    }

    const request = fetchEventsForCalendars(calendarIds);
    activeEventRequests.set(requestKey, request);
    try {
      return await request;
    } finally {
      if (activeEventRequests.get(requestKey) === request) {
        activeEventRequests.delete(requestKey);
      }
    }
  }

  return {
    connect,
    disconnect,
    getSelectedCalendarIds: () =>
      getSelectedCalendarIds(dependencies.localStorage),
    listCalendars,
    listEvents,
    setSelectedCalendarIds: (calendarIds) =>
      setSelectedCalendarIds(dependencies.localStorage, calendarIds),
  };
}
