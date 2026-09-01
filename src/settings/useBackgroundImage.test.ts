import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProcessedOverlayMedia } from '../overlays/mediaProcessing';
import type { BackgroundMedia } from './backgroundMedia';
import { useBackgroundImage } from './useBackgroundImage';

const storageState = vi.hoisted(() => ({
  area: undefined as 'local' | 'sync' | undefined,
  meta: null as unknown,
  setMeta: vi.fn<(meta: BackgroundMedia | null) => Promise<void>>(),
}));

const mediaMocks = vi.hoisted(() => ({
  deleteMedia: vi.fn<(key: string) => Promise<void>>(),
  loadMedia: vi.fn<(key: string) => Promise<string | null>>(),
  loadMediaBlob: vi.fn<(key: string) => Promise<Blob | null>>(),
  saveMedia: vi.fn<(key: string, blob: Blob) => Promise<string>>(),
}));

const processorMocks = vi.hoisted(() => ({
  processOverlayMedia: vi.fn<(file: File) => Promise<ProcessedOverlayMedia>>(),
}));

vi.mock('../hooks/useStorageState', () => ({
  useStorageState: (
    _key: string,
    fallback: BackgroundMedia | null,
    decode: (
      value: unknown,
      fallback: BackgroundMedia | null,
    ) => BackgroundMedia | null,
    area?: 'local' | 'sync',
  ) => {
    storageState.area = area;
    return {
      isLoaded: true,
      setValue: storageState.setMeta,
      value: decode(storageState.meta, fallback),
    };
  },
}));

vi.mock('../platform/storage/mediaStorage', () => mediaMocks);

vi.mock('../overlays/processOverlayMedia', () => processorMocks);

beforeEach((): void => {
  storageState.area = undefined;
  storageState.meta = null;
  storageState.setMeta.mockResolvedValue(undefined);
  mediaMocks.deleteMedia.mockResolvedValue(undefined);
  mediaMocks.loadMedia.mockResolvedValue(null);
  mediaMocks.loadMediaBlob.mockResolvedValue(null);
  mediaMocks.saveMedia.mockResolvedValue('blob:background-media');
  processorMocks.processOverlayMedia.mockImplementation(async (file: File) => ({
    blob: file,
    height: 80,
    mediaKind:
      file.type === 'image/gif' || file.type.startsWith('video/')
        ? 'motion'
        : 'static',
    width: 120,
  }));
});

describe('useBackgroundImage', () => {
  it.each([
    ['https://example.com/background.jpg', 'image'],
    ['https://example.com/background.mp4?download=1', 'video'],
    ['https://example.com/animated.gif', 'image'],
  ] as const)('classifies URL media %s as %s', async (url, type) => {
    const { result } = renderHook(() => useBackgroundImage());

    expect(storageState.area).toBe('local');

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

  it('uses the shared processor for animated background media', async () => {
    const processedBlob = new Blob(['webm'], { type: 'video/webm' });
    processorMocks.processOverlayMedia.mockResolvedValueOnce({
      blob: processedBlob,
      durationMs: 1_000,
      frameCount: 12,
      height: 80,
      mediaKind: 'motion',
      width: 120,
    });
    const file = new File(['gif'], 'background.gif', { type: 'image/gif' });
    const { result } = renderHook(() => useBackgroundImage());

    await act(async (): Promise<void> => {
      await result.current.updateFromFile(file);
    });

    expect(processorMocks.processOverlayMedia).toHaveBeenCalledWith(file);
    expect(mediaMocks.saveMedia).toHaveBeenCalledWith(
      'backgroundMedia',
      processedBlob,
    );
    expect(storageState.setMeta).toHaveBeenCalledWith({
      source: 'file',
      type: 'video',
      url: '',
    });
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

  it('captures and restores the media needed by a wider settings transaction', async () => {
    const previousBlob = new Blob(['previous'], { type: 'image/webp' });
    const previousMeta: BackgroundMedia = {
      source: 'file',
      type: 'image',
      url: '',
    };
    storageState.meta = previousMeta;
    mediaMocks.loadMediaBlob.mockResolvedValue(previousBlob);
    const { result } = renderHook(() => useBackgroundImage());

    let snapshot: Awaited<ReturnType<typeof result.current.createSnapshot>>;
    await act(async (): Promise<void> => {
      snapshot = await result.current.createSnapshot();
      await result.current.restoreSnapshot(snapshot);
    });

    expect(snapshot!).toEqual({ media: previousBlob, meta: previousMeta });
    expect(mediaMocks.saveMedia).toHaveBeenCalledWith(
      'backgroundMedia',
      previousBlob,
    );
    expect(storageState.setMeta).toHaveBeenLastCalledWith(previousMeta);
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
