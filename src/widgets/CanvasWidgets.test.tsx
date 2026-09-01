import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CanvasSceneV2, ClockWidgetInstance } from '../scenes';
import { CanvasWidgets } from './CanvasWidgets';

function createClock(id: string, isHidden = false): ClockWidgetInstance {
  return {
    anchor: 'top-left',
    config: { hourCycle: 'locale', showSeconds: false },
    frame: { height: 80, offsetX: 12, offsetY: 18, width: 120 },
    id,
    isHidden,
    isLocked: false,
    kind: 'widget',
    widgetType: 'clock',
  };
}

const CALENDAR_COPY = {
  disconnected: 'Disconnected',
  empty: 'Empty',
  error: 'Error',
  loading: 'Loading',
  partialFailure: 'Partial failure',
};

describe('CanvasWidgets', () => {
  it('renders each visible widget at its full Canvas layer index', () => {
    const below = createClock('below');
    const hidden = createClock('hidden', true);
    const above = createClock('above');
    const canvas: CanvasSceneV2 = {
      layers: [
        below,
        {
          anchor: 'top-left',
          assetId: 'decoration-asset',
          frame: { height: 40, offsetX: 0, offsetY: 0, width: 40 },
          id: 'decoration',
          isHidden: false,
          isLocked: false,
          kind: 'decoration',
          mediaType: 'image',
          name: 'decoration.png',
          playbackMode: 'active-tab-only',
          playbackRate: 1,
          rotationDeg: 0,
          scale: 1,
        },
        { id: 'bookmarks', kind: 'bookmarks' },
        hidden,
        above,
      ],
      version: 2,
    };
    const { container } = render(
      <CanvasWidgets
        calendarCopy={CALENDAR_COPY}
        canvas={canvas}
        locale="en"
      />,
    );

    expect(
      container.querySelector<HTMLElement>('[data-canvas-layer-id="below"]')
        ?.style.zIndex,
    ).toBe('1');
    expect(
      container.querySelector<HTMLElement>('[data-canvas-layer-id="above"]')
        ?.style.zIndex,
    ).toBe('5');
    expect(
      container.querySelector('[data-canvas-layer-id="hidden"]'),
    ).toBeNull();
  });
});
