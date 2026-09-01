import { describe, expect, it } from 'vitest';

import { parseCalendarEventsPage, parseCalendarListPage } from './parsers';

describe('Calendar API parsers', () => {
  it('keeps only the Calendar list fields used by Starlit', () => {
    expect(
      parseCalendarListPage({
        items: [
          {
            accessRole: 'owner',
            backgroundColor: '#4285F4',
            id: 'primary@example.com',
            primary: true,
            summary: 'Work',
            summaryOverride: 'My work',
          },
        ],
        nextPageToken: 'next',
      }),
    ).toEqual({
      calendars: [
        {
          color: '#4285F4',
          id: 'primary@example.com',
          isPrimary: true,
          name: 'My work',
        },
      ],
      nextPageToken: 'next',
    });
  });

  it('preserves all-day dates and timed event offsets without private fields', () => {
    const events = parseCalendarEventsPage(
      {
        items: [
          {
            attendees: [{ email: 'private@example.com' }],
            description: 'private notes',
            end: { date: '2026-09-02' },
            htmlLink: 'https://calendar.google.com/event?eid=all-day',
            start: { date: '2026-09-01' },
            summary: 'Holiday',
          },
          {
            attendees: [{ email: 'private@example.com' }],
            description: 'private notes',
            end: { dateTime: '2026-09-01T10:00:00+09:00' },
            htmlLink: 'https://calendar.google.com/event?eid=timed',
            start: { dateTime: '2026-09-01T09:00:00+09:00' },
            summary: 'Tokyo meeting',
          },
        ],
      },
      '#4285f4',
    );

    expect(events).toEqual([
      {
        allDay: true,
        calendarColor: '#4285f4',
        end: '2026-09-02',
        htmlLink: 'https://calendar.google.com/event?eid=all-day',
        start: '2026-09-01',
        summary: 'Holiday',
      },
      {
        allDay: false,
        calendarColor: '#4285f4',
        end: '2026-09-01T10:00:00+09:00',
        htmlLink: 'https://calendar.google.com/event?eid=timed',
        start: '2026-09-01T09:00:00+09:00',
        summary: 'Tokyo meeting',
      },
    ]);
    expect(events[0]).not.toHaveProperty('attendees');
    expect(events[0]).not.toHaveProperty('description');
  });

  it('rejects malformed pages and omits cancelled or unusable events', () => {
    expect(() => parseCalendarEventsPage({}, null)).toThrow(
      'Google Calendar returned an invalid response.',
    );
    expect(
      parseCalendarEventsPage(
        {
          items: [
            { status: 'cancelled' },
            { end: {}, start: {}, summary: 'missing time' },
            {
              end: { date: '2026-09-01' },
              start: { date: '2026-09-02' },
              summary: 'backwards all day',
            },
            {
              end: { dateTime: '2026-09-01T09:00:00Z' },
              start: { dateTime: '2026-09-01T10:00:00Z' },
              summary: 'backwards timed event',
            },
          ],
        },
        null,
      ),
    ).toEqual([]);
  });

  it('drops non-HTTPS event links while preserving the safe event fields', () => {
    expect(
      parseCalendarEventsPage(
        {
          items: [
            {
              end: { dateTime: '2026-09-01T10:00:00Z' },
              htmlLink: 'javascript:alert(1)',
              start: { dateTime: '2026-09-01T09:00:00Z' },
              summary: 'Meeting',
            },
          ],
        },
        null,
      ),
    ).toEqual([
      {
        allDay: false,
        calendarColor: null,
        end: '2026-09-01T10:00:00Z',
        htmlLink: null,
        start: '2026-09-01T09:00:00Z',
        summary: 'Meeting',
      },
    ]);
  });
});
