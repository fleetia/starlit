import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CalendarMessageResponse } from '../calendar';

const calendarMocks = vi.hoisted(() => ({
  sendCalendarMessage: vi.fn(),
}));

const storageChangeMocks = vi.hoisted(() => ({
  addListener: vi.fn(),
  removeListener: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  get: vi.fn<(key: string) => Promise<Record<string, unknown>>>(),
  set: vi.fn<(items: Record<string, unknown>) => Promise<void>>(),
}));

vi.mock('../calendar', () => ({
  SELECTED_CALENDAR_IDS_STORAGE_KEY: 'googleCalendar.selectedCalendarIds',
  normalizeSelectedCalendarIds: (ids: readonly string[]) =>
    [...new Set(ids.filter((id) => id.trim() !== ''))].sort(),
  sendCalendarMessage: calendarMocks.sendCalendarMessage,
}));

import { useCalendarWidget } from './useCalendarWidget';

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve = (_value: T): void => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function createEventsResponse(summary: string): CalendarMessageResponse {
  return {
    data: {
      events: [
        {
          allDay: false,
          calendarColor: '#123456',
          end: '2026-09-01T11:00:00.000Z',
          htmlLink: null,
          start: '2026-09-01T10:00:00.000Z',
          summary,
        },
      ],
      expiresAt: 2,
      failures: [],
      fetchedAt: 1,
      isFromCache: false,
    },
    ok: true,
    type: 'calendar.listEvents.result',
  };
}

function createCalendarsResponse(): CalendarMessageResponse {
  return {
    data: [
      {
        color: '#123456',
        id: 'work',
        isPrimary: true,
        name: 'Work',
      },
    ],
    ok: true,
    type: 'calendar.listCalendars.result',
  };
}

const PERMISSION_DENIED_RESPONSE: CalendarMessageResponse = {
  error: {
    code: 'permission-denied',
    message: 'Google Calendar access was not granted.',
  },
  ok: false,
  requestType: 'calendar.listCalendars',
  type: 'calendar.error',
};

const AUTH_REQUIRED_RESPONSE: CalendarMessageResponse = {
  error: {
    code: 'auth-required',
    message: 'Google Calendar is not connected.',
  },
  ok: false,
  requestType: 'calendar.listCalendars',
  type: 'calendar.error',
};

beforeEach(() => {
  calendarMocks.sendCalendarMessage
    .mockReset()
    .mockResolvedValue(PERMISSION_DENIED_RESPONSE);
  storageChangeMocks.addListener.mockReset();
  storageChangeMocks.removeListener.mockReset();
  storageMocks.get.mockReset().mockResolvedValue({});
  storageMocks.set.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: storageMocks.get,
        set: storageMocks.set,
      },
      onChanged: {
        addListener: storageChangeMocks.addListener,
        removeListener: storageChangeMocks.removeListener,
      },
    },
  });
});

