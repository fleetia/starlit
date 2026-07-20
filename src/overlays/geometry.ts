import type { CSSProperties } from 'react';

import { getOverlayImageScale } from './model';
import type { OverlayAnchor, OverlayImageLayer } from './types';

export type ViewportSize = {
  height: number;
  width: number;
};

type Point = {
  x: number;
  y: number;
};

type AnchorAxis = 'start' | 'center' | 'end';

type AnchorAxes = {
  horizontal: AnchorAxis;
  vertical: AnchorAxis;
};

const ANCHOR_AXES: Record<OverlayAnchor, AnchorAxes> = {
  'top-left': { horizontal: 'start', vertical: 'start' },
  'top-center': { horizontal: 'center', vertical: 'start' },
  'top-right': { horizontal: 'end', vertical: 'start' },
  'center-left': { horizontal: 'start', vertical: 'center' },
  'center-center': { horizontal: 'center', vertical: 'center' },
  'center-right': { horizontal: 'end', vertical: 'center' },
  'bottom-left': { horizontal: 'start', vertical: 'end' },
  'bottom-center': { horizontal: 'center', vertical: 'end' },
  'bottom-right': { horizontal: 'end', vertical: 'end' },
};

const TRANSFORM_ORIGINS: Record<OverlayAnchor, string> = {
  'top-left': 'top left',
  'top-center': 'top center',
  'top-right': 'top right',
  'center-left': 'center left',
  'center-center': 'center center',
  'center-right': 'center right',
  'bottom-left': 'bottom left',
  'bottom-center': 'bottom center',
  'bottom-right': 'bottom right',
};

function getLocalAxisPoint(axis: AnchorAxis, size: number): number {
  if (axis === 'center') {
    return size / 2;
  }

  return axis === 'end' ? size : 0;
}

function getViewportAxisPoint(
  axis: AnchorAxis,
  offset: number,
  viewportSize: number,
): number {
  if (axis === 'center') {
    return viewportSize / 2 + offset;
  }

  return axis === 'end' ? viewportSize - offset : offset;
}

function getOffsetFromViewportAxisPoint(
  axis: AnchorAxis,
  point: number,
  viewportSize: number,
): number {
  if (axis === 'center') {
    return point - viewportSize / 2;
  }

  return axis === 'end' ? viewportSize - point : point;
}

function getCenteredInset(offset: number, size: number): string {
  const inset = offset - size / 2;
  const operator = inset < 0 ? '-' : '+';

  return `calc(50% ${operator} ${Math.abs(inset)}px)`;
}

function getHorizontalInset(
  axis: AnchorAxis,
  offset: number,
  width: number,
): CSSProperties {
  if (axis === 'center') {
    return { left: getCenteredInset(offset, width) };
  }

  return axis === 'end' ? { right: `${offset}px` } : { left: `${offset}px` };
}

function getVerticalInset(
  axis: AnchorAxis,
  offset: number,
  height: number,
): CSSProperties {
  if (axis === 'center') {
    return { top: getCenteredInset(offset, height) };
  }

  return axis === 'end' ? { bottom: `${offset}px` } : { top: `${offset}px` };
}

function getMoveOffsetDelta(axis: AnchorAxis, delta: number): number {
  return axis === 'end' ? -delta : delta;
}

function getLocalAnchorPoint(
  anchor: OverlayAnchor,
  width: number,
  height: number,
): Point {
  const axes = ANCHOR_AXES[anchor];

  return {
    x: getLocalAxisPoint(axes.horizontal, width),
    y: getLocalAxisPoint(axes.vertical, height),
  };
}

function getViewportAnchorPoint(
  anchor: OverlayAnchor,
  offsetX: number,
  offsetY: number,
  viewport: ViewportSize,
): Point {
  const axes = ANCHOR_AXES[anchor];

  return {
    x: getViewportAxisPoint(axes.horizontal, offsetX, viewport.width),
    y: getViewportAxisPoint(axes.vertical, offsetY, viewport.height),
  };
}

function rotatePoint(point: Point, rotationDeg: number): Point {
  const radians = (rotationDeg * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  };
}

export function getOverlayImageStyle(layer: OverlayImageLayer): CSSProperties {
  const scale = getOverlayImageScale(layer);
  const scaledHeight = layer.height * scale;
  const scaledWidth = layer.width * scale;
  const axes = ANCHOR_AXES[layer.anchor];

  return {
    ...getHorizontalInset(axes.horizontal, layer.offsetX, scaledWidth),
    ...getVerticalInset(axes.vertical, layer.offsetY, scaledHeight),
    height: `${scaledHeight}px`,
    transform: `rotate(${layer.rotationDeg}deg)`,
    transformOrigin: TRANSFORM_ORIGINS[layer.anchor],
    width: `${scaledWidth}px`,
  };
}

export function moveOverlayImage(
  layer: OverlayImageLayer,
  deltaX: number,
  deltaY: number,
): OverlayImageLayer {
  const axes = ANCHOR_AXES[layer.anchor];

  return {
    ...layer,
    offsetX: layer.offsetX + getMoveOffsetDelta(axes.horizontal, deltaX),
    offsetY: layer.offsetY + getMoveOffsetDelta(axes.vertical, deltaY),
  };
}

export function changeOverlayImageAnchor(
  layer: OverlayImageLayer,
  nextAnchor: OverlayAnchor,
  viewport: ViewportSize,
): OverlayImageLayer {
  if (layer.anchor === nextAnchor) {
    return layer;
  }

  const scale = getOverlayImageScale(layer);
  const scaledWidth = layer.width * scale;
  const scaledHeight = layer.height * scale;

  const currentLocalAnchor = getLocalAnchorPoint(
    layer.anchor,
    scaledWidth,
    scaledHeight,
  );
  const nextLocalAnchor = getLocalAnchorPoint(
    nextAnchor,
    scaledWidth,
    scaledHeight,
  );
  const currentViewportAnchor = getViewportAnchorPoint(
    layer.anchor,
    layer.offsetX,
    layer.offsetY,
    viewport,
  );
  const rotatedAnchorDelta = rotatePoint(
    {
      x: nextLocalAnchor.x - currentLocalAnchor.x,
      y: nextLocalAnchor.y - currentLocalAnchor.y,
    },
    layer.rotationDeg,
  );
  const nextViewportAnchor = {
    x: currentViewportAnchor.x + rotatedAnchorDelta.x,
    y: currentViewportAnchor.y + rotatedAnchorDelta.y,
  };
  const nextAxes = ANCHOR_AXES[nextAnchor];

  return {
    ...layer,
    anchor: nextAnchor,
    offsetX: getOffsetFromViewportAxisPoint(
      nextAxes.horizontal,
      nextViewportAnchor.x,
      viewport.width,
    ),
    offsetY: getOffsetFromViewportAxisPoint(
      nextAxes.vertical,
      nextViewportAnchor.y,
      viewport.height,
    ),
  };
}
