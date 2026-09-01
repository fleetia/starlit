import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../i18n';
import type {
  CanvasSceneV2,
  ClockWidgetInstance,
  GoogleCalendarWidgetInstance,
} from '../../scenes';
import { WidgetsPanel } from './WidgetsPanel';

const calendarState = vi.hoisted(() => ({
  connect: vi.fn(),
  error: null as string | null,
  status: 'disconnected' as 'disconnected' | 'error' | 'loading' | 'ready',
}));

vi.mock('../../widgets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../widgets')>()),
  useCalendarWidget: () => ({
    calendars: [],
    connect: calendarState.connect,
    disconnect: vi.fn(),
    error: calendarState.error,
    events: [],
    failures: [],
    loadCalendars: vi.fn(),
    refresh: vi.fn(),
    selectedCalendarIds: [],
    setSelectedCalendarIds: vi.fn(),
    status: calendarState.status,
  }),
}));

const CLOCK: ClockWidgetInstance = {
  anchor: 'top-right',
  config: { hourCycle: 'locale', showSeconds: false },
  frame: { height: 120, offsetX: 24, offsetY: 24, width: 320 },
  id: 'clock-widget',
  isHidden: false,
  isLocked: false,
  kind: 'widget',
  widgetType: 'clock',
};

const GOOGLE_CALENDAR: GoogleCalendarWidgetInstance = {
  anchor: 'top-right',
  config: { maxEvents: 8, showAllDay: true },
  frame: { height: 320, offsetX: 24, offsetY: 168, width: 360 },
  id: 'calendar-widget',
  isHidden: false,
  isLocked: false,
  kind: 'widget',
  widgetType: 'google-calendar',
};

function renderPanel(
  canvas: CanvasSceneV2 | null,
  onChange: (next: CanvasSceneV2) => void,
  onImageFilesSelected: (files: File[]) => void = vi.fn(),
): void {
  render(
    <I18nProvider locale="en">
      <WidgetsPanel
        canvas={canvas}
        isImageProcessing={false}
        onChange={onChange}
        onImageFilesSelected={onImageFilesSelected}
      />
    </I18nProvider>,
  );
}

describe('WidgetsPanel', () => {
  beforeEach((): void => {
    calendarState.connect.mockReset();
    calendarState.error = null;
    calendarState.status = 'disconnected';
  });

  it('updates widget placement and participates in Canvas layer order', () => {
    const canvas: CanvasSceneV2 = {
      layers: [{ id: 'bookmarks', kind: 'bookmarks' }, CLOCK],
      version: 2,
    };
    const onChange = vi.fn<(next: CanvasSceneV2) => void>();
    renderPanel(canvas, onChange);

    fireEvent.change(
      screen.getByRole('slider', { name: 'Horizontal offset' }),
      { target: { value: '72' } },
    );
    expect(onChange).toHaveBeenLastCalledWith({
      ...canvas,
      layers: [
        canvas.layers[0],
        { ...CLOCK, frame: { ...CLOCK.frame, offsetX: 72 } },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Move backward' }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...canvas,
      layers: [CLOCK, canvas.layers[0]],
    });

    fireEvent.click(screen.getByRole('switch', { name: 'Hide' }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...canvas,
      layers: [canvas.layers[0], { ...CLOCK, isHidden: true }],
    });
  });

  it('offers Image, Google Calendar, and Clock from one add flow', () => {
    const canvas: CanvasSceneV2 = {
      layers: [{ id: 'bookmarks', kind: 'bookmarks' }],
      version: 2,
    };
    const onChange = vi.fn<(next: CanvasSceneV2) => void>();
    renderPanel(canvas, onChange);

    const addButton = screen.getByRole('button', { name: 'Add widget' });
    expect(addButton.getAttribute('aria-haspopup')).toBe('menu');
    expect(addButton.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(addButton);
    expect(addButton.getAttribute('aria-expanded')).toBe('true');
    const chooser = screen.getByRole('menu', { name: 'Choose a widget' });
    expect(
      within(chooser)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Image', 'Google Calendar', 'Clock']);
    expect(calendarState.connect).not.toHaveBeenCalled();
    fireEvent.click(within(chooser).getByRole('menuitem', { name: 'Clock' }));

    expect(onChange).toHaveBeenCalledWith({
      ...canvas,
      layers: [
        canvas.layers[0],
        expect.objectContaining({
          anchor: 'top-right',
          frame: { height: 88, offsetX: 24, offsetY: 24, width: 240 },
          widgetType: 'clock',
        }),
      ],
    });
  });

  it('keeps Image available without a Scene and gates Calendar and Clock', () => {
    renderPanel(null, vi.fn());

    expect(
      screen.getAllByText(
        'Save the current setup as a Scene to add Google Calendar or Clock.',
      ),
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
    const chooser = screen.getByRole('menu', { name: 'Choose a widget' });
    expect(
      within(chooser)
        .getByRole('menuitem', { name: 'Image' })
        .hasAttribute('disabled'),
    ).toBe(false);
    expect(
      within(chooser)
        .getByRole('menuitem', { name: 'Google Calendar' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(
      within(chooser)
        .getByRole('menuitem', { name: 'Clock' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('passes selected image files through the shared widget add flow', () => {
    const onImageFilesSelected = vi.fn<(files: File[]) => void>();
    renderPanel(null, vi.fn(), onImageFilesSelected);

    fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
    fireEvent.click(
      within(screen.getByRole('menu', { name: 'Choose a widget' })).getByRole(
        'menuitem',
        { name: 'Image' },
      ),
    );
    const file = new File(['image'], 'badge.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Add images'), {
      target: { files: [file] },
    });

    expect(onImageFilesSelected).toHaveBeenCalledWith([file]);
  });

  it('disables a built-in type that already exists in the Scene', () => {
    renderPanel(
      {
        layers: [{ id: 'bookmarks', kind: 'bookmarks' }, CLOCK],
        version: 2,
      },
      vi.fn(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
    const chooser = screen.getByRole('menu', { name: 'Choose a widget' });

    expect(
      within(chooser)
        .getByRole('menuitem', { name: 'Clock · Already added' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(
      within(chooser)
        .getByRole('menuitem', { name: 'Google Calendar' })
        .hasAttribute('disabled'),
    ).toBe(false);
  });

  it('adds Google Calendar without starting OAuth', () => {
    const canvas: CanvasSceneV2 = {
      layers: [{ id: 'bookmarks', kind: 'bookmarks' }],
      version: 2,
    };
    const onChange = vi.fn<(next: CanvasSceneV2) => void>();
    renderPanel(canvas, onChange);

    fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Google Calendar' }));

    expect(calendarState.connect).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith({
      ...canvas,
      layers: [
        canvas.layers[0],
        expect.objectContaining({
          config: { maxEvents: 8, showAllDay: true },
          widgetType: 'google-calendar',
        }),
      ],
    });
  });

  it('shows a connection failure next to the consent action', () => {
    calendarState.error = 'OAuth was denied';
    renderPanel(
      {
        layers: [{ id: 'bookmarks', kind: 'bookmarks' }, GOOGLE_CALENDAR],
        version: 2,
      },
      vi.fn(),
    );

    expect(
      screen.getByRole('button', { name: 'Connect Google Calendar' }),
    ).toBeDefined();
    expect(screen.getByText('Events could not be loaded.')).toBeDefined();
  });
});
