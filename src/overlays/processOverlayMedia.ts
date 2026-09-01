import { decompressFrames, parseGIF, type ParsedGif } from 'gifuct-js';

import { rasterizeOverlayImage } from './imageProcessing';
import {
  MAX_OVERLAY_MEDIA_DIMENSION,
  type OverlayMediaProcessingOptions,
  type OverlayMediaProcessor,
  type OverlayMediaValidationErrorCode,
  type ProcessedOverlayMedia,
  validateOverlayMedia,
} from './mediaProcessing';

const GIF_MIME_TYPE = 'image/gif';
const WEBM_MIME_TYPE = 'video/webm';
const MIN_GIF_FRAME_DELAY_MS = 20;
const MAX_GIF_FRAME_PIXEL_AREA =
  MAX_OVERLAY_MEDIA_DIMENSION * MAX_OVERLAY_MEDIA_DIMENSION;
const MAX_GIF_DECODED_PIXEL_COUNT = 64 * 1024 * 1024;

function getValidationMessage(code: OverlayMediaValidationErrorCode): string {
  switch (code) {
    case 'file-too-large':
      return 'Overlay media must be no larger than 20 MiB.';
    case 'dimensions-too-large':
      return 'Overlay media longest edge must be no larger than 1920 pixels.';
    case 'too-many-frames':
      return 'Overlay GIF must contain no more than 300 frames.';
    case 'duration-too-long':
      return 'Overlay GIF must be no longer than 30 seconds.';
    case 'invalid-metadata':
      return 'Overlay media metadata is invalid.';
  }
}

function assertValidMedia(input: {
  durationMs?: number;
  fileSize: number;
  frameCount?: number;
  height: number;
  width: number;
}): void {
  const result = validateOverlayMedia(input);
  if (!result.isValid) {
    throw new Error(getValidationMessage(result.code));
  }
}

function throwIfAborted(options?: OverlayMediaProcessingOptions): void {
  if (!options?.signal?.aborted) {
    return;
  }

  throw options.signal.reason ?? new DOMException('Aborted', 'AbortError');
}

function isGif(file: File): boolean {
  const mediaType = file.type.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  if (mediaType === GIF_MIME_TYPE) {
    return true;
  }
  if (mediaType.startsWith('image/') || mediaType.startsWith('video/')) {
    return false;
  }

  return /\.gif$/iu.test(file.name);
}

function throwInvalidGifMetadata(): never {
  throw new Error(getValidationMessage('invalid-metadata'));
}

function assertValidGifFrameDescriptors(gif: ParsedGif): void {
  const logicalWidth = gif.lsd.width;
  const logicalHeight = gif.lsd.height;
  let decodedPixelCount = 0;
  if (
    !Number.isSafeInteger(logicalWidth) ||
    logicalWidth <= 0 ||
    !Number.isSafeInteger(logicalHeight) ||
    logicalHeight <= 0
  ) {
    throwInvalidGifMetadata();
  }

  for (const frame of gif.frames) {
    if (!('image' in frame)) {
      continue;
    }

    const { height, left, top, width } = frame.image.descriptor;
    if (
      !Number.isSafeInteger(width) ||
      width <= 0 ||
      !Number.isSafeInteger(height) ||
      height <= 0 ||
      !Number.isSafeInteger(left) ||
      left < 0 ||
      !Number.isSafeInteger(top) ||
      top < 0
    ) {
      throwInvalidGifMetadata();
    }

    const pixelArea = width * height;
    const right = left + width;
    const bottom = top + height;
    if (
      !Number.isSafeInteger(pixelArea) ||
      pixelArea > MAX_GIF_FRAME_PIXEL_AREA ||
      width > MAX_OVERLAY_MEDIA_DIMENSION ||
      height > MAX_OVERLAY_MEDIA_DIMENSION ||
      !Number.isSafeInteger(right) ||
      right > logicalWidth ||
      !Number.isSafeInteger(bottom) ||
      bottom > logicalHeight
    ) {
      throwInvalidGifMetadata();
    }

    decodedPixelCount += pixelArea;
    if (
      !Number.isSafeInteger(decodedPixelCount) ||
      decodedPixelCount > MAX_GIF_DECODED_PIXEL_COUNT
    ) {
      throw new Error('Overlay GIF exceeds the safe decoded pixel limit.');
    }
  }
}

