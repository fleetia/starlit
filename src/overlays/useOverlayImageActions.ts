import { useCallback, useEffect, useRef, useState } from 'react';

import { loadMediaBlob } from '../platform/storage/mediaStorage';
import {
  bringOverlayImageToTop,
  deleteOverlayImages,
  duplicateOverlayImage,
  getOverlayImageSelectionIds,
  reorderOverlayImage,
  replaceOverlayImage,
  sendOverlayImageToBottom,
  setOverlayImagesHidden,
  setOverlayImagesLocked,
} from './actions';
import {
  getOverlayImageLayers,
  getOverlayImageMediaKind,
  getOverlayMediaKey,
  isOverlayImageHidden,
  isOverlayImageLocked,
} from './model';
import type { OverlayMotionPlaybackOverride } from './OverlayImageStacks';
import type { OverlayImageLayer, OverlayScene } from './types';

const DUPLICATE_OFFSET = 12;

export type OverlayImageActionTarget = {
  imageId: string;
  point: { x: number; y: number };
};

export type OverlayImageMutation = {
  preparedImageIds: readonly string[];
  removedImageIds: readonly string[];
  scene: OverlayScene;
};

export type UseOverlayImageActionsOptions = {
  isDisabled?: boolean;
  onEditImage: (imageId: string) => void;
  onError?: (error: Error | null) => void;
  onMotionPlaybackOverrideChange: (
    imageId: string,
    override: OverlayMotionPlaybackOverride,
  ) => void;
  onMutation: (mutation: OverlayImageMutation) => Promise<void> | void;
  onPreparationRollback: (ids: readonly string[]) => Promise<void>;
  prepareFiles: (files: readonly File[]) => Promise<OverlayImageLayer[]>;
  scene: OverlayScene;
};

export type OverlayImageActionsController = {
  bringToFront: () => Promise<void>;
  canMoveBackward: boolean;
  canMoveForward: boolean;
  closeMenu: () => void;
  deleteImage: () => Promise<void>;
  duplicateImage: () => Promise<void>;
  editImage: () => void;
  image: OverlayImageLayer | null;
  isDisabled: boolean;
  isProcessing: boolean;
  menuTarget: OverlayImageActionTarget | null;
  moveBackward: () => Promise<void>;
  moveForward: () => Promise<void>;
  openMenu: (target: OverlayImageActionTarget) => void;
  pauseMotion: () => void;
  playMotion: () => void;
  replaceImage: (imageId: string, file: File) => Promise<void>;
  sendToBack: () => Promise<void>;
  setHidden: (hidden: boolean) => Promise<void>;
  setLocked: (locked: boolean) => Promise<void>;
};

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function findImage(
  scene: OverlayScene,
  imageId: string | undefined,
): OverlayImageLayer | null {
  if (!imageId) return null;
  return (
    getOverlayImageLayers(scene).find((image) => image.id === imageId) ?? null
  );
}

function getSourceMediaKey(image: OverlayImageLayer): string {
  return image.draftMediaKey ?? getOverlayMediaKey(image.id);
}

function createPreparedLayer(
  source: OverlayImageLayer,
  prepared: OverlayImageLayer,
  offset: number,
): OverlayImageLayer {
  return {
    ...source,
    draftMediaKey: prepared.draftMediaKey,
    id: prepared.id,
    mediaKind: prepared.mediaKind,
    name: prepared.name,
    offsetX: source.offsetX + offset,
    offsetY: source.offsetY + offset,
  };
}

