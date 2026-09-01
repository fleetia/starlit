import type { ClockWidgetConfig } from './types';

export const DEFAULT_CLOCK_WIDGET_CONFIG: ClockWidgetConfig = {
  appearance: 'digital',
  format: 'HH:mm',
  showSecondHand: true,
  timeZone: null,
};

export const MAX_CLOCK_FORMAT_LENGTH = 64;
export const MAX_CLOCK_TIME_ZONE_LENGTH = 128;

const CLOCK_TOKEN_PATTERN = /HH|hh|mm|ss|H|h|m|s|a/gu;

type ClockParts = {
  dayPeriod: string;
  hour12: number;
  hour24: number;
  minute: number;
  second: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidClockTimeZone(value: string | null): boolean {
  if (value === null) return true;
  if (value.trim() === '' || value.length > MAX_CLOCK_TIME_ZONE_LENGTH) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function isValidClockFormat(value: string): boolean {
  if (value.length === 0 || value.length > MAX_CLOCK_FORMAT_LENGTH) {
    return false;
  }

  return /HH|hh|mm|ss|H|h|m|s/u.test(value);
}

export function normalizeClockWidgetConfig(value: unknown): ClockWidgetConfig {
  if (!isRecord(value)) return DEFAULT_CLOCK_WIDGET_CONFIG;

  const legacyHourCycle =
    value.hourCycle === 'h12' || value.hourCycle === 'h24'
      ? value.hourCycle
      : null;
  const legacyShowSeconds = value.showSeconds === true;
  const legacyFormat = `${legacyHourCycle === 'h12' ? 'hh' : 'HH'}:mm${legacyShowSeconds ? ':ss' : ''}${legacyHourCycle === 'h12' ? ' a' : ''}`;
  const format =
    typeof value.format === 'string' && isValidClockFormat(value.format)
      ? value.format
      : legacyFormat;
  const timeZone =
    (typeof value.timeZone === 'string' || value.timeZone === null) &&
    isValidClockTimeZone(value.timeZone)
      ? value.timeZone
      : DEFAULT_CLOCK_WIDGET_CONFIG.timeZone;

  return {
    appearance: value.appearance === 'analog' ? 'analog' : 'digital',
    format,
    showSecondHand:
      typeof value.showSecondHand === 'boolean'
        ? value.showSecondHand
        : legacyShowSeconds || DEFAULT_CLOCK_WIDGET_CONFIG.showSecondHand,
    timeZone,
  };
}

function getNumericParts(date: Date, timeZone: string | null): ClockParts {
  const parts = new Intl.DateTimeFormat('en-US-u-nu-latn', {
    hour: 'numeric',
    hourCycle: 'h23',
    minute: '2-digit',
    second: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const hour24 = Number(values.get('hour') ?? 0);
  const minute = Number(values.get('minute') ?? 0);
  const second = Number(values.get('second') ?? 0);

  return {
    dayPeriod: '',
    hour12: hour24 % 12 || 12,
    hour24,
    minute,
    second,
  };
}

function getLocalizedDayPeriod(
  date: Date,
  locale: string,
  timeZone: string | null,
): string {
  return (
    new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      hour12: true,
      ...(timeZone ? { timeZone } : {}),
    })
      .formatToParts(date)
      .find((part) => part.type === 'dayPeriod')?.value ?? ''
  );
}

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

function formatClockToken(token: string, parts: ClockParts): string {
  switch (token) {
    case 'HH':
      return padTwo(parts.hour24);
    case 'H':
      return String(parts.hour24);
    case 'hh':
      return padTwo(parts.hour12);
    case 'h':
      return String(parts.hour12);
    case 'mm':
      return padTwo(parts.minute);
    case 'm':
      return String(parts.minute);
    case 'ss':
      return padTwo(parts.second);
    case 's':
      return String(parts.second);
    case 'a':
      return parts.dayPeriod;
    default:
      return token;
  }
}

export function getClockParts(
  date: Date,
  timeZone: string | null,
): Omit<ClockParts, 'dayPeriod'> {
  const { dayPeriod: _dayPeriod, ...parts } = getNumericParts(date, timeZone);
  return parts;
}

export function doesClockTickEverySecond(config: ClockWidgetConfig): boolean {
  return config.appearance === 'analog'
    ? config.showSecondHand
    : /ss|s/u.test(config.format);
}

export function formatClockTime(
  date: Date,
  locale: string,
  config: ClockWidgetConfig = DEFAULT_CLOCK_WIDGET_CONFIG,
): string {
  const parts = {
    ...getNumericParts(date, config.timeZone),
    dayPeriod: getLocalizedDayPeriod(date, locale, config.timeZone),
  };

  return config.format.replace(CLOCK_TOKEN_PATTERN, (token) =>
    formatClockToken(token, parts),
  );
}
