import type { OverlayMediaKind } from './types';

export const MAX_OVERLAY_MEDIA_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_OVERLAY_MEDIA_DIMENSION = 1920;
export const MAX_OVERLAY_GIF_FRAME_COUNT = 300;
export const MAX_OVERLAY_GIF_DURATION_MS = 30_000;

export type OverlayMediaValidationInput = {
  durationMs?: number;
  fileSize: number;
  frameCount?: number;
  height: number;
  width: number;
};

export type OverlayMediaValidationErrorCode =
  | 'invalid-metadata'
  | 'file-too-large'
  | 'dimensions-too-large'
  | 'too-many-frames'
  | 'duration-too-long';

export type OverlayMediaValidationResult =
  | { isValid: true }
  | { code: OverlayMediaValidationErrorCode; isValid: false };

export type ProcessedOverlayMedia = {
  blob: Blob;
  durationMs?: number;
  frameCount?: number;
  height: number;
  mediaKind: OverlayMediaKind;
  width: number;
};

export type OverlayMediaProcessingOptions = {
  signal?: AbortSignal;
};

export type OverlayMediaProcessor = {
  canProcess: (file: File) => boolean;
  process: (
    file: File,
    options?: OverlayMediaProcessingOptions,
  ) => Promise<ProcessedOverlayMedia>;
};

function hasValidMetadata(input: OverlayMediaValidationInput): boolean {
  if (
    !Number.isFinite(input.fileSize) ||
    input.fileSize <= 0 ||
    !Number.isFinite(input.width) ||
    input.width <= 0 ||
    !Number.isFinite(input.height) ||
    input.height <= 0
  ) {
    return false;
  }

  if (
    input.frameCount !== undefined &&
    (!Number.isInteger(input.frameCount) || input.frameCount <= 0)
  ) {
    return false;
  }

  return !(
    input.durationMs !== undefined &&
    (!Number.isFinite(input.durationMs) || input.durationMs < 0)
  );
}

export function validateOverlayMedia(
  input: OverlayMediaValidationInput,
): OverlayMediaValidationResult {
  if (!hasValidMetadata(input)) {
    return { code: 'invalid-metadata', isValid: false };
  }

  if (input.fileSize > MAX_OVERLAY_MEDIA_FILE_SIZE_BYTES) {
    return { code: 'file-too-large', isValid: false };
  }

  if (
    input.width > MAX_OVERLAY_MEDIA_DIMENSION ||
    input.height > MAX_OVERLAY_MEDIA_DIMENSION
  ) {
    return { code: 'dimensions-too-large', isValid: false };
  }

  if (
    input.frameCount !== undefined &&
    input.frameCount > MAX_OVERLAY_GIF_FRAME_COUNT
  ) {
    return { code: 'too-many-frames', isValid: false };
  }

  if (
    input.durationMs !== undefined &&
    input.durationMs > MAX_OVERLAY_GIF_DURATION_MS
  ) {
    return { code: 'duration-too-long', isValid: false };
  }

  return { isValid: true };
}
