import { useCallback, useEffect, useRef, useState } from 'react';

import {
  normalizeCalendarFeedUrl,
  requestCalendarFeedPermission,
  sendCalendarMessage,
  type CalendarEvent,
  type CalendarMessageResponse,
} from '../calendar';

export type CalendarWidgetStatus =
  | 'disconnected'
  | 'error'
  | 'loading'
  | 'ready';

export type CalendarWidgetController = {
  error: string | null;
  events: CalendarEvent[];
  name: string;
  refresh: () => Promise<void>;
  status: CalendarWidgetStatus;
  subscribe: (feedUrlOverride?: string) => Promise<void>;
};

type CalendarWidgetState = {
  error: string | null;
  events: CalendarEvent[];
  feedUrl: string | null;
  name: string;
  status: CalendarWidgetStatus;
};

function createEmptyState(
  feedUrl: string | null,
  status: CalendarWidgetStatus,
  error: string | null = null,
): CalendarWidgetState {
  return { error, events: [], feedUrl, name: '', status };
}

function getFailureStatus(
  response: CalendarMessageResponse,
): CalendarWidgetStatus {
  return !response.ok && response.error.code === 'permission-denied'
    ? 'disconnected'
    : 'error';
}

function getListEventsState(
  feedUrl: string,
  response: CalendarMessageResponse,
): CalendarWidgetState {
  if (!response.ok || response.type !== 'calendar.listEvents.result') {
    return createEmptyState(
      feedUrl,
      getFailureStatus(response),
      response.ok ? null : response.error.message,
    );
  }

  return {
    error: null,
    events: response.data.events,
    feedUrl,
    name: response.data.name,
    status: 'ready',
  };
}

export function useCalendarWidget(
  feedUrl: string | null,
): CalendarWidgetController {
  const normalizedFeedUrl =
    normalizeCalendarFeedUrl(feedUrl ?? '')?.url ?? null;
  const [state, setState] = useState<CalendarWidgetState>(() =>
    createEmptyState(
      normalizedFeedUrl,
      normalizedFeedUrl ? 'loading' : 'disconnected',
    ),
  );
  const requestGenerationRef = useRef(0);
  const feedUrlRef = useRef(normalizedFeedUrl);
  const subscriptionFeedUrlRef = useRef<string | null>(null);

  const loadEvents = useCallback(
    async (
      requestedFeedUrl: string,
      forceRefresh: boolean,
      allowFeedUrlOverride = false,
    ): Promise<void> => {
      const generation = requestGenerationRef.current + 1;
      requestGenerationRef.current = generation;

      const response = await sendCalendarMessage({
        feedUrl: requestedFeedUrl,
        ...(forceRefresh ? { forceRefresh: true } : {}),
        type: 'calendar.listEvents',
      });
      if (
        generation !== requestGenerationRef.current ||
        (!allowFeedUrlOverride && feedUrlRef.current !== requestedFeedUrl)
      ) {
        return;
      }

      setState(getListEventsState(requestedFeedUrl, response));
    },
    [],
  );

  useEffect(() => {
    feedUrlRef.current = normalizedFeedUrl;
    if (subscriptionFeedUrlRef.current === normalizedFeedUrl) return;

    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    if (!normalizedFeedUrl) return;

    void sendCalendarMessage({
      feedUrl: normalizedFeedUrl,
      type: 'calendar.listEvents',
    }).then((response) => {
      if (
        generation !== requestGenerationRef.current ||
        feedUrlRef.current !== normalizedFeedUrl
      ) {
        return;
      }
      setState(getListEventsState(normalizedFeedUrl, response));
    });
  }, [normalizedFeedUrl]);

  useEffect(
    () => () => {
      requestGenerationRef.current += 1;
    },
    [],
  );

  const subscribe = useCallback(
    async (feedUrlOverride?: string): Promise<void> => {
      const requestedLocation = normalizeCalendarFeedUrl(
        feedUrlOverride ?? feedUrlRef.current ?? '',
      );
      if (!requestedLocation) {
        setState(
          createEmptyState(
            null,
            'disconnected',
            'The Calendar feed URL is invalid.',
          ),
        );
        return;
      }
      const requestedFeedUrl = requestedLocation.url;

      const generation = requestGenerationRef.current + 1;
      requestGenerationRef.current = generation;
      subscriptionFeedUrlRef.current = requestedFeedUrl;
      setState(createEmptyState(requestedFeedUrl, 'loading'));
      const wasGranted = await requestCalendarFeedPermission(requestedFeedUrl);
      if (generation !== requestGenerationRef.current) return;
      if (!wasGranted) {
        subscriptionFeedUrlRef.current = null;
        setState(
          createEmptyState(
            feedUrlRef.current,
            'disconnected',
            'Calendar feed access was not granted.',
          ),
        );
        return;
      }

      const response = await sendCalendarMessage({
        feedUrl: requestedFeedUrl,
        type: 'calendar.subscribe',
      });
      if (
        generation !== requestGenerationRef.current ||
        (!feedUrlOverride && feedUrlRef.current !== requestedFeedUrl)
      ) {
        if (subscriptionFeedUrlRef.current === requestedFeedUrl) {
          subscriptionFeedUrlRef.current = null;
        }
        return;
      }

      if (!response.ok) {
        subscriptionFeedUrlRef.current = null;
        setState(
          createEmptyState(
            requestedFeedUrl,
            getFailureStatus(response),
            response.error.message,
          ),
        );
        return;
      }

      await loadEvents(requestedFeedUrl, true, Boolean(feedUrlOverride));
      if (subscriptionFeedUrlRef.current === requestedFeedUrl) {
        subscriptionFeedUrlRef.current = null;
      }
    },
    [loadEvents],
  );

  const refresh = useCallback(async (): Promise<void> => {
    const requestedFeedUrl = feedUrlRef.current;
    if (!requestedFeedUrl) return;
    setState(createEmptyState(requestedFeedUrl, 'loading'));
    await loadEvents(requestedFeedUrl, true);
  }, [loadEvents]);

  const visibleState =
    state.feedUrl === normalizedFeedUrl
      ? state
      : createEmptyState(
          normalizedFeedUrl,
          normalizedFeedUrl ? 'loading' : 'disconnected',
        );

  return {
    error: visibleState.error,
    events: visibleState.events,
    name: visibleState.name,
    refresh,
    status: visibleState.status,
    subscribe,
  };
}
