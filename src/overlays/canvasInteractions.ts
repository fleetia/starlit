import {
  getOverlayImageBounds,
  getOverlayImagePolygon,
  moveOverlayImage,
  type OverlayBounds,
  type OverlayPoint,
  type OverlayPolygon,
  type ViewportSize,
} from './geometry';
import { isOverlayImageHidden } from './model';
import type { OverlayImageLayer, OverlayScene } from './types';

export const OVERLAY_SNAP_THRESHOLD_PX = 6;

export type OverlaySnapGuide = {
  axis: 'x' | 'y';
  position: number;
  source: 'image' | 'viewport';
  imageId?: string;
};

export type OverlaySnapOptions = {
  altKey?: boolean;
  threshold?: number;
};

export type OverlaySnapResult = {
  guides: OverlaySnapGuide[];
  images: OverlayImageLayer[];
};

export type OverlaySelectionRect = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type SnapAxisCandidate = {
  delta: number;
  guide: OverlaySnapGuide;
};

type SnapTarget = {
  imageId?: string;
  position: number;
  source: OverlaySnapGuide['source'];
};

function getSelectionBounds(
  images: readonly OverlayImageLayer[],
  viewport: ViewportSize,
): OverlayBounds | null {
  const firstImage = images[0];
  if (!firstImage) {
    return null;
  }

  return images.slice(1).reduce(
    (bounds, image) => {
      const imageBounds = getOverlayImageBounds(image, viewport);
      return {
        bottom: Math.max(bounds.bottom, imageBounds.bottom),
        left: Math.min(bounds.left, imageBounds.left),
        right: Math.max(bounds.right, imageBounds.right),
        top: Math.min(bounds.top, imageBounds.top),
      };
    },
    getOverlayImageBounds(firstImage, viewport),
  );
}

function getBoundsAxisPoints(
  bounds: OverlayBounds,
  axis: OverlaySnapGuide['axis'],
): readonly number[] {
  if (axis === 'x') {
    return [bounds.left, (bounds.left + bounds.right) / 2, bounds.right];
  }

  return [bounds.top, (bounds.top + bounds.bottom) / 2, bounds.bottom];
}

function getImageSnapTargets(
  images: readonly OverlayImageLayer[],
  viewport: ViewportSize,
  axis: OverlaySnapGuide['axis'],
): SnapTarget[] {
  return images.flatMap((image) => {
    if (isOverlayImageHidden(image)) {
      return [];
    }

    return getBoundsAxisPoints(
      getOverlayImageBounds(image, viewport),
      axis,
    ).map((position) => ({
      imageId: image.id,
      position,
      source: 'image' as const,
    }));
  });
}

function getViewportSnapTargets(
  viewport: ViewportSize,
  axis: OverlaySnapGuide['axis'],
): SnapTarget[] {
  const size = axis === 'x' ? viewport.width : viewport.height;
  return [0, size / 2, size].map((position) => ({
    position,
    source: 'viewport',
  }));
}

function findClosestSnap(
  movingPositions: readonly number[],
  targets: readonly SnapTarget[],
  axis: OverlaySnapGuide['axis'],
  threshold: number,
): SnapAxisCandidate | null {
  let closest: SnapAxisCandidate | null = null;

  for (const target of targets) {
    for (const movingPosition of movingPositions) {
      const delta = target.position - movingPosition;
      if (Math.abs(delta) > threshold) {
        continue;
      }

      if (closest && Math.abs(closest.delta) <= Math.abs(delta)) {
        continue;
      }

      closest = {
        delta,
        guide: {
          axis,
          ...(target.imageId === undefined ? {} : { imageId: target.imageId }),
          position: target.position,
          source: target.source,
        },
      };
    }
  }

  return closest;
}

export function snapOverlayImages(
  images: readonly OverlayImageLayer[],
  targetImages: readonly OverlayImageLayer[],
  viewport: ViewportSize,
  options: OverlaySnapOptions = {},
): OverlaySnapResult {
  if (options.altKey || images.length === 0) {
    return { guides: [], images: [...images] };
  }

  const threshold = options.threshold ?? OVERLAY_SNAP_THRESHOLD_PX;
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new Error('Overlay snap threshold must be a non-negative number.');
  }

  const selectionBounds = getSelectionBounds(images, viewport);
  if (!selectionBounds) {
    return { guides: [], images: [...images] };
  }

  const movingIds = new Set(images.map((image) => image.id));
  const availableTargets = targetImages.filter(
    (image) => !movingIds.has(image.id),
  );
  const xSnap = findClosestSnap(
    getBoundsAxisPoints(selectionBounds, 'x'),
    [
      ...getImageSnapTargets(availableTargets, viewport, 'x'),
      ...getViewportSnapTargets(viewport, 'x'),
    ],
    'x',
    threshold,
  );
  const ySnap = findClosestSnap(
    getBoundsAxisPoints(selectionBounds, 'y'),
    [
      ...getImageSnapTargets(availableTargets, viewport, 'y'),
      ...getViewportSnapTargets(viewport, 'y'),
    ],
    'y',
    threshold,
  );

  if (!xSnap && !ySnap) {
    return { guides: [], images: [...images] };
  }

  const deltaX = xSnap?.delta ?? 0;
  const deltaY = ySnap?.delta ?? 0;
  return {
    guides: [xSnap?.guide, ySnap?.guide].filter(
      (guide): guide is OverlaySnapGuide => guide !== undefined,
    ),
    images: images.map((image) => moveOverlayImage(image, deltaX, deltaY)),
  };
}

export function isPointInOverlayPolygon(
  point: OverlayPoint,
  polygon: OverlayPolygon,
): boolean {
  let hasNegativeCrossProduct = false;
  let hasPositiveCrossProduct = false;

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (!start || !end) {
      continue;
    }

    const crossProduct =
      (end.x - start.x) * (point.y - start.y) -
      (end.y - start.y) * (point.x - start.x);
    hasNegativeCrossProduct ||= crossProduct < 0;
    hasPositiveCrossProduct ||= crossProduct > 0;

    if (hasNegativeCrossProduct && hasPositiveCrossProduct) {
      return false;
    }
  }

  return true;
}

export function hitTestOverlayImages(
  scene: OverlayScene,
  point: OverlayPoint,
  viewport: ViewportSize,
): OverlayImageLayer | undefined {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return undefined;
  }

  for (let index = scene.layers.length - 1; index >= 0; index -= 1) {
    const layer = scene.layers[index];
    if (!layer || layer.kind !== 'image' || isOverlayImageHidden(layer)) {
      continue;
    }

    if (
      isPointInOverlayPolygon(point, getOverlayImagePolygon(layer, viewport))
    ) {
      return layer;
    }
  }

  return undefined;
}

export function getOverlayImagesIntersectingRect(
  images: readonly OverlayImageLayer[],
  selectionRect: OverlaySelectionRect,
  viewport: ViewportSize,
): OverlayImageLayer[] {
  return images.filter((image) => {
    if (isOverlayImageHidden(image)) {
      return false;
    }

    const bounds = getOverlayImageBounds(image, viewport);
    return !(
      bounds.right < selectionRect.left ||
      bounds.left > selectionRect.right ||
      bounds.bottom < selectionRect.top ||
      bounds.top > selectionRect.bottom
    );
  });
}
