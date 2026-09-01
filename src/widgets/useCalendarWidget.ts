import { useCallback, useEffect, useRef, useState } from 'react';

import {
  SELECTED_CALENDAR_IDS_STORAGE_KEY,
  normalizeSelectedCalendarIds,
  sendCalendarMessage,
  type CalendarEvent,
  type CalendarFetchFailure,
  type CalendarInfo,
  type CalendarMessageResponse,
} from '../calendar';

export type CalendarWidgetStatus =
  | 'disconnected'
  | 'error'
  | 'loading'
  | 'ready';

export type CalendarWidgetController = {
  calendars: CalendarInfo[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  error: string | null;
  events: CalendarEvent[];
  failures: CalendarFetchFailure[];
  loadCalendars: () => Promise<void>;
  refresh: () => Promise<void>;
  selectedCalendarIds: string[];
  setSelectedCalendarIds: (ids: readonly string[]) => Promise<void>;
  status: CalendarWidgetStatus;
};

function getResponseError(response: CalendarMessageResponse): string | null {
  return response.ok ? null : response.error.message;
}

function getFailureStatus(
  response: CalendarMessageResponse,
): CalendarWidgetStatus {
  if (response.ok) return 'error';
  return response.error.code === 'auth-required' ||
    response.error.code === 'permission-denied'
    ? 'disconnected'
    : 'error';
}

async function readSelectedCalendarIds(): Promise<string[]> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
  const stored =
    (await chrome.storage.local.get(SELECTED_CALENDAR_IDS_STORAGE_KEY)) ?? {};
  const value = stored[SELECTED_CALENDAR_IDS_STORAGE_KEY];
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? normalizeSelectedCalendarIds(value)
    : [];
}

function parseSelectedCalendarIds(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? normalizeSelectedCalendarIds(value)
    : null;
}

function areSameCalendarIds(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((calendarId, index) => calendarId === right[index])
  );
}

async function writeSelectedCalendarIds(ids: readonly string[]): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  await chrome.storage.local.set({
    [SELECTED_CALENDAR_IDS_STORAGE_KEY]: normalizeSelectedCalendarIds(ids),
  });
}

