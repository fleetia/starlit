import type {
  CalendarFetchFailureReason,
  CalendarGatewayError,
  CalendarGatewayErrorCode,
} from './types';

const CALENDAR_ERROR_MESSAGES: Record<CalendarGatewayErrorCode, string> = {
  'api-error': 'Google Calendar request failed.',
  'auth-required': 'Google Calendar is not connected.',
  'invalid-request': 'The Calendar request is invalid.',
  'invalid-response': 'Google Calendar returned an invalid response.',
  'network-error': 'Google Calendar is temporarily unavailable.',
  'permission-denied': 'Google Calendar access was not granted.',
  unavailable: 'Google Calendar APIs are unavailable.',
};

export function createCalendarGatewayError(
  code: CalendarGatewayErrorCode,
  status?: number,
): CalendarGatewayError {
  const error = Object.assign(new Error(CALENDAR_ERROR_MESSAGES[code]), {
    code,
    name: 'CalendarGatewayError',
  });

  if (status !== undefined) {
    return Object.assign(error, { status });
  }

  return error;
}

export function isCalendarGatewayError(
  value: unknown,
): value is CalendarGatewayError {
  if (!(value instanceof Error) || !('code' in value)) {
    return false;
  }

  return (
    value.code === 'api-error' ||
    value.code === 'auth-required' ||
    value.code === 'invalid-request' ||
    value.code === 'invalid-response' ||
    value.code === 'network-error' ||
    value.code === 'permission-denied' ||
    value.code === 'unavailable'
  );
}

export function getCalendarFetchFailureReason(
  error: unknown,
): CalendarFetchFailureReason {
  if (!isCalendarGatewayError(error)) {
    return 'unknown';
  }

  if (error.code === 'auth-required' || error.status === 401) {
    return 'auth-required';
  }

  if (error.code === 'network-error') {
    return 'network';
  }

  if (error.code === 'invalid-response') {
    return 'invalid-response';
  }

  if (error.status === 403) {
    return 'forbidden';
  }

  if (error.status === 404) {
    return 'not-found';
  }

  return 'unknown';
}
