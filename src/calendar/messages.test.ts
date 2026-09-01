import { describe, expect, it, vi } from 'vitest';

import {
  createCalendarMessageListener,
  isCalendarMessage,
  isCalendarMessageResponse,
} from './messages';
import type { CalendarGateway } from './types';

describe('Calendar messages', () => {
  it('accepts only strict HTTPS feed messages', () => {
    expect(
      isCalendarMessage({
        feedUrl: 'https://example.com/feed.ics',
        type: 'calendar.subscribe',
      }),
    ).toBe(true);
    expect(
      isCalendarMessage({
        feedUrl: 'http://example.com/feed.ics',
        type: 'calendar.subscribe',
      }),
    ).toBe(false);
    expect(
      isCalendarMessage({
        extra: true,
        feedUrl: 'https://example.com/feed.ics',
        type: 'calendar.listEvents',
      }),
    ).toBe(false);
  });

  it('routes a list request and validates its response', async () => {
    const gateway: CalendarGateway = {
      listEvents: vi.fn(async () => ({
        events: [],
        expiresAt: 2,
        fetchedAt: 1,
        isFromCache: false,
        name: 'Work',
      })),
      subscribe: vi.fn(async () => ({ isConnected: true as const })),
    };
    const listener = createCalendarMessageListener(gateway);
    const response = await new Promise<unknown>((resolve) => {
      expect(
        listener(
          {
            feedUrl: 'https://example.com/feed.ics',
            forceRefresh: true,
            type: 'calendar.listEvents',
          },
          {},
          resolve,
        ),
      ).toBe(true);
    });

    expect(gateway.listEvents).toHaveBeenCalledWith(
      'https://example.com/feed.ics',
      true,
    );
    expect(isCalendarMessageResponse(response)).toBe(true);
  });

  it('rejects event responses above the gateway result limit', () => {
    const event = {
      allDay: false,
      calendarColor: null,
      end: '2026-09-01T10:00:00.000Z',
      htmlLink: null,
      start: '2026-09-01T09:00:00.000Z',
      summary: 'Meeting',
    };

    expect(
      isCalendarMessageResponse({
        data: {
          events: Array.from({ length: 51 }, () => event),
          expiresAt: 2,
          fetchedAt: 1,
          isFromCache: false,
          name: 'Work',
        },
        ok: true,
        type: 'calendar.listEvents.result',
      }),
    ).toBe(false);
  });
});
