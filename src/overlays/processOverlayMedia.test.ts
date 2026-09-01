import type { ParsedFrame, ParsedGif } from 'gifuct-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RasterizedOverlayImage } from './imageProcessing';

const processorMocks = vi.hoisted(() => ({
  decompressFrames:
    vi.fn<(gif: ParsedGif, buildImagePatches: true) => ParsedFrame[]>(),
  parseGIF: vi.fn<(arrayBuffer: ArrayBuffer) => ParsedGif>(),
  rasterizeOverlayImage:
    vi.fn<(file: File) => Promise<RasterizedOverlayImage>>(),
}));

vi.mock('gifuct-js', () => ({
  decompressFrames: processorMocks.decompressFrames,
  parseGIF: processorMocks.parseGIF,
}));

vi.mock('./imageProcessing', () => ({
  rasterizeOverlayImage: processorMocks.rasterizeOverlayImage,
}));

import { processOverlayMedia } from './processOverlayMedia';

const STATIC_BLOB = new Blob(['webp'], { type: 'image/webp' });

function createParsedGif(options: {
  delay: number;
  frameHeight?: number;
  frameLeft?: number;
  frameTop?: number;
  frameWidth?: number;
  frameCount?: number;
  height?: number;
  width?: number;
}): ParsedGif {
  const height = options.height ?? 1080;
  const width = options.width ?? 1920;
  const frames = Array.from({ length: options.frameCount ?? 1 }, () => ({
    gce: {
      delay: options.delay,
    },
    image: {
      descriptor: {
        height: options.frameHeight ?? height,
        lct: {
          exists: false,
          future: 0,
          interlaced: false,
          size: 0,
          sort: false,
        },
        left: options.frameLeft ?? 0,
        top: options.frameTop ?? 0,
        width: options.frameWidth ?? width,
      },
    },
  }));
  return {
    frames,
    gct: [],
    header: { signature: 'GIF', version: '89a' },
    lsd: {
      height,
      width,
    },
  } as unknown as ParsedGif;
}

beforeEach((): void => {
  processorMocks.rasterizeOverlayImage.mockResolvedValue({
    blob: STATIC_BLOB,
    height: 1080,
    width: 1920,
  });
});

