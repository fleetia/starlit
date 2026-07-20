import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RasterizedOverlayImage } from './imageProcessing';
import type { OverlayImageLayer, OverlayScene } from './types';

const overlayMocks = vi.hoisted(() => ({
  deleteMediaBatch: vi.fn<(keys: readonly string[]) => Promise<void>>(),
  listMediaKeys: vi.fn<(prefix?: string) => Promise<string[]>>(),
  loadMediaBlob: vi.fn<(key: string) => Promise<Blob | null>>(),
  localGet: vi.fn<(key: string) => Promise<unknown>>(),
  localGetAll: vi.fn<() => Promise<Record<string, unknown>>>(),
  localRemove: vi.fn<(keys: string | string[]) => Promise<void>>(),
  localSet: vi.fn<(items: Record<string, unknown>) => Promise<void>>(),
  rasterizeOverlayImage:
    vi.fn<(file: File) => Promise<RasterizedOverlayImage>>(),
  saveMedia: vi.fn<(key: string, blob: Blob) => Promise<string>>(),
}));

vi.mock('../platform/storage/mediaStorage', () => ({
  deleteMediaBatch: overlayMocks.deleteMediaBatch,
  listMediaKeys: overlayMocks.listMediaKeys,
  loadMediaBlob: overlayMocks.loadMediaBlob,
  saveMedia: overlayMocks.saveMedia,
}));

vi.mock('../platform/storage/storage', () => ({
  default: {
    local: {
      get: overlayMocks.localGet,
      getAll: overlayMocks.localGetAll,
      remove: overlayMocks.localRemove,
      set: overlayMocks.localSet,
    },
  },
}));

vi.mock('./imageProcessing', () => ({
  rasterizeOverlayImage: overlayMocks.rasterizeOverlayImage,
}));

import { useOverlayScene } from './useOverlayScene';
import {
  DEFAULT_OVERLAY_IMAGE_ID,
  DEFAULT_OVERLAY_SCENE,
  EMPTY_OVERLAY_SCENE,
  getOverlayMediaKey,
} from './model';

const RASTERIZED_IMAGE: RasterizedOverlayImage = {
  blob: new Blob(['image'], { type: 'image/webp' }),
  height: 180,
  width: 320,
};

beforeEach((): void => {
  let nextId = 0;
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn(() => `image-${(nextId += 1)}`),
  });
  overlayMocks.deleteMediaBatch.mockResolvedValue(undefined);
  overlayMocks.listMediaKeys.mockResolvedValue([]);
  overlayMocks.loadMediaBlob.mockResolvedValue(null);
  overlayMocks.localGet.mockResolvedValue(EMPTY_OVERLAY_SCENE);
  overlayMocks.localGetAll.mockResolvedValue({});
  overlayMocks.localRemove.mockResolvedValue(undefined);
  overlayMocks.localSet.mockResolvedValue(undefined);
  overlayMocks.rasterizeOverlayImage.mockResolvedValue(RASTERIZED_IMAGE);
  overlayMocks.saveMedia.mockResolvedValue('blob:overlay-image');
});

