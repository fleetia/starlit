import { describe, expect, it } from 'vitest';

import {
  OVERLAY_SNAP_THRESHOLD_PX,
  getOverlayImagesIntersectingRect,
  hitTestOverlayImages,
  snapOverlayImages,
} from './canvasInteractions';
import type { OverlayImageLayer, OverlayScene } from './types';

function createImage(
  id: string,
  offsetX: number,
  offsetY: number,
): OverlayImageLayer {
  return {
    anchor: 'top-left',
    height: 100,
    id,
    kind: 'image',
    name: `${id}.png`,
    offsetX,
    offsetY,
    rotationDeg: 0,
    width: 100,
  };
}

const VIEWPORT = { height: 600, width: 800 };

describe('overlay canvas interactions', () => {
  it('snaps a moving selection to viewport and image guides within 6px', () => {
    const moving = createImage('moving', 6, 196);
    const target = createImage('target', 200, 200);

    const result = snapOverlayImages([moving], [target], VIEWPORT);

    expect(OVERLAY_SNAP_THRESHOLD_PX).toBe(6);
    expect(result.images[0]).toMatchObject({ offsetX: 0, offsetY: 200 });
    expect(result.guides).toEqual([
      { axis: 'x', position: 0, source: 'viewport' },
      { axis: 'y', imageId: 'target', position: 200, source: 'image' },
    ]);
  });

  it('does not snap outside the threshold or while Alt is held', () => {
    const outside = createImage('outside', 7, 7);
    const bypassed = createImage('bypassed', 5, 5);

    expect(snapOverlayImages([outside], [], VIEWPORT).images[0]).toBe(outside);
    expect(
      snapOverlayImages([bypassed], [], VIEWPORT, { altKey: true }),
    ).toEqual({ guides: [], images: [bypassed] });
  });

  it('hit-tests rotated polygons in reverse z-order and ignores hidden media', () => {
    const back = createImage('back', 100, 100);
    const front = { ...createImage('front', 100, 100), rotationDeg: 45 };
    const scene: OverlayScene = {
      layers: [back, { kind: 'bookmarks' }, front],
    };

    expect(hitTestOverlayImages(scene, { x: 110, y: 150 }, VIEWPORT)?.id).toBe(
      'front',
    );
    expect(
      hitTestOverlayImages(
        {
          layers: [back, { kind: 'bookmarks' }, { ...front, hidden: true }],
        },
        { x: 110, y: 150 },
        VIEWPORT,
      )?.id,
    ).toBe('back');
    expect(hitTestOverlayImages(scene, { x: 35, y: 105 }, VIEWPORT)).toBe(
      undefined,
    );
  });

  it('selects visible images whose rotated bounds intersect a marquee', () => {
    const inside = createImage('inside', 100, 100);
    const outside = createImage('outside', 400, 400);

    expect(
      getOverlayImagesIntersectingRect(
        [inside, outside, { ...inside, hidden: true, id: 'hidden' }],
        { bottom: 250, left: 50, right: 250, top: 50 },
        VIEWPORT,
      ).map((image) => image.id),
    ).toEqual(['inside']);
  });
});
