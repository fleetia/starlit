import { act, renderHook, waitFor } from '@testing-library/react';
import type { ParsedFrame, ParsedGif } from 'gifuct-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BackgroundMedia } from './backgroundMedia';
import { useBackgroundImage } from './useBackgroundImage';

const storageState = vi.hoisted(() => ({
  meta: null as BackgroundMedia | null,
  setMeta: vi.fn<(meta: BackgroundMedia | null) => Promise<void>>(),
}));

const mediaMocks = vi.hoisted(() => ({
  deleteMedia: vi.fn<(key: string) => Promise<void>>(),
  loadMedia: vi.fn<(key: string) => Promise<string | null>>(),
  loadMediaBlob: vi.fn<(key: string) => Promise<Blob | null>>(),
  saveMedia: vi.fn<(key: string, blob: Blob) => Promise<string>>(),
}));

const gifMocks = vi.hoisted(() => ({
  decompressFrames:
    vi.fn<(gif: ParsedGif, buildImagePatches: true) => ParsedFrame[]>(),
  parseGIF: vi.fn<(arrayBuffer: ArrayBuffer) => ParsedGif>(),
}));

vi.mock('../hooks/useStorageState', () => ({
  useStorageState: () => ({
    isLoaded: true,
    setValue: storageState.setMeta,
    value: storageState.meta,
  }),
}));

vi.mock('../platform/storage/mediaStorage', () => mediaMocks);

vi.mock('gifuct-js', () => gifMocks);

beforeEach((): void => {
  storageState.meta = null;
  storageState.setMeta.mockResolvedValue(undefined);
  mediaMocks.deleteMedia.mockResolvedValue(undefined);
  mediaMocks.loadMedia.mockResolvedValue(null);
  mediaMocks.loadMediaBlob.mockResolvedValue(null);
  mediaMocks.saveMedia.mockResolvedValue('blob:background-media');
  gifMocks.parseGIF.mockReturnValue({
    lsd: { height: 80, width: 120 },
  } as ParsedGif);
  gifMocks.decompressFrames.mockReturnValue([]);
});

