import { useCallback, useEffect, useRef, useState } from 'react';

import {
  deleteMediaBatch,
  listMediaKeys,
  loadMediaBlob,
  saveMedia,
} from '../platform/storage/mediaStorage';
import storage from '../platform/storage/storage';
import { rasterizeOverlayImage } from './imageProcessing';
import { withOverlayMediaMutationLock } from './mediaMutationLock';
import {
  DEFAULT_OVERLAY_IMAGE_SCALE,
  DEFAULT_OVERLAY_IMAGE_ID,
  DEFAULT_OVERLAY_SCENE,
  EMPTY_OVERLAY_SCENE,
  OVERLAY_DRAFT_LEASE_KEY_PREFIX,
  OVERLAY_DRAFT_MEDIA_KEY_PREFIX,
  OVERLAY_IMAGE_MEDIA_KEY_PREFIX,
  OVERLAY_MEDIA_MUTATION_LEASE_KEY_PREFIX,
  OVERLAY_SCENE_STORAGE_KEY,
  getOverlayDraftMediaKey,
  getOverlayImageLayers,
  getOverlayMediaKey,
  normalizeOverlayScene,
  parseOverlayScene,
} from './model';
import type { OverlayImageLayer, OverlayScene } from './types';

const DEFAULT_OVERLAY_OFFSET = 24;
const DEFAULT_OVERLAY_IMAGE_PATH = '/assets/overlays/getting.png';
const DRAFT_LEASE_HEARTBEAT_MS = 60_000;
const DRAFT_LEASE_TTL_MS = 24 * 60 * 60 * 1_000;

type OverlayDraftLeaseItem = {
  draftMediaKey: string;
  id: string;
};

type OverlayDraftLease = {
  items: OverlayDraftLeaseItem[];
  updatedAt: number;
};

export type UseOverlaySceneReturn = {
  scene: OverlayScene;
  isLoaded: boolean;
  isProcessing: boolean;
  prepareFiles: (files: readonly File[]) => Promise<OverlayImageLayer[]>;
  updateScene: (scene: OverlayScene) => Promise<void>;
  discardImages: (ids: readonly string[]) => Promise<void>;
  finalizeImages: (ids: readonly string[]) => Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDraftLease(value: unknown): OverlayDraftLease | null {
  if (
    !isRecord(value) ||
    typeof value.updatedAt !== 'number' ||
    !Number.isFinite(value.updatedAt) ||
    !Array.isArray(value.items)
  ) {
    return null;
  }

  const items: OverlayDraftLeaseItem[] = [];
  for (const item of value.items) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.draftMediaKey !== 'string' ||
      !item.draftMediaKey.startsWith(OVERLAY_DRAFT_MEDIA_KEY_PREFIX)
    ) {
      return null;
    }

    items.push({ draftMediaKey: item.draftMediaKey, id: item.id });
  }

  return { items, updatedAt: value.updatedAt };
}

function createDraftSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function reportOverlayError(error: unknown): void {
  if (typeof globalThis.reportError === 'function') {
    globalThis.reportError(error);
  }
}

function getPersistedOverlaySceneSnapshot(value: unknown): string {
  if (value === undefined) {
    return 'missing';
  }

  try {
    return `scene:${JSON.stringify(parseOverlayScene(value))}`;
  } catch {
    return `invalid:${JSON.stringify(value)}`;
  }
}

function createOverlayAggregateError(
  error: unknown,
  failures: readonly unknown[],
  message: string,
): AggregateError {
  return new AggregateError([error, ...failures], message, { cause: error });
}

