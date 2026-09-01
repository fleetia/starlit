import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CalendarMessageResponse } from '../calendar';
import { useCalendarWidget } from './useCalendarWidget';

function getSendMessageMock(): ReturnType<
  typeof vi.fn<(message: unknown) => Promise<CalendarMessageResponse>>
> {
  return chrome.runtime.sendMessage as unknown as ReturnType<
    typeof vi.fn<(message: unknown) => Promise<CalendarMessageResponse>>
  >;
}

function getPermissionRequestMock(): ReturnType<
  typeof vi.fn<(permissions: { origins?: string[] }) => Promise<boolean>>
> {
  return chrome.permissions.request as unknown as ReturnType<
    typeof vi.fn<(permissions: { origins?: string[] }) => Promise<boolean>>
  >;
}

describe('useCalendarWidget', () => {
  beforeEach(() => {
    getSendMessageMock().mockReset();
    getPermissionRequestMock().mockReset().mockResolvedValue(true);
  });

  it('loads events for its own feed URL', async () => {
    getSendMessageMock().mockResolvedValue({
      data: {
        events: [
          {
            allDay: false,
            calendarColor: null,
            end: '2026-09-01T10:00:00.000Z',
            htmlLink: null,
            start: '2026-09-01T09:00:00.000Z',
            summary: 'Meeting',
          },
        ],
        expiresAt: 2,
        fetchedAt: 1,
        isFromCache: false,
        name: 'Work',
      },
      ok: true,
      type: 'calendar.listEvents.result',
    });

    const { result } = renderHook(() =>
      useCalendarWidget('https://example.com/feed.ics'),
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.events[0]?.summary).toBe('Meeting');
    expect(getSendMessageMock()).toHaveBeenCalledWith({
      feedUrl: 'https://example.com/feed.ics',
      type: 'calendar.listEvents',
    });
  });

  it('subscribes from a user action before forcing a refresh', async () => {
    getSendMessageMock()
      .mockResolvedValueOnce({
        data: { isConnected: true },
        ok: true,
        type: 'calendar.subscribe.result',
      })
      .mockResolvedValueOnce({
        data: {
          events: [],
          expiresAt: 2,
          fetchedAt: 1,
          isFromCache: false,
          name: '',
        },
        ok: true,
        type: 'calendar.listEvents.result',
      });
    const { result } = renderHook(() => useCalendarWidget(null));

    await act(async () => {
      await result.current.subscribe('https://example.com/feed.ics');
    });

    expect(getPermissionRequestMock()).toHaveBeenCalledWith({
      origins: ['https://example.com/*'],
    });
    expect(getSendMessageMock()).toHaveBeenNthCalledWith(1, {
      feedUrl: 'https://example.com/feed.ics',
      type: 'calendar.subscribe',
    });
    expect(getSendMessageMock()).toHaveBeenNthCalledWith(2, {
      feedUrl: 'https://example.com/feed.ics',
      forceRefresh: true,
      type: 'calendar.listEvents',
    });
  });

  it('does not contact the background worker when host access is denied', async () => {
    getPermissionRequestMock().mockResolvedValue(false);
    const { result } = renderHook(() => useCalendarWidget(null));

    await act(async () => {
      await result.current.subscribe('https://example.com/feed.ics');
    });

    expect(result.current.status).toBe('disconnected');
    expect(result.current.error).toBe('Calendar feed access was not granted.');
    expect(getSendMessageMock()).not.toHaveBeenCalled();
  });
});
