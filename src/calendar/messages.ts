import { isCalendarEventsResult } from './eventCodec';
import { isCalendarGatewayError } from './errors';
import { isCalendarFeedUrl } from './feedUrl';
import type {
  CalendarEventsResult,
  CalendarGateway,
  CalendarGatewayErrorCode,
  CalendarSubscription,
} from './types';

export type CalendarSubscribeMessage = {
  feedUrl: string;
  type: 'calendar.subscribe';
};

export type CalendarListEventsMessage = {
  feedUrl: string;
  forceRefresh?: boolean;
  type: 'calendar.listEvents';
};

export type CalendarMessage =
  | CalendarListEventsMessage
  | CalendarSubscribeMessage;

export type CalendarMessageType = CalendarMessage['type'];

export type CalendarMessageResponse =
  | {
      data: CalendarSubscription;
      ok: true;
      type: 'calendar.subscribe.result';
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
    value === 'invalid-request' ||
    value === 'invalid-response' ||
    value === 'network-error' ||
    value === 'permission-denied' ||
    value === 'response-too-large' ||
    value === 'unavailable'
  );
}

export function isCalendarMessage(value: unknown): value is CalendarMessage {
  if (!isRecord(value) || !isCalendarFeedUrl(value.feedUrl)) return false;

  if (value.type === 'calendar.subscribe') {
    return hasExactKeys(value, ['feedUrl', 'type']);
  }

  return (
    value.type === 'calendar.listEvents' &&
    (hasExactKeys(value, ['feedUrl', 'type']) ||
      (hasExactKeys(value, ['feedUrl', 'forceRefresh', 'type']) &&
        typeof value.forceRefresh === 'boolean'))
  );
}

export function isCalendarMessageResponse(
  value: unknown,
): value is CalendarMessageResponse {
  if (!isRecord(value) || typeof value.ok !== 'boolean') return false;

  if (value.ok === false) {
    return (
      hasExactKeys(value, ['error', 'ok', 'requestType', 'type']) &&
      value.type === 'calendar.error' &&
      (value.requestType === 'calendar.subscribe' ||
        value.requestType === 'calendar.listEvents') &&
      isRecord(value.error) &&
      hasExactKeys(value.error, ['code', 'message']) &&
      isCalendarGatewayErrorCode(value.error.code) &&
      typeof value.error.message === 'string'
    );
  }

  if (!('data' in value)) return false;
  if (value.type === 'calendar.subscribe.result') {
    return (
      hasExactKeys(value, ['data', 'ok', 'type']) &&
      isRecord(value.data) &&
      hasExactKeys(value.data, ['isConnected']) &&
      value.data.isConnected === true
    );
  }

  return (
    value.type === 'calendar.listEvents.result' &&
    hasExactKeys(value, ['data', 'ok', 'type']) &&
    isCalendarEventsResult(value.data)
  );
}

async function handleCalendarMessage(
  message: CalendarMessage,
  gateway: CalendarGateway,
): Promise<CalendarMessageResponse> {
  if (message.type === 'calendar.subscribe') {
    return {
      data: await gateway.subscribe(message.feedUrl),
      ok: true,
      type: 'calendar.subscribe.result',
    };
  }

  return {
    data: await gateway.listEvents(message.feedUrl, message.forceRefresh),
    ok: true,
    type: 'calendar.listEvents.result',
  };
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
    error: { code: 'api-error', message: 'The Calendar feed request failed.' },
    ok: false,
    requestType,
    type: 'calendar.error',
  };
}

export function createCalendarMessageListener(
  gateway: CalendarGateway,
): CalendarMessageListener {
  return (message, _sender, sendResponse) => {
    if (!isCalendarMessage(message)) return undefined;

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
