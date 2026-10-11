import { describe, expect, it } from 'vitest';

import { parseCalendarFeed } from './ical';

const FEED = `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//Starlit Test//EN\r
X-WR-CALNAME:Work\r
COLOR:#336699\r
BEGIN:VEVENT\r
UID:daily@example.com\r
DTSTAMP:20260801T000000Z\r
DTSTART:20260901T090000Z\r
DTEND:20260901T100000Z\r
RRULE:FREQ=DAILY;COUNT=3\r
SUMMARY:Daily standup\r
URL:https://calendar.example.com/event/1\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:holiday@example.com\r
DTSTAMP:20260801T000000Z\r
DTSTART;VALUE=DATE:20260902\r
DTEND;VALUE=DATE:20260903\r
SUMMARY:Holiday\r
END:VEVENT\r
END:VCALENDAR\r
`;

describe('iCalendar parser', () => {
  it('expands recurring and all-day events only inside the lookahead window', () => {
    const result = parseCalendarFeed(
      FEED,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-04T00:00:00.000Z'),
    );

    expect(result.name).toBe('Work');
    expect(result.events).toHaveLength(4);
    expect(result.events.map((event) => event.summary)).toEqual([
      'Daily standup',
      'Holiday',
      'Daily standup',
      'Daily standup',
    ]);
    expect(result.events[0]).toMatchObject({
      calendarColor: '#336699',
      htmlLink: 'https://calendar.example.com/event/1',
      start: '2026-09-01T09:00:00.000Z',
    });
    expect(result.events[1]).toMatchObject({
      allDay: true,
      end: '2026-09-03',
      start: '2026-09-02',
    });
  });

  it('rejects malformed calendar data', () => {
    expect(() =>
      parseCalendarFeed(
        'not a calendar',
        new Date('2026-09-01T00:00:00.000Z'),
        new Date('2026-09-08T00:00:00.000Z'),
      ),
    ).toThrow('invalid iCalendar data');
  });

  it('applies recurrence exceptions and cancelled occurrences', () => {
    const result = parseCalendarFeed(
      `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//Starlit Test//EN\r
BEGIN:VEVENT\r
UID:exceptions@example.com\r
DTSTAMP:20260801T000000Z\r
DTSTART:20260901T090000Z\r
DTEND:20260901T100000Z\r
RRULE:FREQ=DAILY;COUNT=3\r
SUMMARY:Original\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:exceptions@example.com\r
DTSTAMP:20260801T000000Z\r
RECURRENCE-ID:20260902T090000Z\r
DTSTART:20260902T120000Z\r
DTEND:20260902T130000Z\r
SUMMARY:Moved\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:exceptions@example.com\r
DTSTAMP:20260801T000000Z\r
RECURRENCE-ID:20260903T090000Z\r
DTSTART:20260903T090000Z\r
DTEND:20260903T100000Z\r
STATUS:CANCELLED\r
SUMMARY:Cancelled\r
END:VEVENT\r
END:VCALENDAR\r
`,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-04T00:00:00.000Z'),
    );

    expect(result.events).toHaveLength(2);
    expect(
      result.events.map(({ start, summary }) => ({ start, summary })),
    ).toEqual([
      { start: '2026-09-01T09:00:00.000Z', summary: 'Original' },
      { start: '2026-09-02T12:00:00.000Z', summary: 'Moved' },
    ]);
  });

  it('uses a safe fallback when an event has no summary', () => {
    const result = parseCalendarFeed(
      `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//Starlit Test//EN\r
BEGIN:VEVENT\r
UID:untitled@example.com\r
DTSTAMP:20260801T000000Z\r
DTSTART:20260901T090000Z\r
DTEND:20260901T100000Z\r
END:VEVENT\r
END:VCALENDAR\r
`,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-02T00:00:00.000Z'),
    );

    expect(result.events[0]?.summary).toBe('Untitled');
  });
});