afterEach((): void => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useOverlayScene', () => {
  it('seeds the bundled bottom-right image when no overlay scene exists', async () => {
    const imageBlob = new Blob(['getting'], { type: 'image/png' });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(imageBlob, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    overlayMocks.localGet.mockResolvedValue(undefined);

    const { result } = renderHook(() => useOverlayScene());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const mediaKey = getOverlayMediaKey(DEFAULT_OVERLAY_IMAGE_ID);
    expect(result.current.scene).toEqual(DEFAULT_OVERLAY_SCENE);
    expect(fetchMock).toHaveBeenCalledWith('/assets/overlays/getting.png');
    expect(overlayMocks.saveMedia).toHaveBeenCalledWith(mediaKey, imageBlob);
    expect(overlayMocks.localSet).toHaveBeenCalledWith({
      overlayScene: DEFAULT_OVERLAY_SCENE,
    });
  });

  it('does not restore the default image after a bookmark-only scene is stored', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useOverlayScene());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.scene).toEqual(EMPTY_OVERLAY_SCENE);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(overlayMocks.saveMedia).not.toHaveBeenCalled();
    expect(overlayMocks.localSet).not.toHaveBeenCalledWith({
      overlayScene: DEFAULT_OVERLAY_SCENE,
    });
  });

  it('reuses seeded default media when its scene metadata is missing', async () => {
    const imageBlob = new Blob(['getting'], { type: 'image/png' });
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    overlayMocks.localGet.mockResolvedValue(undefined);
    overlayMocks.loadMediaBlob.mockResolvedValue(imageBlob);

    const { result } = renderHook(() => useOverlayScene());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.scene).toEqual(DEFAULT_OVERLAY_SCENE);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(overlayMocks.saveMedia).not.toHaveBeenCalled();
    expect(overlayMocks.localSet).toHaveBeenCalledWith({
      overlayScene: DEFAULT_OVERLAY_SCENE,
    });
  });

  it('finishes loading with an empty scene when the bundled image fails', async () => {
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 404 })),
    );
    overlayMocks.localGet.mockResolvedValue(undefined);

    const { result } = renderHook(() => useOverlayScene());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.scene).toEqual(EMPTY_OVERLAY_SCENE);
    expect(overlayMocks.saveMedia).not.toHaveBeenCalled();
    expect(overlayMocks.localSet).not.toHaveBeenCalledWith({
      overlayScene: DEFAULT_OVERLAY_SCENE,
    });
    expect(reportError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('rolls back newly seeded media when default metadata cannot be stored', async () => {
    const imageBlob = new Blob(['getting'], { type: 'image/png' });
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(imageBlob, { status: 200 })),
    );
    overlayMocks.localGet.mockResolvedValue(undefined);
    overlayMocks.localSet.mockRejectedValueOnce(new Error('storage failed'));

    const { result } = renderHook(() => useOverlayScene());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.scene).toEqual(EMPTY_OVERLAY_SCENE);
    expect(overlayMocks.deleteMediaBatch).toHaveBeenCalledWith([
      getOverlayMediaKey(DEFAULT_OVERLAY_IMAGE_ID),
    ]);
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'storage failed' }),
    );
  });

  it('loads a local scene without deleting media staged by another tab', async () => {
    const otherDraftMediaKey = 'overlayImageDraft:other-session:draft-image';
    const storedScene: OverlayScene = {
      layers: [
        {
          anchor: 'top-left',
          height: 180,
          id: 'kept',
          kind: 'image',
          name: 'kept.png',
          offsetX: 24,
          offsetY: 24,
          rotationDeg: 0,
          width: 320,
        },
        { kind: 'bookmarks' },
      ],
    };
    overlayMocks.localGet.mockResolvedValue(storedScene);
    overlayMocks.listMediaKeys.mockImplementation(async (prefix) =>
      prefix === 'overlayImageDraft:'
        ? [otherDraftMediaKey]
        : ['overlayImage:kept', 'overlayImage:draft-image'],
    );
    overlayMocks.localGetAll.mockResolvedValue({
      overlayScene: storedScene,
      'overlayImageDraftLease:other-session': {
        items: [{ draftMediaKey: otherDraftMediaKey, id: 'draft-image' }],
        updatedAt: Date.now(),
      },
    });
    const { result } = renderHook(() => useOverlayScene());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.scene).toEqual(storedScene);
    expect(overlayMocks.deleteMediaBatch).not.toHaveBeenCalled();
  });

  it('cleans stale draft and promoted media that no scene references', async () => {
    const staleDraftMediaKey = 'overlayImageDraft:stale-session:draft-image';
    overlayMocks.listMediaKeys.mockImplementation(async (prefix) =>
      prefix === 'overlayImageDraft:'
        ? [staleDraftMediaKey]
        : ['overlayImage:draft-image'],
    );
    overlayMocks.localGetAll.mockResolvedValue({
      'overlayImageDraftLease:stale-session': {
        items: [{ draftMediaKey: staleDraftMediaKey, id: 'draft-image' }],
        updatedAt: 0,
      },
    });

    const { result } = renderHook(() => useOverlayScene());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(overlayMocks.deleteMediaBatch).toHaveBeenCalledWith([
      staleDraftMediaKey,
      'overlayImage:draft-image',
    ]);
    expect(overlayMocks.localRemove).toHaveBeenCalledWith([
      'overlayImageDraftLease:stale-session',
    ]);
  });

  it('cleans permanent media left after a scene removal commits', async () => {
    const storedScene: OverlayScene = {
      layers: [
        { kind: 'bookmarks' },
        {
          anchor: 'top-left',
          height: 180,
          id: 'kept',
          kind: 'image',
          name: 'kept.png',
          offsetX: 24,
          offsetY: 24,
          rotationDeg: 0,
          width: 320,
        },
      ],
    };
    overlayMocks.localGet.mockResolvedValue(storedScene);
    overlayMocks.localGetAll.mockResolvedValue({ overlayScene: storedScene });
    overlayMocks.listMediaKeys.mockImplementation(async (prefix) =>
      prefix === 'overlayImage:'
        ? ['overlayImage:kept', 'overlayImage:removed']
        : [],
    );

    const { result } = renderHook(() => useOverlayScene());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(overlayMocks.deleteMediaBatch).toHaveBeenCalledWith([
      'overlayImage:removed',
    ]);
  });

  it('keeps permanent media during a fresh import lease while cleaning abandoned drafts', async () => {
    const abandonedDraftMediaKey =
      'overlayImageDraft:abandoned-session:draft-image';
    overlayMocks.listMediaKeys.mockImplementation(async (prefix) =>
      prefix === 'overlayImageDraft:'
        ? [abandonedDraftMediaKey]
        : ['overlayImage:incoming'],
    );
    overlayMocks.localGetAll.mockResolvedValue({
      'overlayMediaMutationLease:import-session': {
        updatedAt: Date.now(),
      },
    });

    const { result } = renderHook(() => useOverlayScene());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(overlayMocks.deleteMediaBatch).toHaveBeenCalledWith([
      abandonedDraftMediaKey,
    ]);
    expect(overlayMocks.localRemove).not.toHaveBeenCalledWith([
      'overlayMediaMutationLease:import-session',
    ]);
  });

  it('removes stale import leases and resumes permanent media cleanup', async () => {
    overlayMocks.listMediaKeys.mockImplementation(async (prefix) =>
      prefix === 'overlayImage:' ? ['overlayImage:orphaned'] : [],
    );
    overlayMocks.localGetAll.mockResolvedValue({
      'overlayMediaMutationLease:stale-import': { updatedAt: 0 },
    });

    const { result } = renderHook(() => useOverlayScene());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(overlayMocks.deleteMediaBatch).toHaveBeenCalledWith([
      'overlayImage:orphaned',
    ]);
    expect(overlayMocks.localRemove).toHaveBeenCalledWith([
      'overlayMediaMutationLease:stale-import',
    ]);
  });

  it('preserves media when persisted scene metadata is malformed', async () => {
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    overlayMocks.localGet.mockResolvedValue(null);
    overlayMocks.localGetAll.mockResolvedValue({ overlayScene: null });
    overlayMocks.listMediaKeys.mockImplementation(async (prefix) =>
      prefix === 'overlayImage:' ? ['overlayImage:recoverable'] : [],
    );

    const { result } = renderHook(() => useOverlayScene());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.scene).toEqual({ layers: [{ kind: 'bookmarks' }] });
    expect(reportError).toHaveBeenCalledWith(expect.any(Error));
    expect(overlayMocks.deleteMediaBatch).not.toHaveBeenCalled();
  });

  it('rasterizes and stores files sequentially without persisting metadata', async () => {
    const events: string[] = [];
    overlayMocks.rasterizeOverlayImage.mockImplementation(async (file) => {
      events.push(`rasterize:${file.name}`);
      return RASTERIZED_IMAGE;
    });
    overlayMocks.saveMedia.mockImplementation(async (key) => {
      events.push(`save:${key}`);
      return `blob:${key}`;
    });
    const { result } = renderHook(() => useOverlayScene());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    overlayMocks.localSet.mockClear();
    overlayMocks.deleteMediaBatch.mockClear();
    const files = [
      new File(['first'], 'first.png', { type: 'image/png' }),
      new File(['second'], 'second.jpg', { type: 'image/jpeg' }),
    ];

    let layers = undefined as
      | Awaited<ReturnType<typeof result.current.prepareFiles>>
      | undefined;
    await act(async (): Promise<void> => {
      layers = await result.current.prepareFiles(files);
    });

    expect(events[0]).toBe('rasterize:first.png');
    expect(events[1]).toMatch(/^save:overlayImageDraft:.+:image-1$/);
    expect(events[2]).toBe('rasterize:second.jpg');
    expect(events[3]).toMatch(/^save:overlayImageDraft:.+:image-2$/);
    expect(layers).toEqual([
      expect.objectContaining({
        anchor: 'top-left',
        draftMediaKey: expect.stringMatching(/^overlayImageDraft:.+:image-1$/),
        height: 180,
        id: 'image-1',
        kind: 'image',
        name: 'first.png',
        offsetX: 24,
        offsetY: 24,
        rotationDeg: 0,
        scale: 1,
        width: 320,
      }),
      expect.objectContaining({ id: 'image-2', name: 'second.jpg' }),
    ]);
    expect(result.current.isProcessing).toBe(false);
    expect(overlayMocks.localSet).not.toHaveBeenCalledWith(
      expect.objectContaining({ overlayScene: expect.anything() }),
    );
    expect(overlayMocks.deleteMediaBatch).not.toHaveBeenCalled();
  });

  it('reports processing while image rasterization is pending', async () => {
    let resolveRasterization:
      | ((image: RasterizedOverlayImage) => void)
      | undefined;
    overlayMocks.rasterizeOverlayImage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRasterization = resolve;
        }),
    );
    const { result } = renderHook(() => useOverlayScene());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const file = new File(['image'], 'pending.png', { type: 'image/png' });
    let preparation: Promise<unknown> | undefined;

    act((): void => {
      preparation = result.current.prepareFiles([file]);
    });

    expect(result.current.isProcessing).toBe(true);

    await act(async (): Promise<void> => {
      resolveRasterization?.(RASTERIZED_IMAGE);
      await preparation;
    });

    expect(result.current.isProcessing).toBe(false);
  });

  it('removes files prepared earlier in the batch when processing fails', async () => {
    overlayMocks.rasterizeOverlayImage
      .mockResolvedValueOnce(RASTERIZED_IMAGE)
      .mockRejectedValueOnce(new Error('decode failed'));
    const { result } = renderHook(() => useOverlayScene());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    overlayMocks.deleteMediaBatch.mockClear();
    const files = [
      new File(['first'], 'first.png', { type: 'image/png' }),
      new File(['second'], 'second.png', { type: 'image/png' }),
    ];

    await expect(
      act(async (): Promise<void> => {
        await result.current.prepareFiles(files);
      }),
    ).rejects.toThrow('decode failed');
    expect(overlayMocks.deleteMediaBatch).toHaveBeenCalledWith([
      expect.stringMatching(/^overlayImageDraft:.+:image-1$/),
    ]);
    expect(result.current.isProcessing).toBe(false);
  });

  it('promotes draft media on scene update and removes the draft on finalize', async () => {
    const { result } = renderHook(() => useOverlayScene());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    let preparedLayer: OverlayScene['layers'][number] | undefined;

    await act(async (): Promise<void> => {
      [preparedLayer] = await result.current.prepareFiles([
        new File(['image'], 'stars.png', { type: 'image/png' }),
      ]);
    });
    if (!preparedLayer || preparedLayer.kind !== 'image') {
      throw new Error('Expected a prepared overlay image.');
    }
    const preparedImage = preparedLayer;

    const draftMediaKey = preparedImage.draftMediaKey;
    expect(draftMediaKey).toMatch(/^overlayImageDraft:.+:image-1$/);
    overlayMocks.loadMediaBlob.mockImplementation(async (key) =>
      key === draftMediaKey || key === 'overlayImage:image-1'
        ? RASTERIZED_IMAGE.blob
        : null,
    );
    overlayMocks.localSet.mockClear();
    overlayMocks.deleteMediaBatch.mockClear();
    const nextScene: OverlayScene = {
      layers: [{ kind: 'bookmarks' }, preparedImage],
    };

    await act(async (): Promise<void> => {
      await result.current.updateScene(nextScene);
      await result.current.finalizeImages([preparedImage.id]);
    });

    expect(overlayMocks.saveMedia).toHaveBeenCalledWith(
      'overlayImage:image-1',
      RASTERIZED_IMAGE.blob,
    );
    expect(overlayMocks.localSet).toHaveBeenCalledWith({
      overlayScene: {
        layers: [
          { kind: 'bookmarks' },
          expect.not.objectContaining({ draftMediaKey: expect.anything() }),
        ],
      },
    });
    expect(overlayMocks.deleteMediaBatch).toHaveBeenCalledWith([draftMediaKey]);
    expect(overlayMocks.localRemove).toHaveBeenCalledWith(
      expect.stringMatching(/^overlayImageDraftLease:/),
    );
  });

  it('releases a draft lease when finalized media cleanup fails', async () => {
    const { result } = renderHook(() => useOverlayScene());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    let preparedLayer: OverlayImageLayer | undefined;

    await act(async (): Promise<void> => {
      [preparedLayer] = await result.current.prepareFiles([
        new File(['image'], 'orphan.png', { type: 'image/png' }),
      ]);
    });
    if (!preparedLayer) {
      throw new Error('Expected a prepared overlay image.');
    }
    const preparedImage = preparedLayer;
    const draftMediaKey = preparedImage.draftMediaKey;
    if (!draftMediaKey) {
      throw new Error('Expected prepared draft media.');
    }

    overlayMocks.deleteMediaBatch.mockRejectedValueOnce(
      new Error('draft delete failed'),
    );
    overlayMocks.localRemove.mockClear();

    await expect(
      act(async (): Promise<void> => {
        await result.current.finalizeImages([preparedImage.id]);
      }),
    ).rejects.toThrow('Overlay draft finalization failed.');
    expect(overlayMocks.localRemove).toHaveBeenCalledWith(
      expect.stringMatching(/^overlayImageDraftLease:/),
    );

    await act(async (): Promise<void> => {
      await result.current.finalizeImages([preparedImage.id]);
    });
    expect(overlayMocks.deleteMediaBatch).toHaveBeenLastCalledWith([
      draftMediaKey,
    ]);
  });

  it('releases a draft lease and keeps cleanup retryable when discard fails', async () => {
    const { result } = renderHook(() => useOverlayScene());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    let preparedLayer: OverlayImageLayer | undefined;

    await act(async (): Promise<void> => {
      [preparedLayer] = await result.current.prepareFiles([
        new File(['image'], 'discard.png', { type: 'image/png' }),
      ]);
    });
    if (!preparedLayer?.draftMediaKey) {
      throw new Error('Expected prepared draft media.');
    }
    const preparedImage = preparedLayer;

    overlayMocks.deleteMediaBatch.mockRejectedValueOnce(
      new Error('discard failed'),
    );
    overlayMocks.localRemove.mockClear();

    await expect(
      act(async (): Promise<void> => {
        await result.current.discardImages([preparedImage.id]);
      }),
    ).rejects.toThrow('Overlay media discard failed.');
    expect(overlayMocks.localRemove).toHaveBeenCalledWith(
      expect.stringMatching(/^overlayImageDraftLease:/),
    );

    await act(async (): Promise<void> => {
      await result.current.discardImages([preparedImage.id]);
    });
    expect(overlayMocks.deleteMediaBatch).toHaveBeenLastCalledWith([
      'overlayImage:image-1',
      preparedImage.draftMediaKey,
    ]);
  });

  it('persists validated scenes and discards deduplicated image ids', async () => {
    const { result } = renderHook(() => useOverlayScene());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    overlayMocks.loadMediaBlob.mockResolvedValue(RASTERIZED_IMAGE.blob);
    overlayMocks.deleteMediaBatch.mockClear();
    const nextScene: OverlayScene = {
      layers: [
        { kind: 'bookmarks' },
        {
          anchor: 'bottom-right',
          height: 180,
          id: 'image-1',
          kind: 'image',
          name: 'stars.png',
          offsetX: 32,
          offsetY: 40,
          rotationDeg: -12,
          width: 320,
        },
      ],
    };

    await act(async (): Promise<void> => {
      await result.current.updateScene(nextScene);
    });
    overlayMocks.localGet.mockResolvedValue(nextScene);
    await act(async (): Promise<void> => {
      await result.current.discardImages(['image-1', 'image-1', 'image-2']);
    });

    expect(overlayMocks.localSet).toHaveBeenCalledWith({
      overlayScene: nextScene,
    });
    expect(result.current.scene).toEqual(nextScene);
    expect(overlayMocks.deleteMediaBatch).toHaveBeenCalledWith([
      expect.stringMatching(/^overlayImageDraft:.+:image-1$/),
      'overlayImage:image-2',
      expect.stringMatching(/^overlayImageDraft:.+:image-2$/),
    ]);
  });

  it('rejects a stale scene that references missing permanent media', async () => {
    const { result } = renderHook(() => useOverlayScene());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    overlayMocks.localSet.mockClear();
    const staleScene: OverlayScene = {
      layers: [
        { kind: 'bookmarks' },
        {
          anchor: 'top-left',
          height: 180,
          id: 'missing-image',
          kind: 'image',
          name: 'missing.png',
          offsetX: 24,
          offsetY: 24,
          rotationDeg: 0,
          width: 320,
        },
      ],
    };

    await expect(
      act(async (): Promise<void> => {
        await result.current.updateScene(staleScene);
      }),
    ).rejects.toThrow('Overlay media is missing: missing.png');
    expect(overlayMocks.localSet).not.toHaveBeenCalledWith({
      overlayScene: staleScene,
    });
  });

  it('serializes concurrent session saves and rejects the stale scene', async () => {
    let pendingLock = Promise.resolve();
    const requestLock = vi.fn(
      <Result>(
        _name: string,
        _options: LockOptions,
        callback: () => Promise<Result>,
      ): Promise<Result> => {
        const operation = pendingLock.then(callback);
        pendingLock = operation.then(
          () => undefined,
          () => undefined,
        );
        return operation;
      },
    );
    vi.stubGlobal('navigator', { locks: { request: requestLock } });
    const initialScene: OverlayScene = {
      layers: [
        { kind: 'bookmarks' },
        {
          anchor: 'top-left',
          height: 180,
          id: 'shared-image',
          kind: 'image',
          name: 'shared.png',
          offsetX: 24,
          offsetY: 24,
          rotationDeg: 0,
          width: 320,
        },
      ],
    };
    let persistedScene: unknown = structuredClone(initialScene);
    overlayMocks.localGet.mockImplementation(async () =>
      structuredClone(persistedScene),
    );
    overlayMocks.localGetAll.mockImplementation(async () => ({
      overlayScene: structuredClone(persistedScene),
    }));
    let releaseFirstSceneWrite: (() => void) | undefined;
    let shouldHoldSceneWrite = true;
    overlayMocks.localSet.mockImplementation(async (items) => {
      if (!Object.hasOwn(items, 'overlayScene')) {
        return;
      }

      if (shouldHoldSceneWrite) {
        shouldHoldSceneWrite = false;
        await new Promise<void>((resolve) => {
          releaseFirstSceneWrite = resolve;
        });
      }

      persistedScene = structuredClone(items.overlayScene);
    });
    overlayMocks.loadMediaBlob.mockResolvedValue(RASTERIZED_IMAGE.blob);
    const firstSession = renderHook(() => useOverlayScene());
    const secondSession = renderHook(() => useOverlayScene());
    await waitFor(() =>
      expect(firstSession.result.current.isLoaded).toBe(true),
    );
    await waitFor(() =>
      expect(secondSession.result.current.isLoaded).toBe(true),
    );
    requestLock.mockClear();
    overlayMocks.localGet.mockClear();
    overlayMocks.localSet.mockClear();
    const firstSessionScene: OverlayScene = {
      layers: initialScene.layers.map((layer) =>
        layer.kind === 'image' ? { ...layer, offsetX: 48 } : layer,
      ),
    };
    const staleSecondSessionScene: OverlayScene = {
      layers: initialScene.layers.map((layer) =>
        layer.kind === 'image' ? { ...layer, offsetY: 72 } : layer,
      ),
    };

    let updates: readonly [Promise<void>, Promise<void>] | undefined;
    act((): void => {
      updates = [
        firstSession.result.current.updateScene(firstSessionScene),
        secondSession.result.current.updateScene(staleSecondSessionScene),
      ];
    });
    if (!updates) {
      throw new Error('Expected concurrent overlay updates.');
    }
    const [firstUpdate, secondUpdate] = updates;
    const staleUpdateAssertion = expect(secondUpdate).rejects.toThrow(
      'Overlay scene changed in another session. Reload Starlit and try again.',
    );

    await vi.waitFor(() =>
      expect(releaseFirstSceneWrite).toEqual(expect.any(Function)),
    );
    expect(requestLock).toHaveBeenCalledTimes(2);
    expect(requestLock).toHaveBeenNthCalledWith(
      1,
      'starlit-overlay-media-mutation',
      { mode: 'exclusive' },
      expect.any(Function),
    );
    expect(requestLock).toHaveBeenNthCalledWith(
      2,
      'starlit-overlay-media-mutation',
      { mode: 'exclusive' },
      expect.any(Function),
    );
    expect(overlayMocks.localGet).toHaveBeenCalledOnce();

    const releaseSceneWrite = releaseFirstSceneWrite;
    if (!releaseSceneWrite) {
      throw new Error('Expected the first overlay write to be pending.');
    }

    await act(async (): Promise<void> => {
      releaseSceneWrite();
      await firstUpdate;
      await staleUpdateAssertion;
    });
    expect(persistedScene).toEqual(firstSessionScene);
    expect(overlayMocks.localGet).toHaveBeenCalledTimes(2);
    expect(overlayMocks.localSet).toHaveBeenCalledOnce();
    expect(firstSession.result.current.scene).toEqual(firstSessionScene);
    expect(secondSession.result.current.scene).toEqual(initialScene);
  });

  it('rejects an update after external reset removes the persisted scene', async () => {
    let persistedScene: unknown = structuredClone(EMPTY_OVERLAY_SCENE);
    overlayMocks.localGet.mockImplementation(async () =>
      structuredClone(persistedScene),
    );
    overlayMocks.localGetAll.mockImplementation(async () => ({
      overlayScene: structuredClone(persistedScene),
    }));
    const { result } = renderHook(() => useOverlayScene());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    persistedScene = undefined;

    await expect(
      act(async (): Promise<void> => {
        await result.current.updateScene(EMPTY_OVERLAY_SCENE);
      }),
    ).rejects.toThrow(
      'Overlay scene changed in another session. Reload Starlit and try again.',
    );
    expect(overlayMocks.localSet).not.toHaveBeenCalledWith({
      overlayScene: EMPTY_OVERLAY_SCENE,
    });
  });
});
