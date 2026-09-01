import type { CalendarGatewayError, CalendarGatewayErrorCode } from './types';

const CALENDAR_ERROR_MESSAGES: Record<CalendarGatewayErrorCode, string> = {
  'api-error': 'The Calendar feed request failed.',
  'invalid-request': 'The Calendar feed URL is invalid.',
  'invalid-response': 'The Calendar feed returned invalid iCalendar data.',
  'network-error': 'The Calendar feed is temporarily unavailable.',
  'permission-denied': 'Calendar feed access was not granted.',
  'response-too-large': 'The Calendar feed is too large.',
  unavailable: 'Calendar feed access is unavailable.',
};

export function createCalendarGatewayError(
  code: CalendarGatewayErrorCode,
  status?: number,
): CalendarGatewayError {
  const error = Object.assign(new Error(CALENDAR_ERROR_MESSAGES[code]), {
    code,
    name: 'CalendarGatewayError',
  });

  return status === undefined ? error : Object.assign(error, { status });
}

export function isCalendarGatewayError(
  value: unknown,
): value is CalendarGatewayError {
  if (!(value instanceof Error) || !('code' in value)) return false;

  return (
    value.code === 'api-error' ||
    value.code === 'invalid-request' ||
    value.code === 'invalid-response' ||
    value.code === 'network-error' ||
    value.code === 'permission-denied' ||
    value.code === 'response-too-large' ||
    value.code === 'unavailable'
  );
}
