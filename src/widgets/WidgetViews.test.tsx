import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ClockWidgetInstance } from '../scenes';
import { ClockWidgetView } from './WidgetViews';

const CLOCK: ClockWidgetInstance = {
  anchor: 'top-left',
  config: { hourCycle: 'h24', showSeconds: false },
  frame: { height: 80, offsetX: 12, offsetY: 18, width: 120 },
  id: 'clock',
  isHidden: false,
  isLocked: false,
  kind: 'widget',
  widgetType: 'clock',
};

afterEach((): void => {
  vi.useRealTimers();
});

describe('ClockWidgetView', () => {
  it('updates exactly at the next minute boundary when seconds are hidden', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T12:34:59.500Z'));
    const { container } = render(
      <ClockWidgetView instance={CLOCK} locale="en" />,
    );
    const clock = container.querySelector('time');
    if (!clock) throw new Error('Expected a clock element.');

    expect(clock.dateTime).toBe('2026-09-01T12:34:59.500Z');
    act(() => vi.advanceTimersByTime(499));
    expect(clock.dateTime).toBe('2026-09-01T12:34:59.500Z');

    act(() => vi.advanceTimersByTime(1));
    expect(clock.dateTime).toBe('2026-09-01T12:35:00.000Z');
  });
});
