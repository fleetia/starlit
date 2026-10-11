import type { Placement } from '../layout/types';

export type OverlayAnchor = Placement;

export type OverlayMediaKind = 'static' | 'motion';

export type OverlayPlaybackRate = 0.5 | 1 | 1.5 | 2;

export type OverlayPlaybackMode = 'active-tab-only' | 'always';

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
  hidden?: boolean;
  locked?: boolean;
  mediaKind?: OverlayMediaKind;
  playbackRate?: OverlayPlaybackRate;
  playbackMode?: OverlayPlaybackMode;
  groupId?: string;
  draftMediaKey?: string;
};

export type OverlayMediaLayer = OverlayImageLayer;

export type OverlayLayer = OverlayBookmarkLayer | OverlayImageLayer;

export type OverlayScene = {
  layers: OverlayLayer[];
};
