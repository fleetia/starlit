import { moveOverlayImage } from './geometry';
import { parseOverlayScene } from './model';
import type { OverlayImageLayer, OverlayLayer, OverlayScene } from './types';

function createOverlayScene(layers: OverlayLayer[]): OverlayScene {
  parseOverlayScene({ layers });
  return { layers };
}

function findOverlayImageIndex(scene: OverlayScene, imageId: string): number {
  return scene.layers.findIndex(
    (layer) => layer.kind === 'image' && layer.id === imageId,
  );
}

export function getOverlayImageSelectionIds(
  scene: OverlayScene,
  imageIds: readonly string[],
): ReadonlySet<string> {
  const selectedIds = new Set(imageIds);
  const selectedGroupIds = new Set(
    scene.layers.flatMap((layer) =>
      layer.kind === 'image' &&
      selectedIds.has(layer.id) &&
      layer.groupId !== undefined
        ? [layer.groupId]
        : [],
    ),
  );

  return new Set(
    scene.layers.flatMap((layer) =>
      layer.kind === 'image' &&
      (selectedIds.has(layer.id) ||
        (layer.groupId !== undefined && selectedGroupIds.has(layer.groupId)))
        ? [layer.id]
        : [],
    ),
  );
}

function updateOverlayImages(
  scene: OverlayScene,
  imageIds: readonly string[],
  updateImage: (image: OverlayImageLayer) => OverlayImageLayer,
): OverlayScene {
  const selectedIds = getOverlayImageSelectionIds(scene, imageIds);
  if (selectedIds.size === 0) {
    return scene;
  }

  let didChange = false;
  const layers = scene.layers.map((layer) => {
    if (layer.kind !== 'image' || !selectedIds.has(layer.id)) {
      return layer;
    }

    const nextImage = updateImage(layer);
    didChange ||= nextImage !== layer;
    return nextImage;
  });

  if (!didChange) {
    return scene;
  }

  return createOverlayScene(layers);
}

export function duplicateOverlayImage(
  scene: OverlayScene,
  imageId: string,
  duplicate: OverlayImageLayer,
): OverlayScene {
  const imageIndex = findOverlayImageIndex(scene, imageId);
  if (imageIndex < 0) {
    return scene;
  }

  const layers = [...scene.layers];
  layers.splice(imageIndex + 1, 0, duplicate);
  return createOverlayScene(layers);
}

export function replaceOverlayImage(
  scene: OverlayScene,
  imageId: string,
  replacement: OverlayImageLayer,
): OverlayScene {
  const imageIndex = findOverlayImageIndex(scene, imageId);
  if (imageIndex < 0) {
    return scene;
  }

  if (scene.layers[imageIndex] === replacement) {
    return scene;
  }

  const layers = scene.layers.map((layer, index) =>
    index === imageIndex ? replacement : layer,
  );
  return createOverlayScene(layers);
}

export function reorderOverlayImage(
  scene: OverlayScene,
  imageId: string,
  targetIndex: number,
): OverlayScene {
  const imageIndex = findOverlayImageIndex(scene, imageId);
  if (imageIndex < 0 || !Number.isFinite(targetIndex)) {
    return scene;
  }

  const nextIndex = Math.min(
    Math.max(0, Math.trunc(targetIndex)),
    scene.layers.length - 1,
  );
  if (imageIndex === nextIndex) {
    return scene;
  }

  const layers = [...scene.layers];
  const [image] = layers.splice(imageIndex, 1);
  if (!image) {
    return scene;
  }

  layers.splice(nextIndex, 0, image);
  return createOverlayScene(layers);
}

export function bringOverlayImageToTop(
  scene: OverlayScene,
  imageId: string,
): OverlayScene {
  return reorderOverlayImage(scene, imageId, scene.layers.length - 1);
}

export function sendOverlayImageToBottom(
  scene: OverlayScene,
  imageId: string,
): OverlayScene {
  return reorderOverlayImage(scene, imageId, 0);
}

export function moveOverlayImages(
  scene: OverlayScene,
  imageIds: readonly string[],
  deltaX: number,
  deltaY: number,
): OverlayScene {
  if (deltaX === 0 && deltaY === 0) {
    return scene;
  }

  return updateOverlayImages(scene, imageIds, (image) =>
    moveOverlayImage(image, deltaX, deltaY),
  );
}

export function setOverlayImagesHidden(
  scene: OverlayScene,
  imageIds: readonly string[],
  hidden: boolean,
): OverlayScene {
  return updateOverlayImages(scene, imageIds, (image) => {
    if ((image.hidden ?? false) === hidden) {
      return image;
    }

    if (hidden) {
      return { ...image, hidden: true };
    }

    const { hidden: _hidden, ...visibleImage } = image;
    return visibleImage;
  });
}

export function setOverlayImagesLocked(
  scene: OverlayScene,
  imageIds: readonly string[],
  locked: boolean,
): OverlayScene {
  return updateOverlayImages(scene, imageIds, (image) => {
    if ((image.locked ?? false) === locked) {
      return image;
    }

    if (locked) {
      return { ...image, locked: true };
    }

    const { locked: _locked, ...unlockedImage } = image;
    return unlockedImage;
  });
}

export function deleteOverlayImages(
  scene: OverlayScene,
  imageIds: readonly string[],
): OverlayScene {
  const selectedIds = getOverlayImageSelectionIds(scene, imageIds);
  if (selectedIds.size === 0) {
    return scene;
  }

  return createOverlayScene(
    scene.layers.filter(
      (layer) => layer.kind !== 'image' || !selectedIds.has(layer.id),
    ),
  );
}

export function groupOverlayImages(
  scene: OverlayScene,
  imageIds: readonly string[],
  groupId: string,
): OverlayScene {
  const normalizedGroupId = groupId.trim();
  if (normalizedGroupId === '') {
    throw new Error('Overlay image group must be a non-empty string.');
  }

  const selectedIds = getOverlayImageSelectionIds(scene, imageIds);
  if (selectedIds.size < 2) {
    return scene;
  }

  return updateOverlayImages(scene, [...selectedIds], (image) =>
    image.groupId === normalizedGroupId
      ? image
      : { ...image, groupId: normalizedGroupId },
  );
}

export function ungroupOverlayImages(
  scene: OverlayScene,
  imageIds: readonly string[],
): OverlayScene {
  return updateOverlayImages(scene, imageIds, (image) => {
    if (image.groupId === undefined) {
      return image;
    }

    const { groupId: _groupId, ...ungroupedImage } = image;
    return ungroupedImage;
  });
}
