import { useEffect, useState } from 'react';

import { useStorageState } from '../hooks/useStorageState';
import { processOverlayMedia } from '../overlays/processOverlayMedia';
import {
  saveMedia,
  loadMedia,
  loadMediaBlob,
  deleteMedia,
} from '../platform/storage/mediaStorage';
import { decodeBackgroundMedia, type BackgroundMedia } from './backgroundMedia';

export type { BackgroundMedia } from './backgroundMedia';

const MEDIA_KEY = 'backgroundMedia';

export type BackgroundSnapshot = {
  media: Blob | null;
  meta: BackgroundMedia | null;
};

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
  createSnapshot: () => Promise<BackgroundSnapshot>;
  restoreSnapshot: (snapshot: BackgroundSnapshot) => Promise<void>;
};

export function useBackgroundImage(): UseBackgroundImageReturn {
  const {
    isLoaded,
    value: meta,
    setValue: setMeta,
  } = useStorageState<BackgroundMedia | null>(
    'backgroundMeta',
    null,
    decodeBackgroundMedia,
    'local',
  );
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

  async function createSnapshot(): Promise<BackgroundSnapshot> {
    return {
      media: await loadMediaBlob(MEDIA_KEY),
      meta,
    };
  }

  async function restoreSnapshot(snapshot: BackgroundSnapshot): Promise<void> {
    await restoreBackground(snapshot.meta, snapshot.media);
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
      const processed = await processOverlayMedia(file);
      const blob = processed.blob;
      const type = processed.mediaKind === 'motion' ? 'video' : 'image';

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
    createSnapshot,
    restoreSnapshot,
  };
}
