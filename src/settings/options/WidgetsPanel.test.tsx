import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../i18n';
import type {
  CalendarWidgetInstance,
  CanvasSceneV2,
  ClockWidgetInstance,
} from '../../scenes';
import { WidgetsPanel } from './WidgetsPanel';

const calendarState = vi.hoisted(() => ({
  refresh: vi.fn(async (): Promise<void> => undefined),
  subscribe: vi.fn(async (): Promise<void> => undefined),
}));

vi.mock('../../widgets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../widgets')>()),
  useCalendarWidget: () => ({
    error: null,
    events: [],
    name: '',
    refresh: calendarState.refresh,
    status: 'disconnected',
    subscribe: calendarState.subscribe,
  }),
}));

const CLOCK: ClockWidgetInstance = {
  anchor: 'top-right',
  config: {
    appearance: 'digital',
    format: 'HH:mm',
    showSecondHand: true,
    timeZone: null,
  },
  frame: { height: 120, offsetX: 24, offsetY: 24, width: 320 },
  id: 'clock-widget',
  isHidden: false,
  isLocked: false,
  kind: 'widget',
  widgetType: 'clock',
};

const CALENDAR: CalendarWidgetInstance = {
  anchor: 'top-right',
  config: { feedUrl: null, maxEvents: 8, showAllDay: true },
  frame: { height: 320, offsetX: 24, offsetY: 168, width: 360 },
  id: 'calendar-widget',
  isHidden: false,
  isLocked: false,
  kind: 'widget',
  widgetType: 'calendar',
};

function renderPanel(
  canvas: CanvasSceneV2 | null,
  onChange: (next: CanvasSceneV2) => void,
  selectedWidgetId: string | null = null,
): void {
  render(
    <I18nProvider locale="en">
      <WidgetsPanel
        canvas={canvas}
        isImageProcessing={false}
        onChange={onChange}
        onImageFilesSelected={vi.fn()}
        onSelectWidget={vi.fn()}
        selectedWidgetId={selectedWidgetId}
      />
    </I18nProvider>,
  );
}

describe('WidgetsPanel', () => {
  beforeEach(() => {
    calendarState.refresh.mockClear();
    calendarState.subscribe.mockClear();
  });

  it('edits the selected Clock instance without affecting its siblings', () => {
    const secondClock = { ...CLOCK, id: 'clock-widget-2' };
    const canvas: CanvasSceneV2 = {
      layers: [{ id: 'bookmarks', kind: 'bookmarks' }, CLOCK, secondClock],
      version: 2,
    };
    const onChange = vi.fn<(next: CanvasSceneV2) => void>();
    renderPanel(canvas, onChange, secondClock.id);

    fireEvent.change(screen.getByLabelText('Clock style'), {
      target: { value: 'analog' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...canvas,
      layers: [
        canvas.layers[0],
        CLOCK,
        {
          ...secondClock,
          config: { ...secondClock.config, appearance: 'analog' },
        },
      ],
    });
  });

  it('keeps Clock and Calendar add actions enabled for multiple instances', () => {
    const canvas: CanvasSceneV2 = {
      layers: [{ id: 'bookmarks', kind: 'bookmarks' }, CLOCK],
      version: 2,
    };
    const onChange = vi.fn<(next: CanvasSceneV2) => void>();
    renderPanel(canvas, onChange);

    fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
    const menu = screen.getByRole('menu', { name: 'Choose a widget' });
    const clockItem = within(menu).getByRole('menuitem', { name: 'Clock' });
    expect(clockItem.hasAttribute('disabled')).toBe(false);
    fireEvent.click(clockItem);

    expect(onChange).toHaveBeenCalledWith({
      ...canvas,
      layers: [
        ...canvas.layers,
        expect.objectContaining({ widgetType: 'clock' }),
      ],
    });
  });

  it('normalizes and subscribes to the Calendar URL from its editor', () => {
    const canvas: CanvasSceneV2 = {
      layers: [{ id: 'bookmarks', kind: 'bookmarks' }, CALENDAR],
      version: 2,
    };
    const onChange = vi.fn<(next: CanvasSceneV2) => void>();
    renderPanel(canvas, onChange, CALENDAR.id);

    fireEvent.change(screen.getByRole('textbox', { name: 'Calendar URL' }), {
      target: { value: 'webcal://calendar.example.com/private.ics' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Allow and subscribe' }),
    );

    expect(onChange).toHaveBeenCalledWith({
      ...canvas,
      layers: [
        canvas.layers[0],
        {
          ...CALENDAR,
          config: {
            ...CALENDAR.config,
            feedUrl: 'https://calendar.example.com/private.ics',
          },
        },
      ],
    });
    expect(calendarState.subscribe).toHaveBeenCalledWith(
      'https://calendar.example.com/private.ics',
    );
  });

  it('requires a Scene before adding built-in widgets', () => {
    renderPanel(null, vi.fn());

    expect(
      screen.getByText(
        'Save the current setup as a Scene to add Calendar or Clock widgets.',
      ),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
    const menu = screen.getByRole('menu', { name: 'Choose a widget' });
    expect(
      within(menu)
        .getByRole('menuitem', { name: 'Calendar' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(
      within(menu)
        .getByRole('menuitem', { name: 'Clock' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });
});
