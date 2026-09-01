import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
} from 'react';
import { Button, PlacementPicker, Text } from '@fleetia/lagrange';

import { useTranslation, type TranslationKey } from '../i18n';
import {
  deleteOverlayImages,
  getOverlayImageSelectionIds,
  groupOverlayImages,
  moveOverlayImages,
  setOverlayImagesHidden,
  setOverlayImagesLocked,
  ungroupOverlayImages,
} from './actions';
import {
  getOverlayImagesIntersectingRect,
  snapOverlayImages,
  type OverlaySelectionRect,
  type OverlaySnapGuide,
} from './canvasInteractions';
import {
  changeOverlayImageAnchor,
  getOverlayImageAnchorPoint,
  getOverlayImageStyle,
  moveOverlayImage,
} from './geometry';
import {
  DEFAULT_OVERLAY_IMAGE_SCALE,
  MAX_OVERLAY_IMAGE_SCALE,
  MIN_OVERLAY_IMAGE_SCALE,
  getOverlayImageLayers,
  getOverlayImageMediaKind,
  getOverlayImagePlaybackMode,
  getOverlayImagePlaybackRate,
  getOverlayImageScale,
  isOverlayImageHidden,
  isOverlayImageLocked,
} from './model';
import type {
  OverlayAnchor,
  OverlayImageLayer,
  OverlayPlaybackRate,
  OverlayScene,
} from './types';
import * as styles from './OverlayPositionEditor.css';

const DEFAULT_OFFSET = 24;
const OVERLAY_PLAYBACK_RATES: readonly OverlayPlaybackRate[] = [0.5, 1, 1.5, 2];
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[tabindex]',
].join(',');

const ANCHOR_LABEL_KEYS: Record<OverlayAnchor, TranslationKey> = {
  'top-left': 'layers.anchor.topLeft',
  'top-center': 'layers.anchor.topCenter',
  'top-right': 'layers.anchor.topRight',
  'center-left': 'layers.anchor.centerLeft',
  'center-center': 'layers.anchor.centerCenter',
  'center-right': 'layers.anchor.centerRight',
  'bottom-left': 'layers.anchor.bottomLeft',
  'bottom-center': 'layers.anchor.bottomCenter',
  'bottom-right': 'layers.anchor.bottomRight',
};

type ImageDragState = {
  image: OverlayImageLayer;
  latestImage: OverlayImageLayer;
  previewElements: HTMLElement[];
};

type DragState = {
  images: ImageDragState[];
  pointerId: number;
  startX: number;
  startY: number;
  target: HTMLButtonElement;
};

type MarqueeState = {
  baseImageIds: string[];
  pointerId: number;
  startX: number;
  startY: number;
  target: HTMLDivElement;
};

type ToolbarDragState = {
  height: number;
  left: number;
  pointerId: number;
  startX: number;
  startY: number;
  target: HTMLButtonElement;
  top: number;
  width: number;
};

type ToolbarPosition = {
  left: number;
  top: number;
};

type AnchorPreviewViewport = 'narrow' | 'wide';

export type OverlayPositionEditorProps = {
  initialSelectedImageId?: string;
  onChange: (scene: OverlayScene) => void;
  onClose: () => void;
  scene: OverlayScene;
};

function findImageLayer(
  scene: OverlayScene,
  imageId: string,
): OverlayImageLayer | undefined {
  return scene.layers.find(
    (layer): layer is OverlayImageLayer =>
      layer.kind === 'image' && layer.id === imageId,
  );
}