export function useOverlayImageActions({
  isDisabled = false,
  onEditImage,
  onError,
  onMotionPlaybackOverrideChange,
  onMutation,
  onPreparationRollback,
  prepareFiles,
  scene,
}: UseOverlayImageActionsOptions): OverlayImageActionsController {
  const [menuTarget, setMenuTarget] = useState<OverlayImageActionTarget | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const sceneRef = useRef(scene);
  const image = findImage(scene, menuTarget?.imageId);
  const imageIndex = image
    ? scene.layers.findIndex(
        (layer) => layer.kind === 'image' && layer.id === image.id,
      )
    : -1;

  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  const reportError = useCallback(
    (error: unknown): void => onError?.(toError(error)),
    [onError],
  );

  const runMutation = useCallback(
    async (mutation: OverlayImageMutation): Promise<void> => {
      if (processingRef.current || isDisabled) return;
      processingRef.current = true;
      setIsProcessing(true);
      onError?.(null);

      try {
        await onMutation(mutation);
      } catch (error) {
        if (mutation.preparedImageIds.length > 0) {
          try {
            await onPreparationRollback(mutation.preparedImageIds);
          } catch (rollbackError) {
            reportError(
              new AggregateError(
                [error, rollbackError],
                'Decorative image action and cleanup both failed.',
                { cause: error },
              ),
            );
            return;
          }
        }
        reportError(error);
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    },
    [isDisabled, onError, onMutation, onPreparationRollback, reportError],
  );

  const runSceneAction = useCallback(
    async (
      update: (current: OverlayScene, imageId: string) => OverlayScene,
      getRemovedIds: (
        current: OverlayScene,
        imageId: string,
      ) => readonly string[] = () => [],
    ): Promise<void> => {
      const imageId = menuTarget?.imageId;
      if (!imageId) return;
      const current = sceneRef.current;
      const nextScene = update(current, imageId);
      if (nextScene === current) return;
      await runMutation({
        preparedImageIds: [],
        removedImageIds: getRemovedIds(current, imageId),
        scene: nextScene,
      });
    },
    [menuTarget?.imageId, runMutation],
  );

  const prepareOneFile = useCallback(
    async (file: File): Promise<OverlayImageLayer | null> => {
      if (processingRef.current || isDisabled) return null;
      processingRef.current = true;
      setIsProcessing(true);
      onError?.(null);

      try {
        const prepared = await prepareFiles([file]);
        if (prepared.length !== 1 || !prepared[0]) {
          const preparedIds = prepared.map((layer) => layer.id);
          if (preparedIds.length > 0) {
            await onPreparationRollback(preparedIds);
          }
          throw new Error('Exactly one image widget was expected.');
        }
        return prepared[0];
      } catch (error) {
        reportError(error);
        return null;
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    },
    [isDisabled, onError, onPreparationRollback, prepareFiles, reportError],
  );

  const commitPreparedLayer = useCallback(
    async (
      imageId: string,
      prepared: OverlayImageLayer,
      update: (
        current: OverlayScene,
        source: OverlayImageLayer,
        next: OverlayImageLayer,
      ) => OverlayScene,
      offset: number,
      removedImageIds: readonly string[],
    ): Promise<void> => {
      const current = sceneRef.current;
      const source = findImage(current, imageId);
      if (!source) {
        await onPreparationRollback([prepared.id]);
        throw new Error('The selected image widget no longer exists.');
      }

      const nextLayer = createPreparedLayer(source, prepared, offset);
      await runMutation({
        preparedImageIds: [prepared.id],
        removedImageIds,
        scene: update(current, source, nextLayer),
      });
    },
    [onPreparationRollback, runMutation],
  );

  const duplicateImage = useCallback(async (): Promise<void> => {
    const imageId = menuTarget?.imageId;
    const source = findImage(sceneRef.current, imageId);
    if (!source || processingRef.current || isDisabled) return;
    processingRef.current = true;
    setIsProcessing(true);
    onError?.(null);

    try {
      const blob = await loadMediaBlob(getSourceMediaKey(source));
      if (!blob) {
        throw new Error(`Decorative media is missing: ${source.name}`);
      }
      processingRef.current = false;
      const prepared = await prepareOneFile(
        new File([blob], source.name, { type: blob.type }),
      );
      if (!prepared) return;
      await commitPreparedLayer(
        source.id,
        prepared,
        (current, imageLayer, nextLayer) =>
          duplicateOverlayImage(current, imageLayer.id, nextLayer),
        DUPLICATE_OFFSET,
        [],
      );
    } catch (error) {
      reportError(error);
    } finally {
      if (processingRef.current) {
        processingRef.current = false;
        setIsProcessing(false);
      }
    }
  }, [
    commitPreparedLayer,
    isDisabled,
    menuTarget?.imageId,
    onError,
    prepareOneFile,
    reportError,
  ]);

  const replaceImage = useCallback(
    async (imageId: string, file: File): Promise<void> => {
      try {
        const prepared = await prepareOneFile(file);
        if (!prepared) return;
        await commitPreparedLayer(
          imageId,
          prepared,
          (current, imageLayer, nextLayer) =>
            replaceOverlayImage(current, imageLayer.id, nextLayer),
          0,
          [imageId],
        );
      } catch (error) {
        reportError(error);
      }
    },
    [commitPreparedLayer, prepareOneFile, reportError],
  );

  const openMenu = useCallback(
    (target: OverlayImageActionTarget): void => {
      if (isDisabled) return;
      onError?.(null);
      setMenuTarget(target);
    },
    [isDisabled, onError],
  );
  const closeMenu = useCallback((): void => setMenuTarget(null), []);
  const editImage = useCallback((): void => {
    const imageId = menuTarget?.imageId;
    if (!imageId || isDisabled) return;
    setMenuTarget(null);
    onEditImage(imageId);
  }, [isDisabled, menuTarget?.imageId, onEditImage]);
  const setHidden = useCallback(
    (hidden: boolean): Promise<void> =>
      runSceneAction((current, imageId) =>
        setOverlayImagesHidden(current, [imageId], hidden),
      ),
    [runSceneAction],
  );
  const setLocked = useCallback(
    (locked: boolean): Promise<void> =>
      runSceneAction((current, imageId) =>
        setOverlayImagesLocked(current, [imageId], locked),
      ),
    [runSceneAction],
  );
  const moveForward = useCallback(
    (): Promise<void> =>
      runSceneAction((current, imageId) => {
        const index = current.layers.findIndex(
          (layer) => layer.kind === 'image' && layer.id === imageId,
        );
        return reorderOverlayImage(current, imageId, index + 1);
      }),
    [runSceneAction],
  );
  const moveBackward = useCallback(
    (): Promise<void> =>
      runSceneAction((current, imageId) => {
        const index = current.layers.findIndex(
          (layer) => layer.kind === 'image' && layer.id === imageId,
        );
        return reorderOverlayImage(current, imageId, index - 1);
      }),
    [runSceneAction],
  );
  const bringToFront = useCallback(
    (): Promise<void> => runSceneAction(bringOverlayImageToTop),
    [runSceneAction],
  );
  const sendToBack = useCallback(
    (): Promise<void> => runSceneAction(sendOverlayImageToBottom),
    [runSceneAction],
  );
  const deleteImage = useCallback(
    (): Promise<void> =>
      runSceneAction(
        (current, imageId) => deleteOverlayImages(current, [imageId]),
        (current, imageId) => [
          ...getOverlayImageSelectionIds(current, [imageId]),
        ],
      ),
    [runSceneAction],
  );
  const playMotion = useCallback((): void => {
    if (image && getOverlayImageMediaKind(image) === 'motion') {
      onMotionPlaybackOverrideChange(image.id, 'play');
    }
  }, [image, onMotionPlaybackOverrideChange]);
  const pauseMotion = useCallback((): void => {
    if (image && getOverlayImageMediaKind(image) === 'motion') {
      onMotionPlaybackOverrideChange(image.id, 'pause');
    }
  }, [image, onMotionPlaybackOverrideChange]);

  return {
    bringToFront,
    canMoveBackward: imageIndex > 0,
    canMoveForward: imageIndex >= 0 && imageIndex < scene.layers.length - 1,
    closeMenu,
    deleteImage,
    duplicateImage,
    editImage,
    image,
    isDisabled,
    isProcessing,
    menuTarget: image ? menuTarget : null,
    moveBackward,
    moveForward,
    openMenu,
    pauseMotion,
    playMotion,
    replaceImage,
    sendToBack,
    setHidden,
    setLocked,
  };
}

export function isOverlayImageActionHidden(
  controller: OverlayImageActionsController,
): boolean {
  return controller.image ? isOverlayImageHidden(controller.image) : false;
}

export function isOverlayImageActionLocked(
  controller: OverlayImageActionsController,
): boolean {
  return controller.image ? isOverlayImageLocked(controller.image) : false;
}
