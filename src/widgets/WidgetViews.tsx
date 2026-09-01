import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Text } from '@fleetia/lagrange';

import type { Locale } from '../i18n';
import type { CalendarWidgetInstance, ClockWidgetInstance } from '../scenes';
import {
  doesClockTickEverySecond,
  formatClockTime,
  getClockParts,
} from './clock';
import { useCalendarWidget } from './useCalendarWidget';
import * as styles from './WidgetViews.css';

export type CalendarWidgetCopy = {
  disconnected: string;
  empty: string;
  error: string;
  loading: string;
};

type ClockWidgetViewProps = {
  instance: ClockWidgetInstance;
  locale: Locale;
};

type CalendarWidgetViewProps = {
  copy: CalendarWidgetCopy;
  instance: CalendarWidgetInstance;
  locale: Locale;
};

function AnalogClock({
  instance,
  now,
}: {
  instance: ClockWidgetInstance;
  now: Date;
}): ReactElement {
  const parts = getClockParts(now, instance.config.timeZone);
  const secondAngle = parts.second * 6;
  const minuteAngle = parts.minute * 6 + parts.second * 0.1;
  const hourAngle = (parts.hour12 % 12) * 30 + parts.minute * 0.5;

  return (
    <svg aria-hidden="true" className={styles.analogFace} viewBox="0 0 100 100">
      <circle className={styles.analogDial} cx="50" cy="50" r="46" />
      {Array.from({ length: 12 }, (_, index) => (
        <line
          key={index}
          className={styles.analogMark}
          transform={`rotate(${index * 30} 50 50)`}
          x1="50"
          x2="50"
          y1="8"
          y2={index % 3 === 0 ? '17' : '13'}
        />
      ))}
      <line
        className={styles.analogHourHand}
        transform={`rotate(${hourAngle} 50 50)`}
        x1="50"
        x2="50"
        y1="50"
        y2="28"
      />
      <line
        className={styles.analogMinuteHand}
        transform={`rotate(${minuteAngle} 50 50)`}
        x1="50"
        x2="50"
        y1="55"
        y2="18"
      />
      {instance.config.showSecondHand ? (
        <line
          className={styles.analogSecondHand}
          transform={`rotate(${secondAngle} 50 50)`}
          x1="50"
          x2="50"
          y1="58"
          y2="14"
        />
      ) : null}
      <circle className={styles.analogPin} cx="50" cy="50" r="2.5" />
    </svg>
  );
}

export function ClockWidgetView({
  instance,
  locale,
}: ClockWidgetViewProps): ReactElement {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tickIntervalMs = doesClockTickEverySecond(instance.config)
      ? 1_000
      : 60_000;
    let timeoutId: number;

    function scheduleNextTick(): void {
      const elapsedMs = Date.now() % tickIntervalMs;
      const delayMs =
        elapsedMs === 0 ? tickIntervalMs : tickIntervalMs - elapsedMs;
      timeoutId = window.setTimeout(() => {
        setNow(new Date());
        scheduleNextTick();
      }, delayMs);
    }

    scheduleNextTick();
    return () => window.clearTimeout(timeoutId);
  }, [instance.config]);

  const time = useMemo(
    () => formatClockTime(now, locale, instance.config),
    [instance.config, locale, now],
  );

  return (
    <time
      className={`${styles.widget} ${styles.clock} ${
        instance.config.appearance === 'analog'
          ? styles.analogClock
          : styles.digitalClock
      }`}
      dateTime={now.toISOString()}
    >
      {instance.config.appearance === 'analog' ? (
        <>
          <AnalogClock instance={instance} now={now} />
          <span className={styles.visuallyHidden}>{time}</span>
        </>
      ) : (
        time
      )}
    </time>
  );
}

function formatEventTime(
  start: string,
  allDay: boolean,
  locale: Locale,
): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start);
  const date =
    allDay && dateOnly
      ? new Date(
          Number(dateOnly[1]),
          Number(dateOnly[2]) - 1,
          Number(dateOnly[3]),
        )
      : new Date(start);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    hour: allDay ? undefined : 'numeric',
    minute: allDay ? undefined : '2-digit',
    month: 'short',
  }).format(date);
}

export function CalendarWidgetView({
  copy,
  instance,
  locale,
}: CalendarWidgetViewProps): ReactElement {
  const controller = useCalendarWidget(instance.config.feedUrl);
  const visibleEvents = controller.events
    .filter((event) => instance.config.showAllDay || !event.allDay)
    .slice(0, instance.config.maxEvents);

  if (controller.status === 'disconnected') {
    return (
      <section className={`${styles.widget} ${styles.calendar}`}>
        <Text tone="muted">{copy.disconnected}</Text>
      </section>
    );
  }

  return (
    <section
      aria-busy={controller.status === 'loading' || undefined}
      className={`${styles.widget} ${styles.calendar}`}
    >
      {controller.status === 'loading' ? (
        <p className={styles.status}>{copy.loading}</p>
      ) : null}
      {controller.status === 'error' ? (
        <p className={styles.status}>{copy.error}</p>
      ) : null}
      {controller.status === 'ready' && visibleEvents.length === 0 ? (
        <p className={styles.status}>{copy.empty}</p>
      ) : null}
      <ol className={styles.events}>
        {visibleEvents.map((event, eventIndex) => {
          const content = (
            <>
              <span
                aria-hidden="true"
                className={styles.eventColor}
                style={{ color: event.calendarColor ?? 'currentColor' }}
              />
              <span className={styles.eventText}>
                {formatEventTime(event.start, event.allDay, locale)} ·{' '}
                {event.summary}
              </span>
            </>
          );

          return (
            <li
              key={`${event.start}:${event.summary}:${event.htmlLink ?? ''}:${eventIndex}`}
            >
              {event.htmlLink ? (
                <a
                  className={styles.eventLink}
                  href={event.htmlLink}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {content}
                </a>
              ) : (
                <span className={styles.eventLink}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
