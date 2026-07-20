import { describe, expect, it } from 'vitest';

import {
  DEFAULT_OVERLAY_SCENE,
  EMPTY_OVERLAY_SCENE,
  appendOverlayImages,
  getOverlayDraftMediaKey,
  getOverlayImageLayers,
  getOverlayImageScale,
  getOverlayMediaKey,
  normalizeOverlayScene,
  parseOverlayScene,
} from './model';
import type { OverlayImageLayer } from './types';

const IMAGE_LAYER: OverlayImageLayer = {
  anchor: 'top-right',
  height: 180,
  id: 'image-1',
  kind: 'image',
  name: 'stars.png',
  offsetX: 24,
  offsetY: -8,
  rotationDeg: 15,
  width: 320,
};

describe('overlay scene model', () => {
  it('parses a valid ordered scene and strips unknown fields', () => {
    const scaledImage = { ...IMAGE_LAYER, scale: 1.5 };

    expect(
      parseOverlayScene({
        ignored: true,
        layers: [
          { ...scaledImage, ignored: true },
          { kind: 'bookmarks', ignored: true },
        ],
      }),
    ).toEqual({
      layers: [scaledImage, { kind: 'bookmarks' }],
    });
  });

  it.each([
    'top-center',
    'center-left',
    'center-center',
    'center-right',
    'bottom-center',
  ] as const)('accepts the %s anchor', (anchor) => {
    expect(
      parseOverlayScene({
        layers: [{ ...IMAGE_LAYER, anchor }, { kind: 'bookmarks' }],
      }).layers[0],
    ).toMatchObject({ anchor });
  });

  it.each([
    [{ layers: [IMAGE_LAYER] }, 'exactly one bookmarks layer'],
    [
      { layers: [{ kind: 'bookmarks' }, { kind: 'bookmarks' }] },
      'exactly one bookmarks layer',
    ],
    [
      {
        layers: [IMAGE_LAYER, { ...IMAGE_LAYER }, { kind: 'bookmarks' }],
      },
      'unique',
    ],
    [
      {
        layers: [
          { ...IMAGE_LAYER, width: Number.POSITIVE_INFINITY },
          { kind: 'bookmarks' },
        ],
      },
      'dimensions',
    ],
    [
      {
        layers: [{ ...IMAGE_LAYER, anchor: 'middle' }, { kind: 'bookmarks' }],
      },
      'anchor',
    ],
  ])('rejects an invalid scene', (value, message) => {
    expect(() => parseOverlayScene(value)).toThrow(message);
  });

  it.each([0.09, 4.01, Number.NaN])('rejects the invalid %s scale', (scale) => {
    expect(() =>
      parseOverlayScene({
        layers: [{ ...IMAGE_LAYER, scale }, { kind: 'bookmarks' }],
      }),
    ).toThrow('scale');
  });

  it.each([0.1, 4])('accepts the %s scale boundary', (scale) => {
    expect(
      parseOverlayScene({
        layers: [{ ...IMAGE_LAYER, scale }, { kind: 'bookmarks' }],
      }).layers[0],
    ).toMatchObject({ scale });
  });

  it('uses 100% scale for legacy image layers', () => {
    const scene = parseOverlayScene({
      layers: [IMAGE_LAYER, { kind: 'bookmarks' }],
    });
    const [image] = getOverlayImageLayers(scene);

    expect(image && getOverlayImageScale(image)).toBe(1);
  });

  it('normalizes invalid persisted data to the bookmark-only scene', () => {
    expect(normalizeOverlayScene({ layers: [] })).toEqual(EMPTY_OVERLAY_SCENE);
  });

  it('defines the bundled image as the default bottom-right overlay', () => {
    expect(DEFAULT_OVERLAY_SCENE).toEqual({
      layers: [
        { kind: 'bookmarks' },
        {
          anchor: 'bottom-right',
          height: 351,
          id: 'starlit-default-getting-v1',
          kind: 'image',
          name: 'getting.png',
          offsetX: 24,
          offsetY: 24,
          rotationDeg: 0,
          scale: 1,
          width: 392,
        },
      ],
    });
  });

  it('appends images above the existing top layer', () => {
    const scene = appendOverlayImages(EMPTY_OVERLAY_SCENE, [IMAGE_LAYER]);

    expect(scene.layers).toEqual([{ kind: 'bookmarks' }, IMAGE_LAYER]);
    expect(getOverlayImageLayers(scene)).toEqual([IMAGE_LAYER]);
  });

  it('derives stable IndexedDB keys from image ids', () => {
    expect(getOverlayMediaKey('image-1')).toBe('overlayImage:image-1');
    expect(getOverlayDraftMediaKey('session-1', 'image-1')).toBe(
      'overlayImageDraft:session-1:image-1',
    );
  });
});