function getGifFrameDurationMs(gif: ParsedGif): number {
  return gif.frames.reduce((durationMs, frame) => {
    if (!('image' in frame)) {
      return durationMs;
    }

    return durationMs + (frame.gce?.delay || 10) * 10;
  }, 0);
}

function getGifFrameCount(gif: ParsedGif): number {
  return gif.frames.filter((frame) => 'image' in frame).length;
}

function waitForFrame(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(delayMs, MIN_GIF_FRAME_DELAY_MS));
  });
}

async function recordGifFrames(
  gif: ParsedGif,
  options?: OverlayMediaProcessingOptions,
): Promise<ProcessedOverlayMedia> {
  const frames = decompressFrames(gif, true);
  if (frames.length === 0) {
    throw new Error('Overlay GIF contains no image frames.');
  }

  const outputSize = { height: gif.lsd.height, width: gif.lsd.width };
  const canvas = document.createElement('canvas');
  canvas.width = outputSize.width;
  canvas.height = outputSize.height;
  const context = canvas.getContext('2d');
  const patchCanvas = document.createElement('canvas');
  const patchContext = patchCanvas.getContext('2d');

  if (!context || !patchContext) {
    throw new Error('Canvas context is unavailable.');
  }

  if (typeof canvas.captureStream !== 'function') {
    throw new Error('GIF video encoding is unavailable.');
  }

  if (
    typeof MediaRecorder === 'undefined' ||
    (typeof MediaRecorder.isTypeSupported === 'function' &&
      !MediaRecorder.isTypeSupported(WEBM_MIME_TYPE))
  ) {
    throw new Error('WebM encoding is unavailable.');
  }

  const stream = canvas.captureStream();
  const recorder = new MediaRecorder(stream, { mimeType: WEBM_MIME_TYPE });
  const chunks: Blob[] = [];
  const recording = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event): void => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onerror = (): void => {
      reject(new Error('Overlay GIF could not be encoded.'));
    };
    recorder.onstop = (): void => {
      resolve(new Blob(chunks, { type: WEBM_MIME_TYPE }));
    };
  });

  try {
    recorder.start();
    try {
      for (const [index, frame] of frames.entries()) {
        throwIfAborted(options);
        const { dims, disposalType, patch } = frame;
        const previousFrame =
          disposalType === 3
            ? context.getImageData(dims.left, dims.top, dims.width, dims.height)
            : null;
        patchCanvas.width = dims.width;
        patchCanvas.height = dims.height;
        const patchData = new Uint8ClampedArray(patch.length);
        patchData.set(patch);
        patchContext.putImageData(
          new ImageData(patchData, dims.width, dims.height),
          0,
          0,
        );
        context.drawImage(patchCanvas, dims.left, dims.top);
        await waitForFrame(frame.delay);

        if (index < frames.length - 1) {
          if (disposalType === 2) {
            context.clearRect(dims.left, dims.top, dims.width, dims.height);
          } else if (previousFrame) {
            context.putImageData(previousFrame, dims.left, dims.top);
          }
        }
      }
    } catch (error) {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      await recording.catch(() => undefined);
      throw error;
    }

    recorder.stop();
    const blob = await recording;
    return {
      blob,
      durationMs: getGifFrameDurationMs(gif),
      frameCount: frames.length,
      ...outputSize,
      mediaKind: 'motion',
    };
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function processGif(
  file: File,
  options?: OverlayMediaProcessingOptions,
): Promise<ProcessedOverlayMedia> {
  throwIfAborted(options);
  let gif: ParsedGif;
  try {
    gif = parseGIF(await file.arrayBuffer());
  } catch (error) {
    throw new Error('Overlay GIF could not be decoded.', { cause: error });
  }

  const outputSize = { height: gif.lsd.height, width: gif.lsd.width };
  const frameCount = getGifFrameCount(gif);
  const durationMs = getGifFrameDurationMs(gif);
  assertValidMedia({
    durationMs,
    fileSize: file.size,
    frameCount,
    ...outputSize,
  });
  assertValidGifFrameDescriptors(gif);
  const processed = await recordGifFrames(gif, options);
  assertValidMedia({
    durationMs: processed.durationMs,
    fileSize: processed.blob.size,
    frameCount: processed.frameCount,
    height: processed.height,
    width: processed.width,
  });
  return processed;
}

function loadVideoMetadata(
  file: File,
  options?: OverlayMediaProcessingOptions,
): Promise<{ durationMs?: number; height: number; width: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    if (video.canPlayType(file.type) === '') {
      reject(new Error('Overlay video format is not playable.'));
      return;
    }

    const sourceUrl = URL.createObjectURL(file);
    const signal = options?.signal;

    function cleanup(): void {
      video.onerror = null;
      video.onloadedmetadata = null;
      signal?.removeEventListener('abort', handleAbort);
      URL.revokeObjectURL(sourceUrl);
    }

    function handleAbort(): void {
      cleanup();
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    }

    video.onerror = (): void => {
      cleanup();
      reject(new Error('Overlay video could not be loaded.'));
    };
    video.onloadedmetadata = (): void => {
      const durationMs =
        Number.isFinite(video.duration) && video.duration >= 0
          ? video.duration * 1_000
          : undefined;
      const metadata = {
        ...(durationMs === undefined ? {} : { durationMs }),
        height: video.videoHeight,
        width: video.videoWidth,
      };
      cleanup();
      resolve(metadata);
    };
    signal?.addEventListener('abort', handleAbort, { once: true });
    video.muted = true;
    video.preload = 'metadata';
    video.src = sourceUrl;

    if (signal?.aborted) {
      handleAbort();
    }
  });
}