function getPreviewElements(imageId: string): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-overlay-image-id]'),
  ).filter((element) => element.dataset.overlayImageId === imageId);
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => {
    if (
      element.matches(':disabled') ||
      element.tabIndex < 0 ||
      element.closest('[aria-hidden="true"], [hidden], [inert]')
    ) {
      return false;
    }

    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function toStyleValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function previewImagePosition(
  elements: readonly HTMLElement[],
  image: OverlayImageLayer,
): void {
  const style = getOverlayImageStyle(image);

  elements.forEach((element) => {
    element.style.bottom = toStyleValue(style.bottom);
    element.style.height = toStyleValue(style.height);
    element.style.left = toStyleValue(style.left);
    element.style.right = toStyleValue(style.right);
    element.style.top = toStyleValue(style.top);
    element.style.transform = toStyleValue(style.transform);
    element.style.transformOrigin = toStyleValue(style.transformOrigin);
    element.style.width = toStyleValue(style.width);
  });
}

function releasePointerCapture(dragState: {
  pointerId: number;
  target: HTMLElement;
}): void {
  if (dragState.target.hasPointerCapture?.(dragState.pointerId)) {
    dragState.target.releasePointerCapture?.(dragState.pointerId);
  }
}

function getSelectionRect(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): OverlaySelectionRect {
  return {
    bottom: Math.max(startY, endY),
    left: Math.min(startX, endX),
    right: Math.max(startX, endX),
    top: Math.min(startY, endY),
  };
}

function replaceImages(
  scene: OverlayScene,
  images: readonly OverlayImageLayer[],
): OverlayScene {
  const imagesById = new Map(images.map((image) => [image.id, image]));
  return {
    layers: scene.layers.map((layer) =>
      layer.kind === 'image' ? (imagesById.get(layer.id) ?? layer) : layer,
    ),
  };
}

function getGroupId(imageIds: readonly string[]): string {
  const encodedIds = [...imageIds]
    .sort()
    .map((imageId) => `${imageId.length}:${imageId}`)
    .join('|');
  return `overlay-group:${encodedIds}`;
}

function clampToolbarPosition(
  left: number,
  top: number,
  width: number,
  height: number,
): ToolbarPosition {
  return {
    left: Math.min(Math.max(0, left), Math.max(0, window.innerWidth - width)),
    top: Math.min(Math.max(0, top), Math.max(0, window.innerHeight - height)),
  };
}

export function OverlayPositionEditor({
  initialSelectedImageId,
  onChange,
  onClose,
  scene,
}: OverlayPositionEditorProps): ReactElement {
  const { t } = useTranslation();
  const rotationId = useId();
  const zoomId = useId();
  const instructionsId = useId();
  const imageLayers = useMemo(() => getOverlayImageLayers(scene), [scene]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>(() => {
    const initialImage =
      imageLayers.find((image) => image.id === initialSelectedImageId) ??
      imageLayers[0];
    return initialImage ? [initialImage.id] : [];
  });
  const [dragPreviewImages, setDragPreviewImages] = useState<
    OverlayImageLayer[]
  >([]);
  const [marqueeRect, setMarqueeRect] = useState<OverlaySelectionRect | null>(
    null,
  );
  const [snapGuides, setSnapGuides] = useState<OverlaySnapGuide[]>([]);
  const [viewportSize, setViewportSize] = useState(() => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }));
  const [toolbarPosition, setToolbarPosition] =
    useState<ToolbarPosition | null>(null);
  const [anchorPreviewViewport, setAnchorPreviewViewport] =
    useState<AnchorPreviewViewport>('wide');
  const dragStateRef = useRef<DragState | null>(null);
  const marqueeStateRef = useRef<MarqueeState | null>(null);
  const toolbarDragStateRef = useRef<ToolbarDragState | null>(null);
  const toolbarRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const doneButtonRef = useRef<HTMLButtonElement>(null);
  const sceneRef = useRef(scene);

  const effectiveSelectedImageIds = useMemo(
    () => getOverlayImageSelectionIds(scene, selectedImageIds),
    [scene, selectedImageIds],
  );
  const selectedImages = imageLayers.filter((image) =>
    effectiveSelectedImageIds.has(image.id),
  );
  const selectedImage =
    selectedImages.length === 1 ? selectedImages[0] : undefined;
  const primarySelectedImage = [...selectedImages].at(-1);
  const selectedImageScale = selectedImage
    ? getOverlayImageScale(selectedImage)
    : DEFAULT_OVERLAY_IMAGE_SCALE;
  const selectedPreviewImages = selectedImages.map(
    (image) =>
      dragPreviewImages.find((preview) => preview.id === image.id) ?? image,
  );
  const areAllSelectedImagesHidden =
    selectedImages.length > 0 && selectedImages.every(isOverlayImageHidden);
  const areAllSelectedImagesLocked =
    selectedImages.length > 0 && selectedImages.every(isOverlayImageLocked);
  const hasGroupedSelection = selectedImages.some(
    (image) => image.groupId !== undefined,
  );

  const cancelActiveDrag = useCallback((): void => {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }

    dragState.images.forEach((draggedImage) => {
      const sceneImage = findImageLayer(
        sceneRef.current,
        draggedImage.image.id,
      );
      previewImagePosition(
        draggedImage.previewElements,
        sceneImage ?? draggedImage.image,
      );
    });
    dragStateRef.current = null;
    releasePointerCapture(dragState);
    setDragPreviewImages([]);
    setSnapGuides([]);
  }, []);

  const cancelActiveMarquee = useCallback((): void => {
    const marqueeState = marqueeStateRef.current;
    if (!marqueeState) {
      return;
    }

    marqueeStateRef.current = null;
    releasePointerCapture(marqueeState);
    setMarqueeRect(null);
  }, []);

  const closeEditor = useCallback((): void => {
    cancelActiveDrag();
    cancelActiveMarquee();
    onClose();
  }, [cancelActiveDrag, cancelActiveMarquee, onClose]);

  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    function updateViewportSize(): void {
      setViewportSize({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    }

    window.addEventListener('resize', updateViewportSize);
    return () => window.removeEventListener('resize', updateViewportSize);
  }, []);

  useEffect(
    () => () => {
      cancelActiveDrag();
      cancelActiveMarquee();
    },
    [cancelActiveDrag, cancelActiveMarquee],
  );

  useEffect(() => {
    let isActive = true;

    queueMicrotask(() => {
      if (isActive) {
        doneButtonRef.current?.focus();
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent): void {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closeEditor();
    }

    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [closeEditor]);

  useEffect(() => {
    function keepToolbarInViewport(): void {
      const toolbar = toolbarRef.current;
      if (!toolbar) {
        return;
      }

      setToolbarPosition((currentPosition) => {
        if (!currentPosition) {
          return currentPosition;
        }

        const bounds = toolbar.getBoundingClientRect();
        const nextPosition = clampToolbarPosition(
          currentPosition.left,
          currentPosition.top,
          bounds.width,
          bounds.height,
        );

        return nextPosition.left === currentPosition.left &&
          nextPosition.top === currentPosition.top
          ? currentPosition
          : nextPosition;
      });
    }

    window.addEventListener('resize', keepToolbarInViewport);
    return () => window.removeEventListener('resize', keepToolbarInViewport);
  }, []);

  function commitScene(nextScene: OverlayScene): void {
    if (nextScene === sceneRef.current) {
      return;
    }

    sceneRef.current = nextScene;
    onChange(nextScene);
  }

  function commitImages(nextImages: readonly OverlayImageLayer[]): void {
    commitScene(replaceImages(sceneRef.current, nextImages));
  }

  function commitImage(nextImage: OverlayImageLayer): void {
    commitImages([nextImage]);
  }

  function toggleImageSelection(image: OverlayImageLayer): void {
    setSelectedImageIds((currentIds) => {
      const effectiveIds = getOverlayImageSelectionIds(
        sceneRef.current,
        currentIds,
      );
      if (!effectiveIds.has(image.id)) {
        return [...currentIds, image.id];
      }

      return currentIds.filter((imageId) => {
        const selected = findImageLayer(sceneRef.current, imageId);
        return image.groupId === undefined
          ? imageId !== image.id
          : selected?.groupId !== image.groupId;
      });
    });
  }

  function handlePointerDown(
    event: PointerEvent<HTMLButtonElement>,
    image: OverlayImageLayer,
  ): void {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    if (event.shiftKey) {
      toggleImageSelection(image);
      return;
    }

    const currentSelection = getOverlayImageSelectionIds(
      sceneRef.current,
      selectedImageIds,
    );
    const selectionSeedIds = currentSelection.has(image.id)
      ? [...currentSelection]
      : [image.id];
    const nextSelectedIds = [
      ...getOverlayImageSelectionIds(sceneRef.current, selectionSeedIds),
    ];
    setSelectedImageIds(nextSelectedIds);
    const dragImages = getOverlayImageLayers(sceneRef.current).filter(
      (candidate) => nextSelectedIds.includes(candidate.id),
    );
    if (
      dragImages.length === 0 ||
      dragImages.some((candidate) => isOverlayImageLocked(candidate))
    ) {
      return;
    }

    dragStateRef.current = {
      images: dragImages.map((dragImage) => ({
        image: dragImage,
        latestImage: dragImage,
        previewElements: getPreviewElements(dragImage.id),
      })),
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      target: event.currentTarget,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>): void {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const movedImages = dragState.images.map((draggedImage) =>
      moveOverlayImage(
        draggedImage.image,
        event.clientX - dragState.startX,
        event.clientY - dragState.startY,
      ),
    );
    const snapped = snapOverlayImages(
      movedImages,
      getOverlayImageLayers(sceneRef.current),
      viewportSize,
      { altKey: event.altKey },
    );
    dragState.images.forEach((draggedImage) => {
      const nextImage = snapped.images.find(
        (candidate) => candidate.id === draggedImage.image.id,
      );
      if (!nextImage) {
        return;
      }

      draggedImage.latestImage = nextImage;
      previewImagePosition(draggedImage.previewElements, nextImage);
    });
    setDragPreviewImages(snapped.images);
    setSnapGuides(snapped.guides);
  }

  function completePointerDrag(event: PointerEvent<HTMLButtonElement>): void {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    releasePointerCapture(dragState);
    setDragPreviewImages([]);
    setSnapGuides([]);

    if (
      dragState.images.some(
        (draggedImage) => draggedImage.latestImage !== draggedImage.image,
      )
    ) {
      commitImages(
        dragState.images.map((draggedImage) => draggedImage.latestImage),
      );
    }
  }

  function cancelPointerDrag(event: PointerEvent<HTMLButtonElement>): void {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    cancelActiveDrag();
  }

  function handleMarqueePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0 || event.target !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    const baseImageIds = event.shiftKey ? [...effectiveSelectedImageIds] : [];
    marqueeStateRef.current = {
      baseImageIds,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      target: event.currentTarget,
    };
    setMarqueeRect(
      getSelectionRect(
        event.clientX,
        event.clientY,
        event.clientX,
        event.clientY,
      ),
    );
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleMarqueePointerMove(event: PointerEvent<HTMLDivElement>): void {
    const marqueeState = marqueeStateRef.current;
    if (!marqueeState || marqueeState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    setMarqueeRect(
      getSelectionRect(
        marqueeState.startX,
        marqueeState.startY,
        event.clientX,
        event.clientY,
      ),
    );
  }

  function completeMarquee(event: PointerEvent<HTMLDivElement>): void {
    const marqueeState = marqueeStateRef.current;
    if (!marqueeState || marqueeState.pointerId !== event.pointerId) {
      return;
    }

    const selectionRect = getSelectionRect(
      marqueeState.startX,
      marqueeState.startY,
      event.clientX,
      event.clientY,
    );
    const intersectingIds = getOverlayImagesIntersectingRect(
      getOverlayImageLayers(sceneRef.current),
      selectionRect,
      viewportSize,
    ).map((image) => image.id);
    setSelectedImageIds([
      ...new Set([...marqueeState.baseImageIds, ...intersectingIds]),
    ]);
    marqueeStateRef.current = null;
    releasePointerCapture(marqueeState);
    setMarqueeRect(null);
  }

  function cancelMarquee(event: PointerEvent<HTMLDivElement>): void {
    if (marqueeStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    cancelActiveMarquee();
  }

  function handleToolbarPointerDown(
    event: PointerEvent<HTMLButtonElement>,
  ): void {
    const toolbar = toolbarRef.current;
    if (event.button !== 0 || !toolbar) {
      return;
    }

    event.preventDefault();
    const bounds = toolbar.getBoundingClientRect();
    toolbarDragStateRef.current = {
      height: bounds.height,
      left: bounds.left,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      target: event.currentTarget,
      top: bounds.top,
      width: bounds.width,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleToolbarPointerMove(
    event: PointerEvent<HTMLButtonElement>,
  ): void {
    const dragState = toolbarDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    setToolbarPosition(
      clampToolbarPosition(
        dragState.left + event.clientX - dragState.startX,
        dragState.top + event.clientY - dragState.startY,
        dragState.width,
        dragState.height,
      ),
    );
  }

  function endToolbarDrag(event: PointerEvent<HTMLButtonElement>): void {
    const dragState = toolbarDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    toolbarDragStateRef.current = null;
    releasePointerCapture(dragState);
  }

  function handleToolbarKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    const amount = event.shiftKey ? 10 : 1;
    const movement = {
      ArrowDown: { x: 0, y: amount },
      ArrowLeft: { x: -amount, y: 0 },
      ArrowRight: { x: amount, y: 0 },
      ArrowUp: { x: 0, y: -amount },
    }[event.key];
    const toolbar = toolbarRef.current;

    if (!movement || !toolbar) {
      return;
    }

    event.preventDefault();
    const bounds = toolbar.getBoundingClientRect();
    setToolbarPosition(
      clampToolbarPosition(
        bounds.left + movement.x,
        bounds.top + movement.y,
        bounds.width,
        bounds.height,
      ),
    );
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key !== 'Tab' || !editorRef.current) {
      return;
    }

    const focusableElements = getFocusableElements(editorRef.current);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);
    if (!firstElement || !lastElement) {
      return;
    }

    let nextElement: HTMLElement | null = null;
    if (event.shiftKey && document.activeElement === firstElement) {
      nextElement = lastElement;
    }
    if (!event.shiftKey && document.activeElement === lastElement) {
      nextElement = firstElement;
    }
    if (!nextElement) {
      return;
    }

    event.preventDefault();
    nextElement.focus();
  }

  function handleImageKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    image: OverlayImageLayer,
  ): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (event.shiftKey) {
        toggleImageSelection(image);
      } else {
        setSelectedImageIds([image.id]);
      }
      return;
    }

    const amount = event.shiftKey ? 10 : 1;
    const movement = {
      ArrowDown: { x: 0, y: amount },
      ArrowLeft: { x: -amount, y: 0 },
      ArrowRight: { x: amount, y: 0 },
      ArrowUp: { x: 0, y: -amount },
    }[event.key];

    if (!movement) {
      return;
    }

    event.preventDefault();
    const currentSelection = getOverlayImageSelectionIds(
      sceneRef.current,
      selectedImageIds,
    );
    const nextSelectedIds = currentSelection.has(image.id)
      ? [...currentSelection]
      : [image.id];
    const imagesToMove = getOverlayImageLayers(sceneRef.current).filter(
      (candidate) => nextSelectedIds.includes(candidate.id),
    );
    setSelectedImageIds(nextSelectedIds);
    if (imagesToMove.some(isOverlayImageLocked)) {
      return;
    }

    commitScene(
      moveOverlayImages(
        sceneRef.current,
        nextSelectedIds,
        movement.x,
        movement.y,
      ),
    );
  }

  function toggleSelectedImagesHidden(): void {
    commitScene(
      setOverlayImagesHidden(
        sceneRef.current,
        [...effectiveSelectedImageIds],
        !areAllSelectedImagesHidden,
      ),
    );
  }

  function toggleSelectedImagesLocked(): void {
    commitScene(
      setOverlayImagesLocked(
        sceneRef.current,
        [...effectiveSelectedImageIds],
        !areAllSelectedImagesLocked,
      ),
    );
  }

  function groupSelectedImages(): void {
    const imageIds = [...effectiveSelectedImageIds];
    if (imageIds.length < 2) {
      return;
    }

    setSelectedImageIds(imageIds);
    commitScene(
      groupOverlayImages(sceneRef.current, imageIds, getGroupId(imageIds)),
    );
  }

  function ungroupSelectedImages(): void {
    const imageIds = [...effectiveSelectedImageIds];
    setSelectedImageIds(imageIds);
    commitScene(ungroupOverlayImages(sceneRef.current, imageIds));
  }

  function deleteSelectedImages(): void {
    const nextScene = deleteOverlayImages(sceneRef.current, [
      ...effectiveSelectedImageIds,
    ]);
    const nextImage = getOverlayImageLayers(nextScene)[0];
    setSelectedImageIds(nextImage ? [nextImage.id] : []);
    commitScene(nextScene);
  }

  function handlePlaybackRateChange(
    event: ChangeEvent<HTMLSelectElement>,
  ): void {
    if (
      !selectedImage ||
      getOverlayImageMediaKind(selectedImage) !== 'motion'
    ) {
      return;
    }

    const playbackRate = OVERLAY_PLAYBACK_RATES.find(
      (rate) => rate === Number(event.currentTarget.value),
    );
    if (playbackRate === undefined) {
      return;
    }

    commitImage({ ...selectedImage, playbackRate });
  }

  function togglePlaybackMode(): void {
    if (
      !selectedImage ||
      getOverlayImageMediaKind(selectedImage) !== 'motion'
    ) {
      return;
    }

    commitImage({
      ...selectedImage,
      playbackMode:
        getOverlayImagePlaybackMode(selectedImage) === 'active-tab-only'
          ? 'always'
          : 'active-tab-only',
    });
  }

  function handleRotationChange(event: ChangeEvent<HTMLInputElement>): void {
    if (!selectedImage) {
      return;
    }

    const rotationDeg = Number(event.currentTarget.value);
    if (!Number.isFinite(rotationDeg)) {
      return;
    }

    commitImage({ ...selectedImage, rotationDeg });
  }

  function handleScaleChange(event: ChangeEvent<HTMLInputElement>): void {
    if (!selectedImage) {
      return;
    }

    const scalePercent = Number(event.currentTarget.value);
    const scale = scalePercent / 100;
    if (
      !Number.isFinite(scale) ||
      scale < MIN_OVERLAY_IMAGE_SCALE ||
      scale > MAX_OVERLAY_IMAGE_SCALE
    ) {
      return;
    }

    commitImage({ ...selectedImage, scale });
  }

  function handleAnchorChange(anchor: OverlayAnchor): void {
    if (!selectedImage) {
      return;
    }

    commitImage(changeOverlayImageAnchor(selectedImage, anchor, viewportSize));
  }

  function resetSelectedPosition(): void {
    if (!selectedImage) {
      return;
    }

    commitImage({
      ...selectedImage,
      offsetX: DEFAULT_OFFSET,
      offsetY: DEFAULT_OFFSET,
      rotationDeg: 0,
      scale: DEFAULT_OVERLAY_IMAGE_SCALE,
    });
  }

  return (
    <section
      ref={editorRef}
      aria-describedby={instructionsId}
      aria-label={t('layers.editor.title')}
      aria-modal="true"
      className={styles.editor}
      data-starlit-part="overlay-position-editor"
      onKeyDown={handleEditorKeyDown}
      role="dialog"
    >
      <div
        className={styles.canvas}
        data-starlit-part="overlay-editor-canvas"
        onPointerCancel={cancelMarquee}
        onPointerDown={handleMarqueePointerDown}
        onPointerMove={handleMarqueePointerMove}
        onPointerUp={completeMarquee}
      >
        {scene.layers.map((layer, index) => {
          if (layer.kind !== 'image') {
            return null;
          }

          const previewLayer =
            dragPreviewImages.find((preview) => preview.id === layer.id) ??
            layer;
          const isSelected = effectiveSelectedImageIds.has(layer.id);
          return (
            <button
              key={layer.id}
              aria-label={`${t('layers.editor.image')}: ${layer.name}`}
              aria-pressed={isSelected}
              className={styles.imageTarget}
              data-hidden={isOverlayImageHidden(layer) || undefined}
              data-locked={isOverlayImageLocked(layer) || undefined}
              data-overlay-image-id={layer.id}
              data-selected={isSelected || undefined}
              onKeyDown={(event) => handleImageKeyDown(event, layer)}
              onPointerCancel={cancelPointerDrag}
              onPointerDown={(event) => handlePointerDown(event, layer)}
              onPointerMove={handlePointerMove}
              onPointerUp={completePointerDrag}
              style={{
                ...getOverlayImageStyle(previewLayer),
                zIndex: isSelected ? scene.layers.length + index : index,
              }}
              type="button"
            />
          );
        })}

        {selectedPreviewImages.map((image) => {
          const anchorPoint = getOverlayImageAnchorPoint(image, viewportSize);
          return (
            <span
              key={image.id}
              aria-hidden="true"
              className={styles.anchorMarker}
              data-overlay-anchor-id={image.id}
              style={{ left: anchorPoint.x, top: anchorPoint.y }}
            />
          );
        })}

        {snapGuides.map((guide) => (
          <span
            key={`${guide.axis}:${guide.position}:${guide.source}:${guide.imageId ?? ''}`}
            aria-hidden="true"
            className={styles.snapGuide}
            data-axis={guide.axis}
            data-snap-source={guide.source}
            style={
              guide.axis === 'x'
                ? { left: guide.position }
                : { top: guide.position }
            }
          />
        ))}

        {marqueeRect ? (
          <span
            aria-hidden="true"
            className={styles.marquee}
            data-starlit-part="overlay-selection-marquee"
            style={{
              height: marqueeRect.bottom - marqueeRect.top,
              left: marqueeRect.left,
              top: marqueeRect.top,
              width: marqueeRect.right - marqueeRect.left,
            }}
          />
        ) : null}
      </div>

      <aside
        ref={toolbarRef}
        className={styles.toolbar}
        style={
          toolbarPosition
            ? {
                bottom: 'auto',
                left: `${toolbarPosition.left}px`,
                right: 'auto',
                top: `${toolbarPosition.top}px`,
              }
            : undefined
        }
      >
        <div className={styles.toolbarHeader}>
          <div className={styles.toolbarHeading}>
            <button
              aria-label={t('layers.editor.moveToolbar')}
              className={styles.toolbarMoveHandle}
              onKeyDown={handleToolbarKeyDown}
              onPointerCancel={endToolbarDrag}
              onPointerDown={handleToolbarPointerDown}
              onPointerMove={handleToolbarPointerMove}
              onPointerUp={endToolbarDrag}
              type="button"
            >
              <span aria-hidden="true">⋮⋮</span>
            </button>
            <h2 className={styles.title}>{t('layers.editor.title')}</h2>
          </div>
          <Button ref={doneButtonRef} onClick={closeEditor} size="compact">
            {t('layers.editor.done')}
          </Button>
        </div>

        <Text id={instructionsId} tone="muted" variant="caption">
          {t('layers.editor.instructions')}
        </Text>

        {imageLayers.length > 0 ? (
          <>
            <label className={styles.field}>
              <span className={styles.label}>{t('layers.editor.image')}</span>
              <select
                className={styles.select}
                onChange={(event) =>
                  setSelectedImageIds([event.currentTarget.value])
                }
                value={primarySelectedImage?.id ?? ''}
              >
                <option disabled value="">
                  {t('layers.editor.noImageSelected')}
                </option>
                {imageLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedImages.length > 0 ? (
              <>
                <Text tone="muted" variant="caption">
                  {selectedImages.length} {t('layers.editor.selectedCount')}
                </Text>
                <div
                  aria-label={t('layers.editor.selectedActions')}
                  className={styles.selectionActions}
                  role="group"
                >
                  <Button
                    onClick={toggleSelectedImagesHidden}
                    size="compact"
                    variant="quiet"
                  >
                    {areAllSelectedImagesHidden
                      ? t('layers.action.show')
                      : t('layers.action.hide')}
                  </Button>
                  <Button
                    onClick={toggleSelectedImagesLocked}
                    size="compact"
                    variant="quiet"
                  >
                    {areAllSelectedImagesLocked
                      ? t('layers.action.unlock')
                      : t('layers.action.lock')}
                  </Button>
                  <Button
                    disabled={selectedImages.length < 2}
                    onClick={groupSelectedImages}
                    size="compact"
                    variant="quiet"
                  >
                    {t('layers.action.group')}
                  </Button>
                  <Button
                    disabled={!hasGroupedSelection}
                    onClick={ungroupSelectedImages}
                    size="compact"
                    variant="quiet"
                  >
                    {t('layers.action.ungroup')}
                  </Button>
                  <Button
                    onClick={deleteSelectedImages}
                    size="compact"
                    variant="critical"
                  >
                    {t('layers.remove')}
                  </Button>
                </div>
              </>
            ) : (
              <Text tone="muted">{t('layers.editor.noSelection')}</Text>
            )}

            {selectedImage ? (
              <>
                <fieldset className={styles.field}>
                  <legend className={styles.label}>
                    {t('layers.editor.anchor')}
                  </legend>
                  <PlacementPicker
                    getItemLabel={(anchor) => t(ANCHOR_LABEL_KEYS[anchor])}
                    label={t('layers.editor.anchor')}
                    onValueChange={handleAnchorChange}
                    value={selectedImage.anchor}
                  />
                  <div
                    aria-label={t('layers.editor.viewportSize')}
                    className={styles.viewportToggle}
                    role="group"
                  >
                    <Button
                      aria-pressed={anchorPreviewViewport === 'wide'}
                      onClick={() => setAnchorPreviewViewport('wide')}
                      size="compact"
                      variant="quiet"
                    >
                      {t('layers.editor.viewportWide')}
                    </Button>
                    <Button
                      aria-pressed={anchorPreviewViewport === 'narrow'}
                      onClick={() => setAnchorPreviewViewport('narrow')}
                      size="compact"
                      variant="quiet"
                    >
                      {t('layers.editor.viewportNarrow')}
                    </Button>
                  </div>
                  <div
                    aria-label={`${t('layers.editor.viewportPreview')}: ${t(
                      ANCHOR_LABEL_KEYS[selectedImage.anchor],
                    )}`}
                    className={styles.viewportPreview}
                    data-anchor={selectedImage.anchor}
                    data-viewport={anchorPreviewViewport}
                    role="img"
                  >
                    <span
                      aria-hidden="true"
                      className={styles.viewportAnchorMarker}
                      data-anchor={selectedImage.anchor}
                    />
                  </div>
                </fieldset>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor={rotationId}>
                    {t('layers.editor.rotation')}
                  </label>
                  <div className={styles.rangeRow}>
                    <input
                      id={rotationId}
                      max={180}
                      min={-180}
                      onChange={handleRotationChange}
                      step={1}
                      type="range"
                      value={selectedImage.rotationDeg}
                    />
                    <output className={styles.rangeValue} htmlFor={rotationId}>
                      {selectedImage.rotationDeg}°
                    </output>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor={zoomId}>
                    {t('layers.editor.zoom')}
                  </label>
                  <div className={styles.rangeRow}>
                    <input
                      id={zoomId}
                      max={MAX_OVERLAY_IMAGE_SCALE * 100}
                      min={MIN_OVERLAY_IMAGE_SCALE * 100}
                      onChange={handleScaleChange}
                      step={5}
                      type="range"
                      value={selectedImageScale * 100}
                    />
                    <output className={styles.rangeValue} htmlFor={zoomId}>
                      {Math.round(selectedImageScale * 100)}%
                    </output>
                  </div>
                </div>

                {getOverlayImageMediaKind(selectedImage) === 'motion' ? (
                  <>
                    <label className={styles.field}>
                      <span className={styles.label}>
                        {t('layers.playbackRate')}
                      </span>
                      <select
                        className={styles.select}
                        onChange={handlePlaybackRateChange}
                        value={getOverlayImagePlaybackRate(selectedImage)}
                      >
                        {OVERLAY_PLAYBACK_RATES.map((rate) => (
                          <option key={rate} value={rate}>
                            {rate}×
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      onClick={togglePlaybackMode}
                      size="compact"
                      variant="quiet"
                    >
                      {getOverlayImagePlaybackMode(selectedImage) ===
                      'active-tab-only'
                        ? t('layers.playbackActiveTab')
                        : t('layers.playbackAlways')}
                    </Button>
                  </>
                ) : null}

                <div className={styles.actions}>
                  <Button
                    onClick={resetSelectedPosition}
                    size="compact"
                    variant="quiet"
                  >
                    {t('layers.editor.resetPosition')}
                  </Button>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <Text tone="muted">{t('layers.editor.empty')}</Text>
        )}
      </aside>
    </section>
  );
}
