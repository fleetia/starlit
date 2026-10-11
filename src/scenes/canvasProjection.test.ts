import { describe, expect, it } from 'vitest';

import { DEFAULT_OVERLAY_SCENE } from '../overlays/model';

import {
  mergeCanvasWithOverlay,
  projectCanvasSceneToStableOverlayScene,
} from './canvasProjection';
import { projectOverlaySceneToCanvasScene } from './runtime';
import type { CanvasSceneV2 } from './types';

describe('mergeCanvasWithOverlay', () => {
  it('preserves the current image scene when only widgets change', () => {
    const canvas = projectOverlaySceneToCanvasScene(DEFAULT_OVERLAY_SCENE);
    canvas.layers.push({
      anchor: 'top-right',
      config: {
        appearance: 'digital',
        format: 'HH:mm',
        showSecondHand: true,
        timeZone: null,
      },
      frame: { height: 120, offsetX: 24, offsetY: 24, width: 240 },
      id: 'clock',
      isHidden: false,
      isLocked: false,
      kind: 'widget',
      widgetType: 'clock',
    });

    expect(
      projectCanvasSceneToStableOverlayScene(canvas, DEFAULT_OVERLAY_SCENE),
    ).toBe(DEFAULT_OVERLAY_SCENE);
  });

  it('returns a new image scene when a projected image property changes', () => {
    const canvas = projectOverlaySceneToCanvasScene(DEFAULT_OVERLAY_SCENE);
    const decoration = canvas.layers.find(
      (layer) => layer.kind === 'decoration',
    );
    if (!decoration || decoration.kind !== 'decoration') {
      throw new Error('Expected the default decoration layer.');
    }
    decoration.frame = { ...decoration.frame, offsetX: 42 };

    const projected = projectCanvasSceneToStableOverlayScene(
      canvas,
      DEFAULT_OVERLAY_SCENE,
    );

    const projectedDecoration = projected.layers.find(
      (layer) => layer.kind === 'image',
    );
    expect(projected).not.toBe(DEFAULT_OVERLAY_SCENE);
    expect(projectedDecoration?.offsetX).toBe(42);
  });

  it('replaces overlay-projected slots while keeping widgets in their Canvas positions', () => {
    const canvas: CanvasSceneV2 = {
      version: 2,
      layers: [
        { id: 'bookmarks', kind: 'bookmarks' },
        {
          anchor: 'top-right',
          config: {
            appearance: 'digital',
            format: 'HH:mm',
            showSecondHand: true,
            timeZone: null,
          },
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