async function processVideo(
  file: File,
  options?: OverlayMediaProcessingOptions,
): Promise<ProcessedOverlayMedia> {
  throwIfAborted(options);
  const metadata = await loadVideoMetadata(file, options);
  assertValidMedia({
    fileSize: file.size,
    height: metadata.height,
    width: metadata.width,
  });
  return {
    blob: file,
    ...metadata,
    mediaKind: 'motion',
  };
}

async function processStaticImage(
  file: File,
  options?: OverlayMediaProcessingOptions,
): Promise<ProcessedOverlayMedia> {
  throwIfAborted(options);
  const rasterized = await rasterizeOverlayImage(file);
  throwIfAborted(options);
  assertValidMedia({
    fileSize: rasterized.blob.size,
    height: rasterized.height,
    width: rasterized.width,
  });
  return { ...rasterized, mediaKind: 'static' };
}

const OVERLAY_MEDIA_PROCESSORS: readonly OverlayMediaProcessor[] = [
  {
    canProcess: isGif,
    process: processGif,
  },
  {
    canProcess: (file) => file.type.startsWith('video/'),
    process: processVideo,
  },
  {
    canProcess: (file) => file.type.startsWith('image/') && !isGif(file),
    process: processStaticImage,
  },
];

export async function processOverlayMedia(
  file: File,
  options?: OverlayMediaProcessingOptions,
): Promise<ProcessedOverlayMedia> {
  assertValidMedia({ fileSize: file.size, height: 1, width: 1 });
  const processor = OVERLAY_MEDIA_PROCESSORS.find((candidate) =>
    candidate.canProcess(file),
  );
  if (!processor) {
    throw new Error('Overlay file must be an image, GIF, or playable video.');
  }

  return processor.process(file, options);
}
