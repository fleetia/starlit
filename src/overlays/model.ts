import type {
  OverlayAnchor,
  OverlayImageLayer,
  OverlayLayer,
  OverlayScene,
} from './types';

export const OVERLAY_SCENE_STORAGE_KEY = 'overlayScene';
export const OVERLAY_IMAGE_MEDIA_KEY_PREFIX = 'overlayImage:';
export const OVERLAY_DRAFT_MEDIA_KEY_PREFIX = 'overlayImageDraft:';
export const OVERLAY_DRAFT_LEASE_KEY_PREFIX = 'overlayImageDraftLease:';
export const OVERLAY_MEDIA_MUTATION_LEASE_KEY_PREFIX =
  'overlayMediaMutationLease:';
export const DEFAULT_OVERLAY_IMAGE_SCALE = 1;
export const MIN_OVERLAY_IMAGE_SCALE = 0.1;
export const MAX_OVERLAY_IMAGE_SCALE = 4;
export const DEFAULT_OVERLAY_IMAGE_ID = 'starlit-default-getting-v1';
export const EMPTY_OVERLAY_SCENE: OverlayScene = {
  layers: [{ kind: 'bookmarks' }],
};
export const DEFAULT_OVERLAY_SCENE: OverlayScene = {
  layers: [
    { kind: 'bookmarks' },
    {
      anchor: 'bottom-right',
      height: 351,
      id: DEFAULT_OVERLAY_IMAGE_ID,
      kind: 'image',
      name: 'getting.png',
      offsetX: 24,
      offsetY: 24,
      rotationDeg: 0,
      scale: DEFAULT_OVERLAY_IMAGE_SCALE,
      width: 392,
    },
  ],
};

const OVERLAY_ANCHORS: readonly OverlayAnchor[] = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center-center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOverlayAnchor(value: unknown): value is OverlayAnchor {
  return OVERLAY_ANCHORS.some((anchor) => anchor === value);
}

function parseOverlayImageLayer(
  value: Record<string, unknown>,
): OverlayImageLayer {
  const scale = value.scale;

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    throw new Error('Overlay image id must be a non-empty string.');
  }

  if (typeof value.name !== 'string') {
    throw new Error('Overlay image name must be a string.');
  }

  if (!isOverlayAnchor(value.anchor)) {
    throw new Error('Overlay image anchor is invalid.');
  }

  if (!isFiniteNumber(value.offsetX) || !isFiniteNumber(value.offsetY)) {
    throw new Error('Overlay image offsets must be finite numbers.');
  }

  if (
    !isFiniteNumber(value.width) ||
    value.width <= 0 ||
    !isFiniteNumber(value.height) ||
    value.height <= 0
  ) {
    throw new Error(
      'Overlay image dimensions must be positive finite numbers.',
    );
  }

  if (!isFiniteNumber(value.rotationDeg)) {
    throw new Error('Overlay image rotation must be a finite number.');
  }

  if (
    scale !== undefined &&
    (!isFiniteNumber(scale) ||
      scale < MIN_OVERLAY_IMAGE_SCALE ||
      scale > MAX_OVERLAY_IMAGE_SCALE)
  ) {
    throw new Error('Overlay image scale is invalid.');
  }

  return {
    anchor: value.anchor,
    height: value.height,
    id: value.id,
    kind: 'image',
    name: value.name,
    offsetX: value.offsetX,
    offsetY: value.offsetY,
    rotationDeg: value.rotationDeg,
    ...(scale === undefined ? {} : { scale }),
    width: value.width,
  };
}

function parseOverlayLayer(value: unknown): OverlayLayer {
  if (!isRecord(value)) {
    throw new Error('Overlay layer must be an object.');
  }

  if (value.kind === 'bookmarks') {
    return { kind: 'bookmarks' };
  }

  if (value.kind === 'image') {
    return parseOverlayImageLayer(value);
  }

  throw new Error('Overlay layer kind is invalid.');
}

export function parseOverlayScene(value: unknown): OverlayScene {
  if (!isRecord(value) || !Array.isArray(value.layers)) {
    throw new Error('Overlay scene must contain a layers array.');
  }

  const layers = Array.from(value.layers, parseOverlayLayer);
  const bookmarkCount = layers.filter(
    (layer) => layer.kind === 'bookmarks',
  ).length;

  if (bookmarkCount !== 1) {
    throw new Error('Overlay scene must contain exactly one bookmarks layer.');
  }

  const imageIds = layers
    .filter((layer): layer is OverlayImageLayer => layer.kind === 'image')
    .map((layer) => layer.id);

  if (new Set(imageIds).size !== imageIds.length) {
    throw new Error('Overlay image ids must be unique.');
  }

  return { layers };
}

export function normalizeOverlayScene(value: unknown): OverlayScene {
  try {
    return parseOverlayScene(value);
  } catch {
    return EMPTY_OVERLAY_SCENE;
  }
}

export function getOverlayMediaKey(id: string): string {
  return `${OVERLAY_IMAGE_MEDIA_KEY_PREFIX}${id}`;
}

export function getOverlayDraftMediaKey(sessionId: string, id: string): string {
  return `${OVERLAY_DRAFT_MEDIA_KEY_PREFIX}${sessionId}:${id}`;
}

export function getOverlayImageLayers(
  scene: OverlayScene,
): OverlayImageLayer[] {
  return scene.layers.filter(
    (layer): layer is OverlayImageLayer => layer.kind === 'image',
  );
}

export function getOverlayImageScale(image: OverlayImageLayer): number {
  return image.scale ?? DEFAULT_OVERLAY_IMAGE_SCALE;
}

export function appendOverlayImages(
  scene: OverlayScene,
  images: readonly OverlayImageLayer[],
): OverlayScene {
  const layers = [...scene.layers, ...images];
  parseOverlayScene({ layers });
  return { layers };
}