describe('useBackgroundImage', () => {
  it.each([
    ['https://example.com/background.jpg', 'image'],
    ['https://example.com/background.mp4?download=1', 'video'],
    ['https://example.com/animated.gif', 'image'],
  ] as const)('classifies URL media %s as %s', async (url, type) => {
    const { result } = renderHook(() => useBackgroundImage());

    await act(async (): Promise<void> => {
      await result.current.updateFromUrl(url);
    });

    expect(mediaMocks.deleteMedia).toHaveBeenCalledWith('backgroundMedia');
    expect(storageState.setMeta).toHaveBeenCalledWith({
      source: 'url',
      type,
      url,
    });
  });

  it('derives a safe image layer without applying CSS as a side effect', () => {
    storageState.meta = {
      source: 'url',
      type: 'image',
      url: 'https://example.com/a"b.png',
    };

    const { result } = renderHook(() => useBackgroundImage());

    expect(result.current.backgroundImage).toBe(
      'url("https://example.com/a\\"b.png")',
    );
  });

  it('reports a missing device-local file', async () => {
    storageState.meta = { source: 'file', type: 'video', url: '' };
    mediaMocks.loadMedia.mockResolvedValue(null);

    const { result } = renderHook(() => useBackgroundImage());

    await waitFor(() => expect(result.current.isMediaMissing).toBe(true));
    expect(result.current.blobUrl).toBe('');
    expect(result.current.backgroundImage).toBe('none');
  });

  it('falls back when device-local media cannot be read', async () => {
    storageState.meta = { source: 'file', type: 'image', url: '' };
    mediaMocks.loadMedia.mockRejectedValue(new Error('IndexedDB failed'));

    const { result } = renderHook(() => useBackgroundImage());

    await waitFor(() => expect(result.current.isMediaMissing).toBe(true));
    expect(result.current.blobUrl).toBe('');
    expect(result.current.backgroundImage).toBe('none');
  });

  it('stores a video file and hydrates the active object URL from media storage', async () => {
    const file = new File(['video'], 'background.mp4', {
      type: 'video/mp4',
    });
    mediaMocks.loadMedia.mockResolvedValue('blob:hydrated-background-media');
    const { rerender, result } = renderHook(() => useBackgroundImage());

    await act(async (): Promise<void> => {
      await result.current.updateFromFile(file);
    });

    expect(mediaMocks.saveMedia).toHaveBeenCalledWith('backgroundMedia', file);
    expect(storageState.setMeta).toHaveBeenCalledWith({
      source: 'file',
      type: 'video',
      url: '',
    });
    expect(result.current.blobUrl).toBe('');

    storageState.meta = { source: 'file', type: 'video', url: '' };
    rerender();

    await waitFor(() =>
      expect(result.current.blobUrl).toBe('blob:hydrated-background-media'),
    );
    expect(result.current.isProcessing).toBe(false);
  });

  it('places GIF patches at their offsets and disposes them after display', async () => {
    const clearRect = vi.fn();
    const drawImage = vi.fn();
    const restoreFrame = vi.fn();
    const previousFrame = {} as ImageData;
    const mainContext = {
      clearRect,
      drawImage,
      getImageData: vi.fn(() => previousFrame),
      putImageData: restoreFrame,
    } as unknown as CanvasRenderingContext2D;
    const putImageData = vi.fn();
    const patchContext = {
      putImageData,
    } as unknown as CanvasRenderingContext2D;
    const mainCanvas = document.createElement('canvas');
    const patchCanvas = document.createElement('canvas');

    vi.spyOn(mainCanvas, 'getContext').mockReturnValue(mainContext);
    vi.spyOn(patchCanvas, 'getContext').mockReturnValue(patchContext);
    Object.defineProperty(mainCanvas, 'captureStream', {
      configurable: true,
      value: vi.fn(() => ({}) as MediaStream),
    });

    class TestMediaRecorder {
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: ((event: Event) => void) | null = null;

      start(): void {}

      stop(): void {
        this.ondataavailable?.({
          data: new Blob(['webm'], { type: 'video/webm' }),
        } as BlobEvent);
        this.onstop?.(new Event('stop'));
      }
    }

    vi.stubGlobal('MediaRecorder', TestMediaRecorder);
    gifMocks.decompressFrames.mockReturnValue([
      {
        delay: 0,
        dims: { height: 4, left: 9, top: 7, width: 6 },
        disposalType: 2,
        patch: new Uint8ClampedArray(6 * 4 * 4),
      } as ParsedFrame,
      {
        delay: 0,
        dims: { height: 2, left: 4, top: 5, width: 3 },
        disposalType: 3,
        patch: new Uint8ClampedArray(3 * 2 * 4),
      } as ParsedFrame,
      {
        delay: 0,
        dims: { height: 1, left: 0, top: 0, width: 1 },
        disposalType: 1,
        patch: new Uint8ClampedArray(4),
      } as ParsedFrame,
    ]);

    const file = new File(['gif'], 'background.gif', { type: 'image/gif' });
    const { result } = renderHook(() => useBackgroundImage());

    vi.spyOn(document, 'createElement')
      .mockReturnValueOnce(mainCanvas)
      .mockReturnValueOnce(patchCanvas);

    await act(async (): Promise<void> => {
      await result.current.updateFromFile(file);
    });

    expect(mainCanvas.width).toBe(120);
    expect(mainCanvas.height).toBe(80);
    expect(putImageData).toHaveBeenCalledTimes(3);
    expect(drawImage).toHaveBeenNthCalledWith(1, patchCanvas, 9, 7);
    expect(clearRect).toHaveBeenCalledWith(9, 7, 6, 4);
    expect(clearRect.mock.invocationCallOrder[0]).toBeGreaterThan(
      drawImage.mock.invocationCallOrder[0] ?? 0,
    );
    expect(mainContext.getImageData).toHaveBeenCalledWith(4, 5, 3, 2);
    expect(restoreFrame).toHaveBeenCalledWith(previousFrame, 4, 5);
    expect(restoreFrame.mock.invocationCallOrder[0]).toBeGreaterThan(
      drawImage.mock.invocationCallOrder[1] ?? 0,
    );
    expect(mediaMocks.saveMedia).toHaveBeenCalledWith(
      'backgroundMedia',
      expect.objectContaining({ type: 'video/webm' }),
    );

    vi.unstubAllGlobals();
  });

  it('clears both persisted media and local state', async () => {
    const { result } = renderHook(() => useBackgroundImage());

    await act(async (): Promise<void> => {
      await result.current.clear();
    });

    expect(mediaMocks.deleteMedia).toHaveBeenCalledWith('backgroundMedia');
    expect(storageState.setMeta).toHaveBeenCalledWith(null);
    expect(result.current.blobUrl).toBe('');
  });

  it('restores the previous file background when metadata persistence fails', async () => {
    const previousBlob = new Blob(['previous'], { type: 'image/webp' });
    storageState.meta = { source: 'file', type: 'image', url: '' };
    mediaMocks.loadMediaBlob.mockResolvedValue(previousBlob);
    storageState.setMeta
      .mockRejectedValueOnce(new Error('storage failed'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useBackgroundImage());

    await expect(
      act(async (): Promise<void> => {
        await result.current.updateFromUrl(
          'https://example.com/replacement.jpg',
        );
      }),
    ).rejects.toThrow('storage failed');

    expect(mediaMocks.saveMedia).toHaveBeenCalledWith(
      'backgroundMedia',
      previousBlob,
    );
    expect(storageState.setMeta).toHaveBeenLastCalledWith(storageState.meta);
  });
});