async function cleanupStaleDraftMedia(
  scene: OverlayScene,
  canDeleteUnreferencedPermanentMedia: boolean,
): Promise<void> {
  const [draftMediaKeys, permanentMediaKeys] = await Promise.all([
    listMediaKeys(OVERLAY_DRAFT_MEDIA_KEY_PREFIX),
    listMediaKeys(OVERLAY_IMAGE_MEDIA_KEY_PREFIX),
  ]);
  const localValues = await storage.local.getAll();
  const protectedDraftMediaKeys = new Set<string>();
  const protectedPermanentMediaKeys = new Set<string>();
  const staleLeaseKeys: string[] = [];
  const oldestFreshLease = Date.now() - DRAFT_LEASE_TTL_MS;
  let hasFreshPermanentMutationLease = false;

  let latestScene = scene;
  const latestStoredScene = localValues[OVERLAY_SCENE_STORAGE_KEY];
  if (latestStoredScene !== undefined) {
    try {
      latestScene = parseOverlayScene(latestStoredScene);
    } catch {
      canDeleteUnreferencedPermanentMedia = false;
    }
  }

  getOverlayImageLayers(latestScene).forEach((image) =>
    protectedPermanentMediaKeys.add(getOverlayMediaKey(image.id)),
  );

  for (const [key, value] of Object.entries(localValues)) {
    if (key.startsWith(OVERLAY_MEDIA_MUTATION_LEASE_KEY_PREFIX)) {
      if (
        isRecord(value) &&
        typeof value.updatedAt === 'number' &&
        Number.isFinite(value.updatedAt) &&
        value.updatedAt >= oldestFreshLease
      ) {
        hasFreshPermanentMutationLease = true;
      } else {
        staleLeaseKeys.push(key);
      }
      continue;
    }

    if (!key.startsWith(OVERLAY_DRAFT_LEASE_KEY_PREFIX)) {
      continue;
    }

    const lease = parseDraftLease(value);
    if (lease && lease.updatedAt >= oldestFreshLease) {
      lease.items.forEach((item) => {
        protectedDraftMediaKeys.add(item.draftMediaKey);
        protectedPermanentMediaKeys.add(getOverlayMediaKey(item.id));
      });
      continue;
    }

    staleLeaseKeys.push(key);
  }

  const mediaKeysToDelete = draftMediaKeys.filter(
    (key) => !protectedDraftMediaKeys.has(key),
  );

  if (canDeleteUnreferencedPermanentMedia && !hasFreshPermanentMutationLease) {
    mediaKeysToDelete.push(
      ...permanentMediaKeys.filter(
        (key) => !protectedPermanentMediaKeys.has(key),
      ),
    );
  }

  if (mediaKeysToDelete.length > 0) {
    await deleteMediaBatch(mediaKeysToDelete);
  }
  if (staleLeaseKeys.length > 0) {
    await storage.local.remove(staleLeaseKeys);
  }
}

async function rollbackPromotedMedia(
  error: unknown,
  mediaKeys: readonly string[],
): Promise<never> {
  try {
    await deleteMediaBatch(mediaKeys);
  } catch (rollbackError) {
    throw createOverlayAggregateError(
      error,
      [rollbackError],
      'Overlay scene update and rollback both failed.',
    );
  }

  throw error;
}

function isUsableImageBlob(blob: Blob | null): blob is Blob {
  return (
    blob !== null &&
    blob.size > 0 &&
    blob.type.toLowerCase().startsWith('image/')
  );
}

async function fetchDefaultOverlayImageBlob(): Promise<Blob> {
  const response = await fetch(DEFAULT_OVERLAY_IMAGE_PATH);
  if (!response.ok) {
    throw new Error('Default overlay image could not be loaded.');
  }

  const blob = await response.blob();
  if (!isUsableImageBlob(blob)) {
    throw new Error('Default overlay image is invalid.');
  }

  return blob;
}

async function persistDefaultOverlayScene(): Promise<void> {
  const mediaKey = getOverlayMediaKey(DEFAULT_OVERLAY_IMAGE_ID);
  const existingBlob = await loadMediaBlob(mediaKey);
  let didSaveMedia = false;

  if (!isUsableImageBlob(existingBlob)) {
    const blob = await fetchDefaultOverlayImageBlob();
    await saveMedia(mediaKey, blob);
    didSaveMedia = true;
  }

  try {
    await storage.local.set({
      [OVERLAY_SCENE_STORAGE_KEY]: DEFAULT_OVERLAY_SCENE,
    });
  } catch (error) {
    if (didSaveMedia) {
      return await rollbackPromotedMedia(error, [mediaKey]);
    }

    throw error;
  }
}

