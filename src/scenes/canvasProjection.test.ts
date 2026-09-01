import { describe, expect, it } from 'vitest';

import { DEFAULT_OVERLAY_SCENE } from '../overlays/model';

import { mergeCanvasWithOverlay } from './canvasProjection';
import type { CanvasSceneV2 } from './types';

describe('mergeCanvasWithOverlay', () => {
  it('replaces overlay-projected slots while keeping widgets in their Canvas positions', () => {
    const canvas: CanvasSceneV2 = {
      version: 2,
      layers: [
        { id: 'bookmarks', kind: 'bookmarks' },
        {
          anchor: 'top-right',
          config: { hourCycle: 'locale', showSeconds: false },
          frame: { height: 120, offsetX: 24, offsetY: 24, width: 240 },
          id: 'clock',
          isHidden: false,
          isLocked: false,
          kind: 'widget',
          widgetType: 'clock',
        },
      ],
    };

    const merged = mergeCanvasWithOverlay(canvas, DEFAULT_OVERLAY_SCENE);

    expect(merged.layers[1]).toEqual(canvas.layers[1]);
    expect(merged.layers.filter((layer) => layer.kind === 'widget')).toEqual([
      canvas.layers[1],
    ]);
    expect(
      merged.layers.filter((layer) => layer.kind !== 'widget'),
    ).toHaveLength(DEFAULT_OVERLAY_SCENE.layers.length);
  });
});