describe('useCalendarWidget', () => {
  it.each([PERMISSION_DENIED_RESPONSE, AUTH_REQUIRED_RESPONSE])(
    'passively returns to a quiet connect state for $error.code',
    async (passiveResponse) => {
      calendarMocks.sendCalendarMessage.mockResolvedValue(passiveResponse);
      const { result } = renderHook(() => useCalendarWidget());

      await waitFor(() =>
        expect(calendarMocks.sendCalendarMessage).toHaveBeenCalledWith({
          type: 'calendar.listCalendars',
        }),
      );

      expect(result.current).toMatchObject({
        error: null,
        status: 'disconnected',
      });
      expect(calendarMocks.sendCalendarMessage).not.toHaveBeenCalledWith({
        type: 'calendar.connect',
      });
    },
  );

  it('keeps an explicit connect rejection visible', async () => {
    const { result } = renderHook(() => useCalendarWidget());

    await waitFor(() => expect(result.current.status).toBe('disconnected'));
    calendarMocks.sendCalendarMessage.mockResolvedValueOnce({
      error: {
        code: 'permission-denied',
        message: 'Google Calendar access was not granted.',
      },
      ok: false,
      requestType: 'calendar.connect',
      type: 'calendar.error',
    });

    await act(async () => result.current.connect());

    expect(result.current).toMatchObject({
      error: 'Google Calendar access was not granted.',
      status: 'disconnected',
    });
    expect(calendarMocks.sendCalendarMessage).toHaveBeenLastCalledWith({
      type: 'calendar.connect',
    });
  });

  it('keeps a disconnect storage event ahead of a stale passive response', async () => {
    const pending = createDeferred<CalendarMessageResponse>();
    calendarMocks.sendCalendarMessage.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useCalendarWidget());
    await waitFor(() => expect(result.current.status).toBe('loading'));
    const listener = storageChangeMocks.addListener.mock.calls[0]?.[0];
    if (!listener) throw new Error('Expected a storage change listener.');

    act(() => {
      listener(
        {
          'googleCalendar.selectedCalendarIds': {
            newValue: undefined,
            oldValue: [],
          },
        },
        'local',
      );
    });
    expect(result.current.status).toBe('disconnected');

    await act(async () => {
      pending.resolve(createCalendarsResponse());
      await pending.promise;
    });

    expect(result.current.status).toBe('disconnected');
  });

  it('keeps a connected account ready across a remount without a calendar selection', async () => {
    const firstHook = renderHook(() => useCalendarWidget());
    await waitFor(() =>
      expect(firstHook.result.current.status).toBe('disconnected'),
    );
    calendarMocks.sendCalendarMessage.mockImplementation(async (message) => {
      if (message.type === 'calendar.connect') {
        return {
          data: { isConnected: true },
          ok: true,
          type: 'calendar.connect.result',
        };
      }
      if (message.type === 'calendar.listCalendars') {
        return createCalendarsResponse();
      }
      return createEventsResponse('Unused event');
    });

    await act(async () => firstHook.result.current.connect());
    expect(firstHook.result.current.status).toBe('ready');
    expect(firstHook.result.current.selectedCalendarIds).toEqual([]);
    firstHook.unmount();

    const secondHook = renderHook(() => useCalendarWidget());
    await waitFor(() => expect(secondHook.result.current.status).toBe('ready'));

    expect(secondHook.result.current.calendars).toHaveLength(1);
    expect(
      calendarMocks.sendCalendarMessage.mock.calls.filter(
        ([message]) => message.type === 'calendar.connect',
      ),
    ).toHaveLength(1);
  });

  it('keeps an explicitly cleared selection ready across a remount', async () => {
    storageMocks.get.mockResolvedValue({
      'googleCalendar.selectedCalendarIds': ['work'],
    });
    calendarMocks.sendCalendarMessage.mockImplementation(async (message) =>
      message.type === 'calendar.listCalendars'
        ? createCalendarsResponse()
        : createEventsResponse('Work event'),
    );
    const firstHook = renderHook(() => useCalendarWidget());
    await waitFor(() => expect(firstHook.result.current.status).toBe('ready'));

    await act(async () => firstHook.result.current.setSelectedCalendarIds([]));
    expect(firstHook.result.current.selectedCalendarIds).toEqual([]);
    expect(firstHook.result.current.status).toBe('ready');
    firstHook.unmount();
    storageMocks.get.mockResolvedValue({
      'googleCalendar.selectedCalendarIds': [],
    });

    const secondHook = renderHook(() => useCalendarWidget());
    await waitFor(() => expect(secondHook.result.current.status).toBe('ready'));

    expect(secondHook.result.current.selectedCalendarIds).toEqual([]);
    expect(secondHook.result.current.calendars).toHaveLength(1);
  });

  it('keeps a newer calendar selection when an older request resolves last', async () => {
    const first = createDeferred<CalendarMessageResponse>();
    const second = createDeferred<CalendarMessageResponse>();
    const { result } = renderHook(() => useCalendarWidget());
    await waitFor(() => expect(result.current.status).toBe('disconnected'));
    calendarMocks.sendCalendarMessage
      .mockReset()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    let firstUpdate: Promise<void> | undefined;
    act(() => {
      firstUpdate = result.current.setSelectedCalendarIds(['work']);
    });
    await waitFor(() =>
      expect(calendarMocks.sendCalendarMessage).toHaveBeenCalledWith({
        calendarIds: ['work'],
        type: 'calendar.listEvents',
      }),
    );

    let secondUpdate: Promise<void> | undefined;
    act(() => {
      secondUpdate = result.current.setSelectedCalendarIds(['personal']);
    });
    await waitFor(() =>
      expect(calendarMocks.sendCalendarMessage).toHaveBeenCalledTimes(2),
    );
    if (!secondUpdate || !firstUpdate) {
      throw new Error('Expected both selection updates to start.');
    }

    await act(async () => {
      second.resolve(createEventsResponse('Personal event'));
      await secondUpdate;
    });
    expect(result.current.events[0]?.summary).toBe('Personal event');

    await act(async () => {
      first.resolve(createEventsResponse('Stale work event'));
      await firstUpdate;
    });
    expect(result.current.events[0]?.summary).toBe('Personal event');
    expect(result.current.selectedCalendarIds).toEqual(['personal']);
  });

  it('reloads events when Settings changes the local calendar selection', async () => {
    storageMocks.get.mockResolvedValue({
      'googleCalendar.selectedCalendarIds': ['work'],
    });
    calendarMocks.sendCalendarMessage.mockImplementation(
      async (message: { calendarIds?: string[] }) =>
        createEventsResponse(
          message.calendarIds?.[0] === 'personal'
            ? 'Personal event'
            : 'Work event',
        ),
    );
    const { result } = renderHook(() => useCalendarWidget());

    await waitFor(() =>
      expect(result.current.events[0]?.summary).toBe('Work event'),
    );
    const listener = storageChangeMocks.addListener.mock.calls[0]?.[0];
    if (!listener) throw new Error('Expected a storage change listener.');

    act(() => {
      listener(
        {
          'googleCalendar.selectedCalendarIds': {
            newValue: ['personal'],
            oldValue: ['work'],
          },
        },
        'local',
      );
    });

    await waitFor(() => {
      expect(result.current.selectedCalendarIds).toEqual(['personal']);
      expect(result.current.events[0]?.summary).toBe('Personal event');
    });
  });

  it('ignores pending responses and storage changes after unmount', async () => {
    const pending = createDeferred<CalendarMessageResponse>();
    storageMocks.get.mockResolvedValue({
      'googleCalendar.selectedCalendarIds': ['work'],
    });
    calendarMocks.sendCalendarMessage.mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(() => useCalendarWidget());

    await waitFor(() => expect(result.current.status).toBe('loading'));
    const listener = storageChangeMocks.addListener.mock.calls[0]?.[0];
    if (!listener) throw new Error('Expected a storage change listener.');
    unmount();

    act(() => {
      listener(
        {
          'googleCalendar.selectedCalendarIds': {
            newValue: ['personal'],
            oldValue: ['work'],
          },
        },
        'local',
      );
    });
    pending.resolve(createEventsResponse('Too late'));
    await pending.promise;

    expect(storageChangeMocks.removeListener).toHaveBeenCalledWith(listener);
    expect(calendarMocks.sendCalendarMessage).toHaveBeenCalledTimes(1);
    expect(result.current.events).toEqual([]);
  });
});