export function useOverlayScene(): UseOverlaySceneReturn {
  const [scene, setScene] = useState<OverlayScene>(EMPTY_OVERLAY_SCENE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const [draftSessionId] = useState(createDraftSessionId);
  const isLoadedRef = useRef(false);
  const lastKnownPersistedSceneSnapshotRef = useRef<string | null>(null);
  const draftLeaseItemsRef = useRef<Map<string, OverlayDraftLeaseItem>>(
    new Map(),
  );
  const leaseWriteRef = useRef<Promise<void>>(Promise.resolve());
  const draftLeaseStorageKey = `${OVERLAY_DRAFT_LEASE_KEY_PREFIX}${draftSessionId}`;

  const persistDraftLease = useCallback((): Promise<void> => {
    const items = [...draftLeaseItemsRef.current.values()];
    const operation = leaseWriteRef.current
      .catch(() => undefined)
      .then(async (): Promise<void> => {
        if (items.length === 0) {
          await storage.local.remove(draftLeaseStorageKey);
          return;
        }

        const lease: OverlayDraftLease = { items, updatedAt: Date.now() };
        await storage.local.set({ [draftLeaseStorageKey]: lease });
      });
    leaseWriteRef.current = operation;
    return operation;
  }, [draftLeaseStorageKey]);

  useEffect(() => {
    let isActive = true;

    async function initialize(): Promise<void> {
      try {
        await withOverlayMediaMutationLock(async (): Promise<void> => {
          const storedScene = await storage.local.get(
            OVERLAY_SCENE_STORAGE_KEY,
          );
          let nextScene: OverlayScene;
          let canDeleteUnreferencedPermanentMedia = true;

          if (storedScene === undefined) {
            await persistDefaultOverlayScene();
            nextScene = DEFAULT_OVERLAY_SCENE;
            lastKnownPersistedSceneSnapshotRef.current =
              getPersistedOverlaySceneSnapshot(DEFAULT_OVERLAY_SCENE);
          } else {
            lastKnownPersistedSceneSnapshotRef.current =
              getPersistedOverlaySceneSnapshot(storedScene);
            try {
              nextScene = parseOverlayScene(storedScene);
            } catch (error) {
              nextScene = normalizeOverlayScene(storedScene);
              canDeleteUnreferencedPermanentMedia = false;
              reportOverlayError(error);
            }
          }

          if (isActive) {
            setScene(nextScene);
          }

          await cleanupStaleDraftMedia(
            nextScene,
            canDeleteUnreferencedPermanentMedia,
          );
        });
      } catch (error) {
        reportOverlayError(error);
      } finally {
        if (isActive) {
          isLoadedRef.current = true;
          setIsLoaded(true);
        }
      }
    }

    void initialize();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const heartbeat = window.setInterval(() => {
      if (draftLeaseItemsRef.current.size === 0) {
        return;
      }

      void persistDraftLease().catch(reportOverlayError);
    }, DRAFT_LEASE_HEARTBEAT_MS);

    return () => window.clearInterval(heartbeat);
  }, [persistDraftLease]);

  const prepareFiles = useCallback(
    async (files: readonly File[]): Promise<OverlayImageLayer[]> => {
      if (!isLoadedRef.current) {
        throw new Error('Overlay scene is not loaded.');
      }

      setProcessingCount((count) => count + 1);
      const createdItems: OverlayDraftLeaseItem[] = [];

      try {
        const layers: OverlayImageLayer[] = [];

        for (const file of files) {
          const rasterized = await rasterizeOverlayImage(file);
          const id = crypto.randomUUID();
          const draftMediaKey = getOverlayDraftMediaKey(draftSessionId, id);
          const item = { draftMediaKey, id };
          createdItems.push(item);
          draftLeaseItemsRef.current.set(id, item);
          await persistDraftLease();
          await saveMedia(draftMediaKey, rasterized.blob);
          layers.push({
            anchor: 'top-left',
            draftMediaKey,
            height: rasterized.height,
            id,
            kind: 'image',
            name: file.name,
            offsetX: DEFAULT_OVERLAY_OFFSET,
            offsetY: DEFAULT_OVERLAY_OFFSET,
            rotationDeg: 0,
            scale: DEFAULT_OVERLAY_IMAGE_SCALE,
            width: rasterized.width,
          });
        }

        return layers;
      } catch (error) {
        createdItems.forEach((item) =>
          draftLeaseItemsRef.current.delete(item.id),
        );
        const cleanupResults = await Promise.allSettled([
          deleteMediaBatch(createdItems.map((item) => item.draftMediaKey)),
          persistDraftLease(),
        ]);
        const cleanupFailures = cleanupResults.filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected',
        );

        if (cleanupFailures.length > 0) {
          throw createOverlayAggregateError(
            error,
            cleanupFailures.map((failure) => failure.reason),
            'Overlay preparation and rollback both failed.',
          );
        }

        throw error;
      } finally {
        setProcessingCount((count) => Math.max(0, count - 1));
      }
    },
    [draftSessionId, persistDraftLease],
  );

  const updateScene = useCallback(
    async (nextScene: OverlayScene): Promise<void> => {
      const parsedScene = parseOverlayScene(nextScene);
      const draftImages = getOverlayImageLayers(nextScene).filter(
        (image) =>
          image.draftMediaKey !== undefined &&
          draftLeaseItemsRef.current.get(image.id)?.draftMediaKey ===
            image.draftMediaKey,
      );

      await withOverlayMediaMutationLock(async (): Promise<void> => {
        const lastKnownPersistedSceneSnapshot =
          lastKnownPersistedSceneSnapshotRef.current;
        if (lastKnownPersistedSceneSnapshot === null) {
          throw new Error('Overlay scene persistence state is unavailable.');
        }

        const latestPersistedScene = await storage.local.get(
          OVERLAY_SCENE_STORAGE_KEY,
        );
        if (
          getPersistedOverlaySceneSnapshot(latestPersistedScene) !==
          lastKnownPersistedSceneSnapshot
        ) {
          throw new Error(
            'Overlay scene changed in another session. Reload Starlit and try again.',
          );
        }

        const promotedMediaKeys: string[] = [];

        try {
          for (const image of draftImages) {
            const blob = await loadMediaBlob(image.draftMediaKey ?? '');
            if (!blob) {
              throw new Error(`Overlay draft media is missing: ${image.name}`);
            }

            const mediaKey = getOverlayMediaKey(image.id);
            await saveMedia(mediaKey, blob);
            promotedMediaKeys.push(mediaKey);
          }

          for (const image of getOverlayImageLayers(parsedScene)) {
            const blob = await loadMediaBlob(getOverlayMediaKey(image.id));
            if (!blob) {
              throw new Error(`Overlay media is missing: ${image.name}`);
            }
          }

          await storage.local.set({
            [OVERLAY_SCENE_STORAGE_KEY]: parsedScene,
          });
          lastKnownPersistedSceneSnapshotRef.current =
            getPersistedOverlaySceneSnapshot(parsedScene);
          setScene(parsedScene);
        } catch (error) {
          return await rollbackPromotedMedia(error, promotedMediaKeys);
        }
      });
    },
    [],
  );

  const finalizeImages = useCallback(
    async (ids: readonly string[]): Promise<void> => {
      const uniqueIds = [...new Set(ids)];
      const draftMediaKeys = uniqueIds.map((id) =>
        getOverlayDraftMediaKey(draftSessionId, id),
      );
      const mediaCleanupResult = await Promise.allSettled([
        deleteMediaBatch(draftMediaKeys),
      ]);
      uniqueIds.forEach((id) => draftLeaseItemsRef.current.delete(id));

      const leaseCleanupResult = await Promise.allSettled([
        persistDraftLease(),
      ]);
      const failures = [...mediaCleanupResult, ...leaseCleanupResult].filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      );

      if (failures.length > 0) {
        throw new AggregateError(
          failures.map((failure) => failure.reason),
          'Overlay draft finalization failed.',
        );
      }
    },
    [draftSessionId, persistDraftLease],
  );

  const discardImages = useCallback(
    async (ids: readonly string[]): Promise<void> => {
      const uniqueIds = [...new Set(ids)];
      const mediaCleanupResult = await Promise.allSettled([
        withOverlayMediaMutationLock(async (): Promise<void> => {
          const storedScene = await storage.local.get(
            OVERLAY_SCENE_STORAGE_KEY,
          );
          let referencedImageIds: ReadonlySet<string> | null = new Set();

          if (storedScene !== undefined) {
            try {
              referencedImageIds = new Set(
                getOverlayImageLayers(parseOverlayScene(storedScene)).map(
                  (image) => image.id,
                ),
              );
            } catch (error) {
              referencedImageIds = null;
              reportOverlayError(error);
            }
          }

          const mediaKeys = uniqueIds.flatMap((id) => {
            const draftMediaKey = getOverlayDraftMediaKey(draftSessionId, id);
            return referencedImageIds === null || referencedImageIds.has(id)
              ? [draftMediaKey]
              : [getOverlayMediaKey(id), draftMediaKey];
          });
          await deleteMediaBatch(mediaKeys);
        }),
      ]);
      uniqueIds.forEach((id) => draftLeaseItemsRef.current.delete(id));

      const leaseCleanupResult = await Promise.allSettled([
        persistDraftLease(),
      ]);
      const failures = [...mediaCleanupResult, ...leaseCleanupResult].filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      );

      if (failures.length > 0) {
        throw new AggregateError(
          failures.map((failure) => failure.reason),
          'Overlay media discard failed.',
        );
      }
    },
    [draftSessionId, persistDraftLease],
  );

  return {
    discardImages,
    finalizeImages,
    isLoaded,
    isProcessing: processingCount > 0,
    prepareFiles,
    scene,
    updateScene,
  };
}