afterEach((): void => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('processOverlayMedia', () => {
  it('routes static images through bounded WebP rasterization', async () => {
    const file = new File(['image'], 'stars.png', { type: 'image/png' });

    await expect(processOverlayMedia(file)).resolves.toEqual({
      blob: STATIC_BLOB,
      height: 1080,
      mediaKind: 'static',
      width: 1920,
    });
    expect(processorMocks.rasterizeOverlayImage).toHaveBeenCalledWith(file);
  });

  it('rejects input over 20 MiB before selecting a processor', async () => {
    const file = new File(['image'], 'large.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', {
      configurable: true,
      value: 20 * 1024 * 1024 + 1,
    });

    await expect(processOverlayMedia(file)).rejects.toThrow('20 MiB');
    expect(processorMocks.rasterizeOverlayImage).not.toHaveBeenCalled();
  });

  it('rejects processed output over 20 MiB before it can be saved', async () => {
    const oversizedBlob = new Blob(['webp'], { type: 'image/webp' });
    Object.defineProperty(oversizedBlob, 'size', {
      configurable: true,
      value: 20 * 1024 * 1024 + 1,
    });
    processorMocks.rasterizeOverlayImage.mockResolvedValue({
      blob: oversizedBlob,
      height: 1080,
      width: 1920,
    });
    const file = new File(['image'], 'stars.png', { type: 'image/png' });

    await expect(processOverlayMedia(file)).rejects.toThrow('20 MiB');
  });

  it('keeps playable video bytes and validates metadata before returning', async () => {
    const video = {
      canPlayType: vi.fn(() => 'probably'),
      duration: 12,
      muted: false,
      onerror: null,
      onloadedmetadata: null,
      preload: '',
      videoHeight: 720,
      videoWidth: 1280,
    } as unknown as HTMLVideoElement;
    Object.defineProperty(video, 'src', {
      configurable: true,
      set(): void {
        queueMicrotask(() =>
          video.onloadedmetadata?.(new Event('loadedmetadata')),
        );
      },
    });
    vi.spyOn(document, 'createElement').mockReturnValue(video);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:video');
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const file = new File(['video'], 'stars.webm', { type: 'video/webm' });

    await expect(processOverlayMedia(file)).resolves.toEqual({
      blob: file,
      durationMs: 12_000,
      height: 720,
      mediaKind: 'motion',
      width: 1280,
    });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:video');
  });

  it('uses the processed WebM MIME type when duplicate or import retains a GIF filename', async () => {
    const video = {
      canPlayType: vi.fn(() => 'probably'),
      duration: 1,
      muted: false,
      onerror: null,
      onloadedmetadata: null,
      preload: '',
      videoHeight: 360,
      videoWidth: 640,
    } as unknown as HTMLVideoElement;
    Object.defineProperty(video, 'src', {
      configurable: true,
      set(): void {
        queueMicrotask(() =>
          video.onloadedmetadata?.(new Event('loadedmetadata')),
        );
      },
    });
    vi.spyOn(document, 'createElement').mockReturnValue(video);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:video');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const file = new File(['webm'], 'original.gif', { type: 'video/webm' });

    await expect(processOverlayMedia(file)).resolves.toMatchObject({
      blob: file,
      mediaKind: 'motion',
    });
    expect(processorMocks.parseGIF).not.toHaveBeenCalled();
  });

  it.each([
    [{ delay: 1, frameCount: 301 }, '300 frames'],
    [{ delay: 3_001 }, '30 seconds'],
    [{ delay: 1, height: 2160, width: 3840 }, '1920 pixels'],
  ] as const)(
    'validates GIF frame and duration limits before decoding patches',
    async (gifOptions, message) => {
      processorMocks.parseGIF.mockReturnValue(createParsedGif(gifOptions));
      const file = new File(['gif'], 'stars.gif', { type: 'image/gif' });

      await expect(processOverlayMedia(file)).rejects.toThrow(message);
      expect(processorMocks.decompressFrames).not.toHaveBeenCalled();
    },
  );

  it('rejects an unsafe aggregate GIF decode budget before allocating frame patches', async () => {
    processorMocks.parseGIF.mockReturnValue(
      createParsedGif({
        delay: 1,
        frameCount: 300,
        height: 1920,
        width: 1920,
      }),
    );
    const file = new File(['gif'], 'compressed-stars.gif', {
      type: 'image/gif',
    });

    await expect(processOverlayMedia(file)).rejects.toThrow(
      'safe decoded pixel limit',
    );
    expect(processorMocks.decompressFrames).not.toHaveBeenCalled();
  });

  it.each([
    {
      gifOptions: { delay: 1, frameHeight: 0 },
      label: 'invalid frame dimensions',
    },
    {
      gifOptions: { delay: 1, frameLeft: 1, frameWidth: 1920 },
      label: 'a frame outside the logical screen',
    },
    {
      gifOptions: {
        delay: 1,
        frameHeight: Number.MAX_SAFE_INTEGER,
        frameWidth: Number.MAX_SAFE_INTEGER,
      },
      label: 'an unsafe frame pixel area',
    },
  ] as const)(
    'rejects $label before allocating GIF frame patches',
    async ({ gifOptions }) => {
      processorMocks.parseGIF.mockReturnValue(createParsedGif(gifOptions));
      const file = new File(['gif'], 'stars.gif', { type: 'image/gif' });

      await expect(processOverlayMedia(file)).rejects.toThrow(
        'metadata is invalid',
      );
      expect(processorMocks.decompressFrames).not.toHaveBeenCalled();
    },
  );

  it('converts a bounded GIF frame sequence to WebM', async () => {
    const gif = createParsedGif({ delay: 2, height: 1080, width: 1920 });
    processorMocks.parseGIF.mockReturnValue(gif);
    processorMocks.decompressFrames.mockReturnValue([
      {
        delay: 20,
        dims: { height: 2, left: 3, top: 4, width: 2 },
        disposalType: 2,
        patch: new Uint8ClampedArray(16),
      } as ParsedFrame,
    ]);
    const context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const patchContext = {
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const stopTrack = vi.fn();
    const stream = {
      getTracks: vi.fn(() => [{ stop: stopTrack }]),
    } as unknown as MediaStream;
    const canvas = {
      captureStream: vi.fn(() => stream),
      getContext: vi.fn(() => context),
      height: 0,
      width: 0,
    } as unknown as HTMLCanvasElement;
    const patchCanvas = {
      getContext: vi.fn(() => patchContext),
      height: 0,
      width: 0,
    } as unknown as HTMLCanvasElement;
    vi.spyOn(document, 'createElement')
      .mockReturnValueOnce(canvas)
      .mockReturnValueOnce(patchCanvas);
    const recorder = {
      ondataavailable: null as ((event: BlobEvent) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      onstop: null as ((event: Event) => void) | null,
      start: vi.fn(function start(): void {
        recorder.state = 'recording';
      }),
      state: 'inactive' as RecordingState,
      stop: vi.fn(function stop(): void {
        recorder.state = 'inactive';
        recorder.ondataavailable?.({
          data: new Blob(['webm'], { type: 'video/webm' }),
        } as BlobEvent);
        recorder.onstop?.(new Event('stop'));
      }),
    };
    const mediaRecorder = vi.fn(function createMediaRecorder(): MediaRecorder {
      return recorder as unknown as MediaRecorder;
    });
    Object.defineProperty(mediaRecorder, 'isTypeSupported', {
      configurable: true,
      value: vi.fn(() => true),
    });
    vi.stubGlobal(
      'MediaRecorder',
      mediaRecorder as unknown as typeof MediaRecorder,
    );
    vi.stubGlobal(
      'ImageData',
      vi.fn(function createImageData(): ImageData {
        return {} as ImageData;
      }) as unknown as typeof ImageData,
    );
    const file = new File(['gif'], 'stars.gif', { type: 'image/gif' });

    const result = await processOverlayMedia(file);

    expect(result).toMatchObject({
      durationMs: 20,
      frameCount: 1,
      height: 1080,
      mediaKind: 'motion',
      width: 1920,
    });
    expect(result.blob.type).toBe('video/webm');
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
    expect(context.drawImage).toHaveBeenCalledWith(patchCanvas, 3, 4);
    expect(stopTrack).toHaveBeenCalledOnce();
  });
});
