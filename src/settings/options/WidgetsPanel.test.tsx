import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../i18n';
import type { CanvasSceneV2, ClockWidgetInstance } from '../../scenes';
import { WidgetsPanel } from './WidgetsPanel';

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

function renderPanel(
  canvas: CanvasSceneV2 | null,
  onChange: (next: CanvasSceneV2) => void,
  onWidgetAdded: (widgetId: string) => void = vi.fn(),
): void {
  render(
    <I18nProvider locale="en">
      <WidgetsPanel
        canvas={canvas}
        isImageProcessing={false}
        onChange={onChange}
        onImageFilesSelected={vi.fn()}
        onWidgetAdded={onWidgetAdded}
      />
    </I18nProvider>,
  );
}

describe('WidgetsPanel', () => {
  it('keeps configured widget options out of the default panel', () => {
    const canvas: CanvasSceneV2 = {
      layers: [{ id: 'bookmarks', kind: 'bookmarks' }, CLOCK],
      version: 2,
    };
    renderPanel(canvas, vi.fn());

    expect(screen.queryByLabelText('Clock style')).toBeNull();
    expect(screen.queryByLabelText('Screen position')).toBeNull();
  });

  it('keeps Clock and Calendar add actions enabled for multiple instances', () => {
    const canvas: CanvasSceneV2 = {
      layers: [{ id: 'bookmarks', kind: 'bookmarks' }, CLOCK],
      version: 2,
    };
    const onChange = vi.fn<(next: CanvasSceneV2) => void>();
    const onWidgetAdded = vi.fn<(widgetId: string) => void>();
    renderPanel(canvas, onChange, onWidgetAdded);

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
    const addedWidget = onChange.mock.calls[0]?.[0].layers.at(-1);
    expect(addedWidget?.kind).toBe('widget');
    expect(onWidgetAdded).toHaveBeenCalledWith(addedWidget?.id);
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