export function useCalendarWidget(): CalendarWidgetController {
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendarIds, setSelectedIds] = useState<string[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [failures, setFailures] = useState<CalendarFetchFailure[]>([]);
  const [status, setStatus] = useState<CalendarWidgetStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(false);
  const selectedCalendarIdsRef = useRef<string[]>([]);
  const hasConfiguredSelectionRef = useRef(false);
  const pendingSelectionWriteRef = useRef<string[] | null>(null);
  const eventRequestGenerationRef = useRef(0);
  const calendarRequestGenerationRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      eventRequestGenerationRef.current += 1;
      calendarRequestGenerationRef.current += 1;
    };
  }, []);

  const loadEvents = useCallback(async (ids: readonly string[]) => {
    const normalizedIds = normalizeSelectedCalendarIds(ids);
    const generation = eventRequestGenerationRef.current + 1;
    eventRequestGenerationRef.current = generation;
    calendarRequestGenerationRef.current += 1;

    const isCurrentRequest = (): boolean =>
      isMountedRef.current &&
      generation === eventRequestGenerationRef.current &&
      areSameCalendarIds(normalizedIds, selectedCalendarIdsRef.current);

    if (normalizedIds.length === 0) {
      if (!isCurrentRequest()) return;
      setEvents([]);
      setFailures([]);
      setError(null);
      setStatus('ready');
      return;
    }

    if (!isCurrentRequest()) return;
    setError(null);
    setStatus('loading');
    const response = await sendCalendarMessage({
      calendarIds: normalizedIds,
      type: 'calendar.listEvents',
    });
    if (!isCurrentRequest()) return;

    if (!response.ok || response.type !== 'calendar.listEvents.result') {
      setError(getResponseError(response));
      setStatus(getFailureStatus(response));
      return;
    }

    setError(null);
    setEvents(response.data.events);
    setFailures(response.data.failures);
    setStatus('ready');
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    await loadEvents(selectedCalendarIdsRef.current);
  }, [loadEvents]);

  const loadCalendars = useCallback(
    async (isPassiveProbe = false): Promise<void> => {
      const generation = calendarRequestGenerationRef.current + 1;
      calendarRequestGenerationRef.current = generation;
      eventRequestGenerationRef.current += 1;
      if (!isMountedRef.current) return;
      setStatus('loading');
      const response = await sendCalendarMessage({
        type: 'calendar.listCalendars',
      });
      if (
        !isMountedRef.current ||
        generation !== calendarRequestGenerationRef.current
      ) {
        return;
      }
      if (!response.ok || response.type !== 'calendar.listCalendars.result') {
        const failureStatus = getFailureStatus(response);
        setError(
          isPassiveProbe && failureStatus === 'disconnected'
            ? null
            : getResponseError(response),
        );
        setStatus(failureStatus);
        return;
      }

      setCalendars(response.data);
      setError(null);
      setStatus('ready');
    },
    [],
  );

  const applySelectedCalendarIds = useCallback(
    async (ids: readonly string[], force = false): Promise<void> => {
      const normalizedIds = normalizeSelectedCalendarIds(ids);
      if (
        !isMountedRef.current ||
        (!force &&
          hasConfiguredSelectionRef.current &&
          areSameCalendarIds(normalizedIds, selectedCalendarIdsRef.current))
      ) {
        return;
      }

      hasConfiguredSelectionRef.current = true;
      selectedCalendarIdsRef.current = normalizedIds;
      setSelectedIds(normalizedIds);
      await loadEvents(normalizedIds);
    },
    [loadEvents],
  );

  const clearDisconnectedSelection = useCallback((): void => {
    eventRequestGenerationRef.current += 1;
    calendarRequestGenerationRef.current += 1;
    hasConfiguredSelectionRef.current = false;
    selectedCalendarIdsRef.current = [];
    if (!isMountedRef.current) return;
    setSelectedIds([]);
    setEvents([]);
    setFailures([]);
    setError(null);
    setStatus('disconnected');
  }, []);

  useEffect(() => {
    let isActive = true;
    let didObserveStorageChange = false;

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ): void => {
      if (
        !isActive ||
        areaName !== 'local' ||
        !Object.hasOwn(changes, SELECTED_CALENDAR_IDS_STORAGE_KEY)
      ) {
        return;
      }

      didObserveStorageChange = true;
      const ids = parseSelectedCalendarIds(
        changes[SELECTED_CALENDAR_IDS_STORAGE_KEY]?.newValue,
      );
      if (ids === null) {
        clearDisconnectedSelection();
        return;
      }
      if (
        pendingSelectionWriteRef.current &&
        areSameCalendarIds(ids, pendingSelectionWriteRef.current)
      ) {
        return;
      }
      void applySelectedCalendarIds(ids);
    };

    const canSubscribe =
      typeof chrome !== 'undefined' && chrome.storage?.onChanged !== undefined;
    if (canSubscribe) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }

    void readSelectedCalendarIds().then(
      (ids) => {
        if (!isActive || didObserveStorageChange) return;
        if (ids.length === 0) {
          hasConfiguredSelectionRef.current = true;
          selectedCalendarIdsRef.current = [];
          if (!isMountedRef.current) return;
          setSelectedIds([]);
          setEvents([]);
          setFailures([]);
          setError(null);
          void loadCalendars(true);
          return;
        }
        void applySelectedCalendarIds(ids, true);
      },
      (selectionError: unknown) => {
        if (!isActive || !isMountedRef.current) return;
        setError(
          selectionError instanceof Error
            ? selectionError.message
            : String(selectionError),
        );
        setStatus('error');
      },
    );

    return () => {
      isActive = false;
      if (canSubscribe) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, [applySelectedCalendarIds, clearDisconnectedSelection, loadCalendars]);

  const connect = useCallback(async (): Promise<void> => {
    const generation = calendarRequestGenerationRef.current + 1;
    calendarRequestGenerationRef.current = generation;
    eventRequestGenerationRef.current += 1;
    if (!isMountedRef.current) return;
    setError(null);
    setStatus('loading');
    const connection = await sendCalendarMessage({ type: 'calendar.connect' });
    if (
      !isMountedRef.current ||
      generation !== calendarRequestGenerationRef.current
    ) {
      return;
    }
    if (!connection.ok) {
      setError(connection.error.message);
      setStatus('disconnected');
      return;
    }

    const list = await sendCalendarMessage({ type: 'calendar.listCalendars' });
    if (
      !isMountedRef.current ||
      generation !== calendarRequestGenerationRef.current
    ) {
      return;
    }
    if (!list.ok || list.type !== 'calendar.listCalendars.result') {
      setError(getResponseError(list));
      setStatus('error');
      return;
    }

    setCalendars(list.data);
    setStatus('ready');
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    const generation = calendarRequestGenerationRef.current + 1;
    calendarRequestGenerationRef.current = generation;
    eventRequestGenerationRef.current += 1;
    if (!isMountedRef.current) return;
    setStatus('loading');
    const response = await sendCalendarMessage({
      type: 'calendar.disconnect',
    });
    if (
      !isMountedRef.current ||
      generation !== calendarRequestGenerationRef.current
    ) {
      return;
    }
    if (!response.ok) {
      setError(response.error.message);
      setStatus('error');
      return;
    }

    setCalendars([]);
    clearDisconnectedSelection();
  }, [clearDisconnectedSelection]);

  const setSelectedCalendarIds = useCallback(
    async (ids: readonly string[]): Promise<void> => {
      const normalizedIds = normalizeSelectedCalendarIds(ids);
      pendingSelectionWriteRef.current = normalizedIds;
      try {
        await writeSelectedCalendarIds(normalizedIds);
      } finally {
        pendingSelectionWriteRef.current = null;
      }
      await applySelectedCalendarIds(normalizedIds);
    },
    [applySelectedCalendarIds],
  );

  return {
    calendars,
    connect,
    disconnect,
    error,
    events,
    failures,
    loadCalendars,
    refresh,
    selectedCalendarIds,
    setSelectedCalendarIds,
    status,
  };
}
