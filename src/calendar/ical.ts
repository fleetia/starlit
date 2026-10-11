import ICAL from 'ical.js';

import { createCalendarGatewayError, isCalendarGatewayError } from './errors';
import type { CalendarEvent, ParsedCalendarFeed } from './types';

const MAX_EXPANDED_OCCURRENCES = 50_000;
const MAX_PARSED_EVENT_COMPONENTS = 1_000;
const MAX_EVENT_SUMMARY_LENGTH = 240;

type ExpansionBudget = { remaining: number };

function getCalendarName(
  calendar: InstanceType<typeof ICAL.Component>,
): string {
  const name = calendar.getFirstPropertyValue('x-wr-calname');
  return typeof name === 'string' && name.trim() !== ''
    ? name.trim().slice(0, MAX_EVENT_SUMMARY_LENGTH)
    : '';
}

function getCalendarColor(
  calendar: InstanceType<typeof ICAL.Component>,
): string | null {
  const color = calendar.getFirstPropertyValue('color');
  return typeof color === 'string' && /^#[0-9a-f]{6}$/iu.test(color)
    ? color
    : null;
}

function getSafeEventLink(
  event: InstanceType<typeof ICAL.Event>,
): string | null {
  const value = event.component.getFirstPropertyValue('url');
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function getEventSummary(event: InstanceType<typeof ICAL.Event>): string {
  const rawSummary: unknown = event.summary;
  const summary = typeof rawSummary === 'string' ? rawSummary.trim() : '';
  return (summary === '' ? 'Untitled' : summary).slice(
    0,
    MAX_EVENT_SUMMARY_LENGTH,
  );
}

function getDateOnly(time: InstanceType<typeof ICAL.Time>): string {
  return `${String(time.year).padStart(4, '0')}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;
}

function getComparableTime(time: InstanceType<typeof ICAL.Time>): number {
  return time.isDate
    ? Date.UTC(time.year, time.month - 1, time.day)
    : time.toJSDate().getTime();
}

function getStoredTime(time: InstanceType<typeof ICAL.Time>): string {
  return time.isDate ? getDateOnly(time) : time.toJSDate().toISOString();
}

function isCancelled(event: InstanceType<typeof ICAL.Event>): boolean {
  const status = event.component.getFirstPropertyValue('status');
  return typeof status === 'string' && status.toUpperCase() === 'CANCELLED';
}

function createCalendarEvent(
  event: InstanceType<typeof ICAL.Event>,
  startDate: InstanceType<typeof ICAL.Time>,
  endDate: InstanceType<typeof ICAL.Time>,
  calendarColor: string | null,
): CalendarEvent {
  return {
    allDay: startDate.isDate,
    calendarColor,
    end: getStoredTime(endDate),
    htmlLink: getSafeEventLink(event),
    start: getStoredTime(startDate),
    summary: getEventSummary(event),
  };
}

function overlapsWindow(
  startDate: InstanceType<typeof ICAL.Time>,
  endDate: InstanceType<typeof ICAL.Time>,
  timeMin: number,
  timeMax: number,
): boolean {
  return (
    getComparableTime(endDate) > timeMin &&
    getComparableTime(startDate) < timeMax
  );
}

function expandEvent(
  event: InstanceType<typeof ICAL.Event>,
  calendarColor: string | null,
  timeMin: Date,
  timeMax: Date,
  budget: ExpansionBudget,
): CalendarEvent[] {
  if (event.isRecurrenceException() || isCancelled(event)) return [];

  const minTime = timeMin.getTime();
  const maxTime = timeMax.getTime();
  if (!event.isRecurring()) {
    return overlapsWindow(event.startDate, event.endDate, minTime, maxTime)
      ? [
          createCalendarEvent(
            event,
            event.startDate,
            event.endDate,
            calendarColor,
          ),
        ]
      : [];
  }

  const iterator = event.iterator();
  const occurrences: CalendarEvent[] = [];

  while (budget.remaining > 0) {
    budget.remaining -= 1;
    const occurrence = iterator.next();
    if (!occurrence) break;

    const details = event.getOccurrenceDetails(occurrence);
    if (getComparableTime(details.startDate) >= maxTime) break;
    if (
      !isCancelled(details.item) &&
      overlapsWindow(details.startDate, details.endDate, minTime, maxTime)
    ) {
      occurrences.push(
        createCalendarEvent(
          details.item,
          details.startDate,
          details.endDate,
          calendarColor,
        ),
      );
    }
  }

  return occurrences;
}

function compareCalendarEvents(
  first: CalendarEvent,
  second: CalendarEvent,
): number {
  const firstDate = first.start.slice(0, 10);
  const secondDate = second.start.slice(0, 10);
  if (firstDate !== secondDate) return firstDate < secondDate ? -1 : 1;
  if (first.allDay !== second.allDay) return first.allDay ? -1 : 1;

  const timeDifference = Date.parse(first.start) - Date.parse(second.start);
  if (timeDifference !== 0) return timeDifference;
  return first.summary.localeCompare(second.summary);
}

export function parseCalendarFeed(
  source: string,
  timeMin: Date,
  timeMax: Date,
): ParsedCalendarFeed {
  try {
    const calendar = ICAL.Component.fromString(source);
    if (calendar.name !== 'vcalendar') {
      throw createCalendarGatewayError('invalid-response');
    }

    const calendarColor = getCalendarColor(calendar);
    const expansionBudget = { remaining: MAX_EXPANDED_OCCURRENCES };
    const events = calendar
      .getAllSubcomponents('vevent')
      .slice(0, MAX_PARSED_EVENT_COMPONENTS)
      .flatMap((component) =>
        expandEvent(
          new ICAL.Event(component),
          calendarColor,
          timeMin,
          timeMax,
          expansionBudget,
        ),
      )
      .sort(compareCalendarEvents);

    return { events, name: getCalendarName(calendar) };
  } catch (error) {
    if (isCalendarGatewayError(error)) throw error;
    throw createCalendarGatewayError('invalid-response');
  }
}
