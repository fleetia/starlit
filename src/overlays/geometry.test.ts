import { describe, expect, it } from 'vitest';

import {
  changeOverlayImageAnchor,
  getOverlayImageStyle,
  moveOverlayImage,
} from './geometry';
import type { OverlayImageLayer } from './types';

const IMAGE: OverlayImageLayer = {
  anchor: 'top-left',
  height: 50,
  id: 'image-1',
  kind: 'image',
  name: 'Decoration',
  offsetX: 12,
  offsetY: 20,
  rotationDeg: 45,
  width: 100,
};

describe('overlay geometry', () => {
  it.each([
    ['top-left', { left: '12px', top: '20px' }, 'top left'],
    ['top-center', { left: 'calc(50% - 38px)', top: '20px' }, 'top center'],
    ['top-right', { right: '12px', top: '20px' }, 'top right'],
    ['center-left', { left: '12px', top: 'calc(50% - 5px)' }, 'center left'],
    [
      'center-center',
      { left: 'calc(50% - 38px)', top: 'calc(50% - 5px)' },
      'center center',
    ],
    ['center-right', { right: '12px', top: 'calc(50% - 5px)' }, 'center right'],
    ['bottom-left', { bottom: '20px', left: '12px' }, 'bottom left'],
    [
      'bottom-center',
      { bottom: '20px', left: 'calc(50% - 38px)' },
      'bottom center',
    ],
    ['bottom-right', { bottom: '20px', right: '12px' }, 'bottom right'],
  ] as const)(
    'maps the %s anchor to its viewport reference point',
    (anchor, expectedInsets, transformOrigin) => {
      const style = getOverlayImageStyle({ ...IMAGE, anchor });

      expect(style).toMatchObject({
        ...expectedInsets,
        height: '50px',
        transform: 'rotate(45deg)',
        transformOrigin,
        width: '100px',
      });
    },
  );

  it('scales image dimensions without changing its anchored offsets', () => {
    const style = getOverlayImageStyle({
      ...IMAGE,
      anchor: 'bottom-right',
      scale: 1.5,
    });

    expect(style).toMatchObject({
      bottom: '20px',
      height: '75px',
      right: '12px',
      width: '150px',
    });
  });

  it.each([
    ['top-left', 5, 7],
    ['top-center', 5, 7],
    ['top-right', -5, 7],
    ['center-left', 5, 7],
    ['center-center', 5, 7],
    ['center-right', -5, 7],
    ['bottom-left', 5, -7],
    ['bottom-center', 5, -7],
    ['bottom-right', -5, -7],
  ] as const)(
    'moves %s offsets in the viewport drag direction',
    (anchor, offsetDeltaX, offsetDeltaY) => {
      const moved = moveOverlayImage({ ...IMAGE, anchor }, 5, 7);

      expect(moved.offsetX).toBe(IMAGE.offsetX + offsetDeltaX);
      expect(moved.offsetY).toBe(IMAGE.offsetY + offsetDeltaY);
    },
  );

  it('preserves the transformed pose when changing anchor', () => {
    const anchored = changeOverlayImageAnchor(
      {
        ...IMAGE,
        offsetX: 10,
        offsetY: 20,
        rotationDeg: 90,
        scale: 2,
      },
      'top-right',
      { height: 400, width: 500 },
    );

    expect(anchored).toMatchObject({
      anchor: 'top-right',
      offsetX: 490,
      offsetY: 220,
    });
  });

  it('preserves the pose when changing from a corner to the viewport center', () => {
    const anchored = changeOverlayImageAnchor(
      { ...IMAGE, rotationDeg: 0 },
      'center-center',
      { height: 400, width: 500 },
    );

    expect(anchored).toMatchObject({
      anchor: 'center-center',
      offsetX: -188,
      offsetY: -155,
    });
  });

  it('returns the same image when the anchor is unchanged', () => {
    expect(
      changeOverlayImageAnchor(IMAGE, IMAGE.anchor, {
        height: 400,
        width: 500,
      }),
    ).toBe(IMAGE);
  });
});
