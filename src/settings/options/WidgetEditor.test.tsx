import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../i18n';
import type { CalendarWidgetInstance, CanvasSceneV2 } from '../../scenes';
import { WidgetEditor } from './WidgetEditor';

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

function CalendarEditor(): ReactElement {
  const [canvas, setCanvas] = useState<CanvasSceneV2>({
    layers: [{ id: 'bookmarks', kind: 'bookmarks' }, CALENDAR],
    version: 2,
  });
  const widget = canvas.layers.find(
    (layer): layer is CalendarWidgetInstance =>
      layer.kind === 'widget' && layer.widgetType === 'calendar',
  );
  if (!widget) {
    throw new Error('Calendar widget is missing.');
  }

  return (
    <I18nProvider locale="en">
      <WidgetEditor
        canvas={canvas}
        onChange={setCanvas}
        onRemove={vi.fn()}
        widget={widget}
      />
    </I18nProvider>
  );
}

describe('WidgetEditor Calendar consent', () => {
  it('requests host access on the first click after the URL loses focus', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(
      () => new Promise(() => undefined),
    );
    let resolvePermission: (granted: boolean) => void = () => undefined;
    const permission = new Promise<boolean>((resolve) => {
      resolvePermission = resolve;
    });
    vi.mocked(chrome.permissions.request).mockImplementation(() => permission);
    render(<CalendarEditor />);

    const input = screen.getByRole('textbox', { name: 'Calendar URL' });
    const subscribe = screen.getByRole('button', {
      name: 'Allow and subscribe',
    });
    fireEvent.change(input, {
      target: { value: 'webcal://calendar.example.test/private.ics' },
    });
    fireEvent.blur(input, { relatedTarget: subscribe });

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      feedUrl: 'https://calendar.example.test/private.ics',
      type: 'calendar.listEvents',
    });
    expect(subscribe.hasAttribute('disabled')).toBe(false);
    fireEvent.click(subscribe);
    expect(chrome.permissions.request).toHaveBeenCalledExactlyOnceWith({
      origins: ['https://calendar.example.test/*'],
    });
    expect(subscribe.hasAttribute('disabled')).toBe(true);

    await act(async () => resolvePermission(false));
    expect(subscribe.hasAttribute('disabled')).toBe(false);
  });
});
