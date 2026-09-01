import type { ClockWidgetConfig } from './types';

export const DEFAULT_CLOCK_WIDGET_CONFIG: ClockWidgetConfig = {
  hourCycle: 'locale',
  showSeconds: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeClockWidgetConfig(value: unknown): ClockWidgetConfig {
  if (!isRecord(value)) {
    return DEFAULT_CLOCK_WIDGET_CONFIG;
  }

  const hourCycle =
    value.hourCycle === 'h12' ||
    value.hourCycle === 'h24' ||
    value.hourCycle === 'locale'
      ? value.hourCycle
      : DEFAULT_CLOCK_WIDGET_CONFIG.hourCycle;

  return {
    hourCycle,
    showSeconds:
      typeof value.showSeconds === 'boolean'
        ? value.showSeconds
        : DEFAULT_CLOCK_WIDGET_CONFIG.showSeconds,
  };
}

export function getClockFormatOptions(
  config: ClockWidgetConfig,
): Intl.DateTimeFormatOptions {
  return {
    hour: 'numeric',
    ...(config.hourCycle === 'h12' ? { hour12: true } : {}),
    ...(config.hourCycle === 'h24' ? { hour12: false } : {}),
    minute: '2-digit',
    ...(config.showSeconds ? { second: '2-digit' } : {}),
  };
}

export function createClockFormatter(
  locale: string,
  config: ClockWidgetConfig = DEFAULT_CLOCK_WIDGET_CONFIG,
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, getClockFormatOptions(config));
}

export function formatClockTime(
  date: Date,
  locale: string,
  config: ClockWidgetConfig = DEFAULT_CLOCK_WIDGET_CONFIG,
): string {
  return createClockFormatter(locale, config).format(date);
}
