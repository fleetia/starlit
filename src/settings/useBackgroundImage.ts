import { useEffect, useState } from 'react';
import { parseGIF, decompressFrames } from 'gifuct-js';

import { useStorageState } from '../hooks/useStorageState';
import {
  saveMedia,
  loadMedia,
  loadMediaBlob,
  deleteMedia,
} from '../platform/storage/mediaStorage';

export type BackgroundMedia = {
  type: 'image' | 'video';
  source: 'url' | 'file';
  url: string;
};

const MEDIA_KEY = 'backgroundMedia';

type UseBackgroundImageReturn = {
  meta: BackgroundMedia | null;
  blobUrl: string;
  backgroundImage: string;
  isLoaded: boolean;
  isMediaMissing: boolean;
  isProcessing: boolean;
  updateFromUrl: (url: string) => Promise<void>;
  updateFromFile: (file: File) => Promise<void>;
  clear: () => Promise<void>;
};

export function useBackgroundImage(): UseBackgroundImageReturn {
  const {
    isLoaded,
    value: meta,
    setValue: setMeta,
  } = useStorageState<BackgroundMedia | null>('backgroundMeta', null);
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [isMediaMissing, setIsMediaMissing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  async function restoreBackground(
    previousMeta: BackgroundMedia | null,
    previousMedia: Blob | null,
  ): Promise<void> {
    if (previousMedia) {
      await saveMedia(MEDIA_KEY, previousMedia);
    } else {
      await deleteMedia(MEDIA_KEY);
    }

    await setMeta(previousMeta);
    if (previousMeta?.source !== 'file') {
      setBlobUrl('');
    }
    setIsMediaMissing(
      previousMeta?.source === 'file' && previousMedia === null,
    );
  }

  async function rollbackBackground(
    error: unknown,
    previousMeta: BackgroundMedia | null,
    previousMedia: Blob | null,
  ): Promise<never> {
    try {
      await restoreBackground(previousMeta, previousMedia);
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        'Background update and rollback both failed',
        { cause: rollbackError },
      );
    }

    throw error;
  }

  useEffect(() => {
    if (meta?.source !== 'file') {
      return undefined;
    }

    let isActive = true;

    void loadMedia(MEDIA_KEY).then(
      (url) => {
        if (!isActive) {
          return;
        }

        setBlobUrl(url ?? '');
        setIsMediaMissing(!url);
      },
      () => {
        if (!isActive) {
          return;
        }

        setBlobUrl('');
        setIsMediaMissing(true);
      },
    );

    return () => {
      isActive = false;
    };
  }, [meta]);

  const updateFromUrl = async (url: string): Promise<void> => {
    const previousMedia = await loadMediaBlob(MEDIA_KEY);
    const nextMeta: BackgroundMedia | null = url
      ? {
          type: /\.(mp4|webm|mov)(\?|$)/i.test(url) ? 'video' : 'image',
          source: 'url',
          url,
        }
      : null;

    try {
      await setMeta(nextMeta);
      await deleteMedia(MEDIA_KEY);
    } catch (error) {
      await rollbackBackground(error, meta, previousMedia);
    }

    setBlobUrl('');
    setIsMediaMissing(false);
  };

  const updateFromFile = async (file: File): Promise<void> => {
    setIsProcessing(true);
    try {
      let blob: Blob;
      let type: 'image' | 'video';

      if (file.type === 'image/gif') {
        blob = await gifToWebm(file);
        type = 'video';
      } else if (file.type.startsWith('video/')) {
        blob = file;
        type = 'video';
      } else {
        blob = await compressToWebp(file);
        type = 'image';
      }

      const previousMedia = await loadMediaBlob(MEDIA_KEY);
      try {
        await saveMedia(MEDIA_KEY, blob);
        await setMeta({ type, source: 'file', url: '' });
      } catch (error) {
        await rollbackBackground(error, meta, previousMedia);
      }

      setIsMediaMissing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const clear = async (): Promise<void> => {
    await updateFromUrl('');
    setBlobUrl('');
    setIsMediaMissing(false);
  };

  const resolvedUrl = meta?.source === 'url' ? meta.url : blobUrl;
  const backgroundImage =
    meta?.type === 'image' && resolvedUrl
      ? `url("${resolvedUrl.replaceAll('"', '\\"')}")`
      : 'none';

  return {
    meta,
    blobUrl,
    backgroundImage,
    isLoaded,
    isMediaMissing: meta?.source === 'file' && isMediaMissing,
    isProcessing,
    updateFromUrl,
    updateFromFile,
    clear,
  };
}

function compressToWebp(file: File, maxWidth = 1920): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas context failed'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/webp',
        1,
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function gifToWebm(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const gif = parseGIF(arrayBuffer);
  const frames = decompressFrames(gif, true);

  if (frames.length === 0) throw new Error('no frames in gif');

  const { width, height } = gif.lsd;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas context failed');

  const stream = canvas.captureStream();
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
  });

  recorder.start();

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('canvas context failed');

  for (const [index, frame] of frames.entries()) {
    const { dims, patch, delay, disposalType } = frame;
    const rgba = new Uint8ClampedArray(dims.width * dims.height * 4);
    rgba.set(patch);
    const imageData = new ImageData(rgba, dims.width, dims.height);

    const previousFrame =
      disposalType === 3
        ? ctx.getImageData(dims.left, dims.top, dims.width, dims.height)
        : null;

    tempCanvas.width = dims.width;
    tempCanvas.height = dims.height;
    tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(tempCanvas, dims.left, dims.top);

    const frameDelay = Math.max(delay, 20);
    await new Promise((r) => setTimeout(r, frameDelay));

    if (index < frames.length - 1) {
      if (disposalType === 2) {
        ctx.clearRect(dims.left, dims.top, dims.width, dims.height);
      } else if (previousFrame) {
        ctx.putImageData(previousFrame, dims.left, dims.top);
      }
    }
  }

  recorder.stop();
  return done;
}
