import { createCalendarGatewayError } from './errors';
import type { CalendarEvent, CalendarInfo } from './types';

type CalendarListPage = {
  calendars: CalendarInfo[];
  nextPageToken?: string;
};

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

function getOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getCalendarColor(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/iu.test(value)
    ? value
    : null;
}

function getHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === value
  );
}

function parseCalendarInfo(value: unknown): CalendarInfo | null {
  if (!isRecord(value) || value.deleted === true) {
    return null;
  }

  const id = getOptionalString(value.id);
  if (!id) {
    return null;
  }

  return {
    color: getCalendarColor(value.backgroundColor),
    id,
    isPrimary: value.primary === true,
    name:
      getOptionalString(value.summaryOverride) ??
      getOptionalString(value.summary) ??
      id,
  };
}

export function parseCalendarListPage(value: unknown): CalendarListPage {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw createCalendarGatewayError('invalid-response');
  }

  const calendars = value.items.flatMap((item) => {
    const calendar = parseCalendarInfo(item);
    return calendar ? [calendar] : [];
  });
  const nextPageToken = getOptionalString(value.nextPageToken);

  return {
    calendars,
    ...(nextPageToken ? { nextPageToken } : {}),
  };
}

function getEventTimes(
  value: Record<string, unknown>,
): { allDay: boolean; end: string; start: string } | null {
  if (!isRecord(value.start) || !isRecord(value.end)) {
    return null;
  }

  const allDayStart = getOptionalString(value.start.date);
  const allDayEnd = getOptionalString(value.end.date);
  if (
    allDayStart &&
    allDayEnd &&
    isCalendarDate(allDayStart) &&
    isCalendarDate(allDayEnd) &&
    allDayEnd > allDayStart
  ) {
    return { allDay: true, end: allDayEnd, start: allDayStart };
  }

  const timedStart = getOptionalString(value.start.dateTime);
  const timedEnd = getOptionalString(value.end.dateTime);
  if (!timedStart || !timedEnd) {
    return null;
  }

  if (
    !Number.isFinite(Date.parse(timedStart)) ||
    !Number.isFinite(Date.parse(timedEnd)) ||
    Date.parse(timedEnd) <= Date.parse(timedStart)
  ) {
    return null;
  }

  return { allDay: false, end: timedEnd, start: timedStart };
}

function parseCalendarEvent(
  value: unknown,
  calendarColor: string | null,
): CalendarEvent | null {
  if (!isRecord(value) || value.status === 'cancelled') {
    return null;
  }

  const times = getEventTimes(value);
  if (!times) {
    return null;
  }

  return {
    ...times,
    calendarColor,
    htmlLink: getHttpsUrl(value.htmlLink),
    summary: typeof value.summary === 'string' ? value.summary : '',
  };
}

export function parseCalendarEventsPage(
  value: unknown,
  calendarColor: string | null,
): CalendarEvent[] {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw createCalendarGatewayError('invalid-response');
  }

  return value.items.flatMap((item) => {
    const event = parseCalendarEvent(item, calendarColor);
    return event ? [event] : [];
  });
}

export function isStoredCalendarEvent(value: unknown): value is CalendarEvent {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'allDay',
      'calendarColor',
      'end',
      'htmlLink',
      'start',
      'summary',
    ]) ||
    typeof value.allDay !== 'boolean' ||
    (value.calendarColor !== null &&
      getCalendarColor(value.calendarColor) === null) ||
    typeof value.end !== 'string' ||
    (value.htmlLink !== null && getHttpsUrl(value.htmlLink) === null) ||
    typeof value.start !== 'string' ||
    typeof value.summary !== 'string'
  ) {
    return false;
  }

  if (value.allDay) {
    return (
      isCalendarDate(value.start) &&
      isCalendarDate(value.end) &&
      value.end > value.start
    );
  }

  return (
    Number.isFinite(Date.parse(value.start)) &&
    Number.isFinite(Date.parse(value.end)) &&
    Date.parse(value.end) > Date.parse(value.start)
  );
}
