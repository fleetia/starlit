import { describe, expect, it } from 'vitest';

import {
  bringOverlayImageToTop,
  deleteOverlayImages,
  duplicateOverlayImage,
  groupOverlayImages,
  moveOverlayImages,
  reorderOverlayImage,
  replaceOverlayImage,
  sendOverlayImageToBottom,
  setOverlayImagesHidden,
  setOverlayImagesLocked,
  ungroupOverlayImages,
} from './actions';
import type { OverlayImageLayer, OverlayScene } from './types';

function createImage(id: string): OverlayImageLayer {
  return {
    anchor: 'top-left',
    height: 100,
    id,
    kind: 'image',
    name: `${id}.png`,
    offsetX: 12,
    offsetY: 18,
    rotationDeg: 0,
    width: 120,
  };
}

const BACK_IMAGE = createImage('back');
const FRONT_IMAGE = createImage('front');
const SCENE: OverlayScene = {
  layers: [BACK_IMAGE, { kind: 'bookmarks' }, FRONT_IMAGE],
};

describe('overlay scene actions', () => {
  it('duplicates and replaces images without changing unrelated layer order', () => {
    const duplicate = { ...BACK_IMAGE, id: 'copy', name: 'copy.png' };
    const duplicated = duplicateOverlayImage(SCENE, BACK_IMAGE.id, duplicate);
    const replacement = {
      ...FRONT_IMAGE,
      height: 180,
      mediaKind: 'motion' as const,
      name: 'front.gif',
      width: 240,
    };

    expect(duplicated.layers).toEqual([
      BACK_IMAGE,
      duplicate,
      { kind: 'bookmarks' },
      FRONT_IMAGE,
    ]);
    expect(
      replaceOverlayImage(duplicated, FRONT_IMAGE.id, replacement).layers,
    ).toEqual([BACK_IMAGE, duplicate, { kind: 'bookmarks' }, replacement]);
  });

  it('reorders an image and moves it to the top or bottom of the full stack', () => {
    expect(reorderOverlayImage(SCENE, 'back', 2).layers).toEqual([
      { kind: 'bookmarks' },
      FRONT_IMAGE,
      BACK_IMAGE,
    ]);
    expect(bringOverlayImageToTop(SCENE, 'back').layers.at(-1)).toEqual(
      BACK_IMAGE,
    );
    expect(sendOverlayImageToBottom(SCENE, 'front').layers[0]).toEqual(
      FRONT_IMAGE,
    );
  });

  it('expands grouped selections for multi-image move, visibility, and locking', () => {
    const grouped = groupOverlayImages(SCENE, ['back', 'front'], 'group-1');
    const moved = moveOverlayImages(grouped, ['back'], 6, -12);
    const hidden = setOverlayImagesHidden(moved, ['front'], true);
    const locked = setOverlayImagesLocked(hidden, ['back'], true);

    expect(locked.layers).toEqual([
      {
        ...BACK_IMAGE,
        groupId: 'group-1',
        hidden: true,
        locked: true,
        offsetX: 18,
        offsetY: 6,
      },
      { kind: 'bookmarks' },
      {
        ...FRONT_IMAGE,
        groupId: 'group-1',
        hidden: true,
        locked: true,
        offsetX: 18,
        offsetY: 6,
      },
    ]);
  });

  it('ungroups or deletes every member reached through a grouped selection', () => {
    const grouped = groupOverlayImages(SCENE, ['back', 'front'], 'group-1');

    expect(ungroupOverlayImages(grouped, ['back'])).toEqual(SCENE);
    expect(deleteOverlayImages(grouped, ['front'])).toEqual({
      layers: [{ kind: 'bookmarks' }],
    });
  });

  it('returns the original scene for stale ids and rejects duplicate ids', () => {
    expect(moveOverlayImages(SCENE, ['missing'], 5, 5)).toBe(SCENE);
    expect(() =>
      duplicateOverlayImage(SCENE, 'back', {
        ...BACK_IMAGE,
        id: 'front',
      }),
    ).toThrow('unique');
  });
});
