import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CLOCK_WIDGET_CONFIG,
  formatClockTime,
  getClockFormatOptions,
  normalizeClockWidgetConfig,
} from './clock';

describe('clock widget', () => {
  it('uses the locale hour cycle unless the user explicitly selects one', () => {
    expect(
      getClockFormatOptions(DEFAULT_CLOCK_WIDGET_CONFIG),
    ).not.toHaveProperty('hour12');
    expect(
      getClockFormatOptions({ hourCycle: 'h12', showSeconds: false }),
    ).toMatchObject({ hour12: true });
    expect(
      getClockFormatOptions({ hourCycle: 'h24', showSeconds: false }),
    ).toMatchObject({ hour12: false });
  });

  it('supports seconds without changing the selected hour cycle', () => {
    expect(
      getClockFormatOptions({ hourCycle: 'h24', showSeconds: true }),
    ).toEqual({
      hour: 'numeric',
      hour12: false,
      minute: '2-digit',
      second: '2-digit',
    });
  });

  it('normalizes persisted config and formats a locale-aware time', () => {
    const config = normalizeClockWidgetConfig({
      hourCycle: 'h12',
      showSeconds: true,
    });
    const formatted = formatClockTime(
      new Date('2026-08-31T03:04:05.000Z'),
      'en-US',
      config,
    );

    expect(config).toEqual({ hourCycle: 'h12', showSeconds: true });
    expect(formatted).toContain(':');
  });

  it('falls back safely for malformed persisted config', () => {
    expect(normalizeClockWidgetConfig({ hourCycle: '13' })).toEqual(
      DEFAULT_CLOCK_WIDGET_CONFIG,
    );
  });
});
