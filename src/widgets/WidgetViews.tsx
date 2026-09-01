import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Text } from '@fleetia/lagrange';

import type { Locale } from '../i18n';
import type {
  ClockWidgetInstance,
  GoogleCalendarWidgetInstance,
} from '../scenes';
import { formatClockTime } from './clock';
import { useCalendarWidget } from './useCalendarWidget';
import * as styles from './WidgetViews.css';

export type CalendarWidgetCopy = {
  disconnected: string;
  empty: string;
  error: string;
  loading: string;
  partialFailure: string;
};

type ClockWidgetViewProps = {
  instance: ClockWidgetInstance;
  locale: Locale;
};

type GoogleCalendarWidgetViewProps = {
  copy: CalendarWidgetCopy;
  instance: GoogleCalendarWidgetInstance;
  locale: Locale;
};

export function ClockWidgetView({
  instance,
  locale,
}: ClockWidgetViewProps): ReactElement {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tickIntervalMs = instance.config.showSeconds ? 1_000 : 60_000;
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
  }, [instance.config.showSeconds]);

  const time = useMemo(
    () => formatClockTime(now, locale, instance.config),
    [instance.config, locale, now],
  );

  return (
    <time
      className={`${styles.widget} ${styles.clock}`}
      dateTime={now.toISOString()}
    >
      {time}
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

export function GoogleCalendarWidgetView({
  copy,
  instance,
  locale,
}: GoogleCalendarWidgetViewProps): ReactElement {
  const controller = useCalendarWidget();
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
      {controller.failures.length > 0 ? (
        <p className={styles.status}>{copy.partialFailure}</p>
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
