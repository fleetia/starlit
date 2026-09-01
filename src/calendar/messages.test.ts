import { describe, expect, it, vi } from 'vitest';

import { createCalendarGatewayError } from './errors';
import {
  createCalendarMessageListener,
  isCalendarMessage,
  isCalendarMessageResponse,
  type CalendarMessageResponse,
} from './messages';
import type { CalendarGateway } from './types';

function createGateway(): CalendarGateway {
  return {
    connect: vi.fn(async () => ({ isConnected: true as const })),
    disconnect: vi.fn(async () => undefined),
    getSelectedCalendarIds: vi.fn(async () => []),
    listCalendars: vi.fn(async () => []),
    listEvents: vi.fn(async () => ({
      events: [],
      expiresAt: 2,
      failures: [],
      fetchedAt: 1,
      isFromCache: false,
    })),
    setSelectedCalendarIds: vi.fn(async () => undefined),
  };
}

async function invokeListener(
  gateway: CalendarGateway,
  message: unknown,
): Promise<{
  handled: boolean | undefined;
  response?: CalendarMessageResponse;
}> {
  const listener = createCalendarMessageListener(gateway);
  let resolveResponse = (_response?: CalendarMessageResponse): void =>
    undefined;
  const responsePromise = new Promise<CalendarMessageResponse | undefined>(
    (resolve) => {
      resolveResponse = resolve;
    },
  );
  const handled = listener(message, {}, (response) =>
    resolveResponse(response),
  );

  if (!handled) {
    return { handled };
  }

  return { handled, response: await responsePromise };
}

describe('Calendar message contract', () => {
  it('accepts only the four owned Calendar message shapes', () => {
    expect(isCalendarMessage({ type: 'calendar.connect' })).toBe(true);
    expect(isCalendarMessage({ type: 'calendar.disconnect' })).toBe(true);
    expect(isCalendarMessage({ type: 'calendar.listCalendars' })).toBe(true);
    expect(
      isCalendarMessage({ calendarIds: ['work'], type: 'calendar.listEvents' }),
    ).toBe(true);
    expect(
      isCalendarMessage({ calendarIds: [42], type: 'calendar.listEvents' }),
    ).toBe(false);
    expect(
      isCalendarMessage({
        calendarIds: ['work'],
        token: 'must-not-cross-the-boundary',
        type: 'calendar.listEvents',
      }),
    ).toBe(false);
    expect(
      isCalendarMessage({ token: 'unexpected', type: 'calendar.connect' }),
    ).toBe(false);
    expect(
      isCalendarMessage({ calendarIds: ['   '], type: 'calendar.listEvents' }),
    ).toBe(false);
    expect(isCalendarMessage({ type: 'calendar.writeEvent' })).toBe(false);
  });

  it('rejects malformed worker responses at the extension-page boundary', () => {
    expect(
      isCalendarMessageResponse({
        data: { events: [{ description: 'private' }] },
        ok: true,
        type: 'calendar.listEvents.result',
      }),
    ).toBe(false);
    expect(
      isCalendarMessageResponse({
        data: { isConnected: true },
        ok: true,
        type: 'calendar.connect.result',
      }),
    ).toBe(true);
    expect(
      isCalendarMessageResponse({
        data: { isConnected: true },
        ok: true,
        token: 'must-not-cross-the-boundary',
        type: 'calendar.connect.result',
      }),
    ).toBe(false);
    expect(
      isCalendarMessageResponse({
        data: {
          events: [
            {
              allDay: false,
              calendarColor: null,
              description: 'private',
              end: '2026-09-01T10:00:00Z',
              htmlLink: null,
              start: '2026-09-01T09:00:00Z',
              summary: 'Meeting',
            },
          ],
          expiresAt: 2,
          failures: [],
          fetchedAt: 1,
          isFromCache: false,
        },
        ok: true,
        type: 'calendar.listEvents.result',
      }),
    ).toBe(false);
  });

  it('starts interactive auth only for an explicit connect message', async () => {
    const gateway = createGateway();
    const listener = createCalendarMessageListener(gateway);

    expect(gateway.connect).not.toHaveBeenCalled();
    listener({ type: 'unrelated' }, {}, vi.fn());
    expect(gateway.connect).not.toHaveBeenCalled();

    const result = await invokeListener(gateway, { type: 'calendar.connect' });

    expect(result).toEqual({
      handled: true,
      response: {
        data: { isConnected: true },
        ok: true,
        type: 'calendar.connect.result',
      },
    });
    expect(gateway.connect).toHaveBeenCalledOnce();
  });

  it('routes selected IDs to listEvents without exposing a token', async () => {
    const gateway = createGateway();

    const result = await invokeListener(gateway, {
      calendarIds: ['work', 'personal'],
      type: 'calendar.listEvents',
    });

    expect(gateway.listEvents).toHaveBeenCalledWith(['work', 'personal']);
    expect(result.response).toMatchObject({
      ok: true,
      type: 'calendar.listEvents.result',
    });
    expect(result.response).not.toHaveProperty('token');
  });

  it('returns a bounded error contract and hides unexpected exception details', async () => {
    const gateway = createGateway();
    vi.mocked(gateway.listCalendars)
      .mockRejectedValueOnce(createCalendarGatewayError('auth-required'))
      .mockRejectedValueOnce(new Error('sensitive provider response'));

    const expectedError = await invokeListener(gateway, {
      type: 'calendar.listCalendars',
    });
    const unexpectedError = await invokeListener(gateway, {
      type: 'calendar.listCalendars',
    });

    expect(expectedError.response).toEqual({
      error: {
        code: 'auth-required',
        message: 'Google Calendar is not connected.',
      },
      ok: false,
      requestType: 'calendar.listCalendars',
      type: 'calendar.error',
    });
    expect(unexpectedError.response).toEqual({
      error: {
        code: 'api-error',
        message: 'Google Calendar request failed.',
      },
      ok: false,
      requestType: 'calendar.listCalendars',
      type: 'calendar.error',
    });
  });
});
