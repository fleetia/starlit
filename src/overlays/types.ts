import type { Placement } from '../layout/types';

export type OverlayAnchor = Placement;

export type OverlayBookmarkLayer = {
  kind: 'bookmarks';
};

export type OverlayImageLayer = {
  kind: 'image';
  id: string;
  name: string;
  anchor: OverlayAnchor;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  rotationDeg: number;
  scale?: number;
  draftMediaKey?: string;
};

export type OverlayLayer = OverlayBookmarkLayer | OverlayImageLayer;

export type OverlayScene = {
  layers: OverlayLayer[];
};
