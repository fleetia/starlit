import { describe, expect, it } from 'vitest';

import {
  MAX_OVERLAY_GIF_DURATION_MS,
  MAX_OVERLAY_GIF_FRAME_COUNT,
  MAX_OVERLAY_MEDIA_DIMENSION,
  MAX_OVERLAY_MEDIA_FILE_SIZE_BYTES,
  validateOverlayMedia,
} from './mediaProcessing';

const VALID_MEDIA = {
  durationMs: 30_000,
  fileSize: 20 * 1024 * 1024,
  frameCount: 300,
  height: 1080,
  width: 1920,
};

describe('overlay media validation', () => {
  it('publishes the shared media limits and accepts their boundaries', () => {
    expect(MAX_OVERLAY_MEDIA_FILE_SIZE_BYTES).toBe(20 * 1024 * 1024);
    expect(MAX_OVERLAY_MEDIA_DIMENSION).toBe(1920);
    expect(MAX_OVERLAY_GIF_FRAME_COUNT).toBe(300);
    expect(MAX_OVERLAY_GIF_DURATION_MS).toBe(30_000);
    expect(validateOverlayMedia(VALID_MEDIA)).toEqual({ isValid: true });
  });

  it.each([
    [{ fileSize: VALID_MEDIA.fileSize + 1 }, 'file-too-large'],
    [{ width: 1921 }, 'dimensions-too-large'],
    [{ frameCount: 301 }, 'too-many-frames'],
    [{ durationMs: 30_001 }, 'duration-too-long'],
  ] as const)('rejects media beyond a limit', (override, code) => {
    expect(validateOverlayMedia({ ...VALID_MEDIA, ...override })).toEqual({
      code,
      isValid: false,
    });
  });

  it('rejects invalid finite metadata before applying upper bounds', () => {
    expect(
      validateOverlayMedia({
        ...VALID_MEDIA,
        frameCount: Number.NaN,
      }),
    ).toEqual({ code: 'invalid-metadata', isValid: false });
    expect(validateOverlayMedia({ ...VALID_MEDIA, fileSize: 0 })).toEqual({
      code: 'invalid-metadata',
      isValid: false,
    });
  });
});
