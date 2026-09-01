import { isCalendarGatewayError } from './errors';
import { isStoredCalendarEvent } from './parsers';
import { isCalendarId, MAX_SELECTED_CALENDARS } from './selectionStorage';
import type {
  CalendarConnection,
  CalendarEventsResult,
  CalendarGateway,
  CalendarGatewayErrorCode,
  CalendarInfo,
} from './types';

export type CalendarConnectMessage = {
  type: 'calendar.connect';
};

export type CalendarDisconnectMessage = {
  type: 'calendar.disconnect';
};

export type CalendarListCalendarsMessage = {
  type: 'calendar.listCalendars';
};

export type CalendarListEventsMessage = {
  calendarIds: string[];
  type: 'calendar.listEvents';
};

export type CalendarMessage =
  | CalendarConnectMessage
  | CalendarDisconnectMessage
  | CalendarListCalendarsMessage
  | CalendarListEventsMessage;

export type CalendarMessageType = CalendarMessage['type'];

export type CalendarMessageResponse =
  | {
      data: CalendarConnection;
      ok: true;
      type: 'calendar.connect.result';
    }
  | {
      data: { isConnected: false };
      ok: true;
      type: 'calendar.disconnect.result';
    }
  | {
      data: CalendarInfo[];
      ok: true;
      type: 'calendar.listCalendars.result';
    }
  | {
      data: CalendarEventsResult;
      ok: true;
      type: 'calendar.listEvents.result';
    }
  | {
      error: { code: CalendarGatewayErrorCode; message: string };
      ok: false;
      requestType: CalendarMessageType;
      type: 'calendar.error';
    };

export type CalendarMessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: CalendarMessageResponse) => void,
) => boolean | undefined;

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

function isCalendarGatewayErrorCode(
  value: unknown,
): value is CalendarGatewayErrorCode {
  return (
    value === 'api-error' ||
    value === 'auth-required' ||
    value === 'invalid-request' ||
    value === 'invalid-response' ||
    value === 'network-error' ||
    value === 'permission-denied' ||
    value === 'unavailable'
  );
}

function isCalendarInfo(value: unknown): value is CalendarInfo {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['color', 'id', 'isPrimary', 'name']) &&
    (value.color === null ||
      (typeof value.color === 'string' &&
        /^#[0-9a-f]{6}$/iu.test(value.color))) &&
    isCalendarId(value.id) &&
    typeof value.isPrimary === 'boolean' &&
    typeof value.name === 'string'
  );
}

function isCalendarEventsResult(value: unknown): value is CalendarEventsResult {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      'events',
      'expiresAt',
      'failures',
      'fetchedAt',
      'isFromCache',
    ]) &&
    Array.isArray(value.events) &&
    value.events.every(isStoredCalendarEvent) &&
    Array.isArray(value.failures) &&
    value.failures.every(
      (failure) =>
        isRecord(failure) &&
        hasExactKeys(failure, ['calendarId', 'reason']) &&
        isCalendarId(failure.calendarId) &&
        (failure.reason === 'auth-required' ||
          failure.reason === 'forbidden' ||
          failure.reason === 'invalid-response' ||
          failure.reason === 'network' ||
          failure.reason === 'not-found' ||
          failure.reason === 'unknown'),
    ) &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt) &&
    typeof value.fetchedAt === 'number' &&
    Number.isFinite(value.fetchedAt) &&
    value.expiresAt >= value.fetchedAt &&
    typeof value.isFromCache === 'boolean'
  );
}

export function isCalendarMessage(value: unknown): value is CalendarMessage {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.type === 'calendar.connect' ||
    value.type === 'calendar.disconnect' ||
    value.type === 'calendar.listCalendars'
  ) {
    return hasExactKeys(value, ['type']);
  }

  return (
    value.type === 'calendar.listEvents' &&
    hasExactKeys(value, ['calendarIds', 'type']) &&
    Array.isArray(value.calendarIds) &&
    value.calendarIds.length <= MAX_SELECTED_CALENDARS &&
    value.calendarIds.every(isCalendarId)
  );
}

export function isCalendarMessageResponse(
  value: unknown,
): value is CalendarMessageResponse {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return false;
  }

  if (value.ok === false) {
    return (
      hasExactKeys(value, ['error', 'ok', 'requestType', 'type']) &&
      value.type === 'calendar.error' &&
      (value.requestType === 'calendar.connect' ||
        value.requestType === 'calendar.disconnect' ||
        value.requestType === 'calendar.listCalendars' ||
        value.requestType === 'calendar.listEvents') &&
      isRecord(value.error) &&
      hasExactKeys(value.error, ['code', 'message']) &&
      isCalendarGatewayErrorCode(value.error.code) &&
      typeof value.error.message === 'string'
    );
  }

  if (!('data' in value)) {
    return false;
  }

  switch (value.type) {
    case 'calendar.connect.result':
      return (
        hasExactKeys(value, ['data', 'ok', 'type']) &&
        isRecord(value.data) &&
        hasExactKeys(value.data, ['isConnected']) &&
        value.data.isConnected === true
      );
    case 'calendar.disconnect.result':
      return (
        hasExactKeys(value, ['data', 'ok', 'type']) &&
        isRecord(value.data) &&
        hasExactKeys(value.data, ['isConnected']) &&
        value.data.isConnected === false
      );
    case 'calendar.listCalendars.result':
      return (
        hasExactKeys(value, ['data', 'ok', 'type']) &&
        Array.isArray(value.data) &&
        value.data.every(isCalendarInfo)
      );
    case 'calendar.listEvents.result':
      return (
        hasExactKeys(value, ['data', 'ok', 'type']) &&
        isCalendarEventsResult(value.data)
      );
    default:
      return false;
  }
}

async function handleCalendarMessage(
  message: CalendarMessage,
  gateway: CalendarGateway,
): Promise<CalendarMessageResponse> {
  switch (message.type) {
    case 'calendar.connect':
      return {
        data: await gateway.connect(),
        ok: true,
        type: 'calendar.connect.result',
      };
    case 'calendar.disconnect':
      await gateway.disconnect();
      return {
        data: { isConnected: false },
        ok: true,
        type: 'calendar.disconnect.result',
      };
    case 'calendar.listCalendars':
      return {
        data: await gateway.listCalendars(),
        ok: true,
        type: 'calendar.listCalendars.result',
      };
    case 'calendar.listEvents':
      return {
        data: await gateway.listEvents(message.calendarIds),
        ok: true,
        type: 'calendar.listEvents.result',
      };
  }
}

function createErrorResponse(
  requestType: CalendarMessageType,
  error: unknown,
): CalendarMessageResponse {
  if (isCalendarGatewayError(error)) {
    return {
      error: { code: error.code, message: error.message },
      ok: false,
      requestType,
      type: 'calendar.error',
    };
  }

  return {
    error: {
      code: 'api-error',
      message: 'Google Calendar request failed.',
    },
    ok: false,
    requestType,
    type: 'calendar.error',
  };
}

export function createCalendarMessageListener(
  gateway: CalendarGateway,
): CalendarMessageListener {
  return (message, _sender, sendResponse) => {
    if (!isCalendarMessage(message)) {
      return undefined;
    }

    void handleCalendarMessage(message, gateway)
      .catch((error: unknown) => createErrorResponse(message.type, error))
      .then((response) => {
        try {
          sendResponse(response);
        } catch {
          // The requesting extension page closed before the worker responded.
        }
      });

    return true;
  };
}
