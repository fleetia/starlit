import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CLOCK_WIDGET_CONFIG,
  doesClockTickEverySecond,
  formatClockTime,
  getClockParts,
  isValidClockFormat,
  isValidClockTimeZone,
  normalizeClockWidgetConfig,
} from './clock';

describe('clock widget', () => {
  it('formats supported tokens independently for each clock', () => {
    expect(
      formatClockTime(new Date('2026-08-31T03:04:05.000Z'), 'en-US', {
        appearance: 'digital',
        format: 'hh:mm:ss a',
        showSecondHand: true,
        timeZone: 'UTC',
      }),
    ).toBe('03:04:05 AM');
    expect(
      formatClockTime(new Date('2026-08-31T03:04:05.000Z'), 'en-US', {
        appearance: 'digital',
        format: 'H:m:s',
        showSecondHand: true,
        timeZone: 'UTC',
      }),
    ).toBe('3:4:5');
  });

  it('returns analog hand parts in the selected time zone', () => {
    expect(
      getClockParts(new Date('2026-08-31T03:04:05.000Z'), 'Asia/Seoul'),
    ).toEqual({ hour12: 12, hour24: 12, minute: 4, second: 5 });
  });

  it('uses a one-second tick only when the visible format needs it', () => {
    expect(doesClockTickEverySecond(DEFAULT_CLOCK_WIDGET_CONFIG)).toBe(false);
    expect(
      doesClockTickEverySecond({
        ...DEFAULT_CLOCK_WIDGET_CONFIG,
        format: 'HH:mm:ss',
      }),
    ).toBe(true);
    expect(
      doesClockTickEverySecond({
        ...DEFAULT_CLOCK_WIDGET_CONFIG,
        appearance: 'analog',
        showSecondHand: false,
      }),
    ).toBe(false);
  });

  it('migrates the previous hour-cycle config', () => {
    expect(
      normalizeClockWidgetConfig({ hourCycle: 'h12', showSeconds: true }),
    ).toEqual({
      appearance: 'digital',
      format: 'hh:mm:ss a',
      showSecondHand: true,
      timeZone: null,
    });
  });

  it('validates formats and IANA time zones', () => {
    expect(isValidClockFormat('HH:mm:ss')).toBe(true);
    expect(isValidClockFormat('calendar')).toBe(false);
    expect(isValidClockTimeZone('Asia/Seoul')).toBe(true);
    expect(isValidClockTimeZone('Mars/Olympus')).toBe(false);
    expect(normalizeClockWidgetConfig({ hourCycle: '13' })).toEqual(
      DEFAULT_CLOCK_WIDGET_CONFIG,
    );
  });
});
