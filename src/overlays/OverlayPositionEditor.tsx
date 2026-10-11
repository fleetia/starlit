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
import type { CanvasSceneV2, WidgetInstance } from '../scenes';
import { WidgetEditor } from '../settings/options/WidgetEditor';
import { getWidgetFrameStyle, moveWidget } from '../widgets/frame';
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

type WidgetDragState = {
  latestWidget: WidgetInstance;
  pointerId: number;
  previewElements: HTMLElement[];
  startX: number;
  startY: number;
  target: HTMLButtonElement;
  widget: WidgetInstance;
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
  target: HTMLDivElement;
  top: number;
  width: number;
};

type ToolbarPosition = {
  left: number;
  top: number;
};

type AnchorPreviewViewport = 'narrow' | 'wide';

export type OverlayPositionEditorProps = {
  canvas?: CanvasSceneV2;
  initialSelectedItemId?: string;
  initialSelectedImageId?: string;
  onChange: (scene: OverlayScene) => void;
  onCanvasChange?: (canvas: CanvasSceneV2) => void;
  onClose: () => void;
  scene: OverlayScene;
};

function getWidgetLayers(canvas: CanvasSceneV2 | undefined): WidgetInstance[] {
  return (
    canvas?.layers.filter(
      (layer): layer is WidgetInstance => layer.kind === 'widget',
    ) ?? []
  );
}

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

function getWidgetPreviewElements(widgetId: string): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-canvas-widget-id]'),
  ).filter((element) => element.dataset.canvasWidgetId === widgetId);
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

function toWidgetStyleValue(value: unknown): string {
  if (typeof value === 'number') {
    return `${value}px`;
  }

  return typeof value === 'string' ? value : '';
}

function previewWidgetPosition(
  elements: readonly HTMLElement[],
  widget: WidgetInstance,
): void {
  const style = getWidgetFrameStyle(widget);

  elements.forEach((element) => {
    element.style.bottom = toWidgetStyleValue(style.bottom);
    element.style.height = toWidgetStyleValue(style.height);
    element.style.left = toWidgetStyleValue(style.left);
    element.style.right = toWidgetStyleValue(style.right);
    element.style.top = toWidgetStyleValue(style.top);
    element.style.width = toWidgetStyleValue(style.width);
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

function replaceWidget(
  canvas: CanvasSceneV2,
  widget: WidgetInstance,
): CanvasSceneV2 {
  return {
    ...canvas,
    layers: canvas.layers.map((layer) =>
      layer.kind === 'widget' && layer.id === widget.id ? widget : layer,
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
  canvas,
  initialSelectedItemId,
  initialSelectedImageId,
  onChange,
  onCanvasChange,
  onClose,
  scene,
}: OverlayPositionEditorProps): ReactElement {
  const { t } = useTranslation();
  const rotationId = useId();
  const zoomId = useId();
  const instructionsId = useId();
  const imageLayers = useMemo(() => getOverlayImageLayers(scene), [scene]);
  const widgetLayers = useMemo(() => getWidgetLayers(canvas), [canvas]);
  const requestedItemId = initialSelectedItemId ?? initialSelectedImageId;
  const requestedImage = imageLayers.find(
    (image) => image.id === requestedItemId,
  );
  const requestedWidget = widgetLayers.find(
    (widget) => widget.id === requestedItemId,
  );
  const initialWidget =
    requestedWidget ??
    (requestedImage === undefined && imageLayers.length === 0
      ? widgetLayers[0]
      : undefined);
  const initialImage =
    requestedImage ?? (initialWidget ? undefined : imageLayers[0]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(
    initialWidget?.id ?? null,
  );
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>(() =>
    initialImage ? [initialImage.id] : [],
  );
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
  const widgetDragStateRef = useRef<WidgetDragState | null>(null);
  const marqueeStateRef = useRef<MarqueeState | null>(null);
  const toolbarDragStateRef = useRef<ToolbarDragState | null>(null);
  const toolbarRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const doneButtonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef(canvas);
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
  const selectedWidget = widgetLayers.find(
    (widget) => widget.id === selectedWidgetId,
  );
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

  const cancelActiveWidgetDrag = useCallback((): void => {
    const dragState = widgetDragStateRef.current;
    if (!dragState) {
      return;
    }

    previewWidgetPosition(dragState.previewElements, dragState.widget);
    widgetDragStateRef.current = null;
    releasePointerCapture(dragState);
  }, []);

  const closeEditor = useCallback((): void => {
    cancelActiveDrag();
    cancelActiveMarquee();
    cancelActiveWidgetDrag();
    onClose();
  }, [cancelActiveDrag, cancelActiveMarquee, cancelActiveWidgetDrag, onClose]);

  useEffect(() => {
    canvasRef.current = canvas;
  }, [canvas]);

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
      cancelActiveWidgetDrag();
    },
    [cancelActiveDrag, cancelActiveMarquee, cancelActiveWidgetDrag],
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

  function commitWidget(nextWidget: WidgetInstance): void {
    const currentCanvas = canvasRef.current;
    if (!currentCanvas || !onCanvasChange) {
      return;
    }

    const nextCanvas = replaceWidget(currentCanvas, nextWidget);
    canvasRef.current = nextCanvas;
    onCanvasChange(nextCanvas);
  }

  function getWidgetName(widget: WidgetInstance): string {
    const sameTypeWidgets = widgetLayers.filter(
      (candidate) => candidate.widgetType === widget.widgetType,
    );
    const ordinal =
      sameTypeWidgets.findIndex((candidate) => candidate.id === widget.id) + 1;
    const typeName = t(
      widget.widgetType === 'clock' ? 'widgets.clock' : 'widgets.calendar',
    );
    return `${typeName} ${ordinal}`;
  }

  function selectImage(imageId: string): void {
    cancelActiveWidgetDrag();
    setSelectedWidgetId(null);
    setSelectedImageIds([imageId]);
  }

  function selectWidget(widgetId: string): void {
    cancelActiveDrag();
    cancelActiveMarquee();
    cancelActiveWidgetDrag();
    setSelectedImageIds([]);
    setSelectedWidgetId(widgetId);
  }

  function handleItemChange(itemId: string): void {
    if (widgetLayers.some((widget) => widget.id === itemId)) {
      selectWidget(itemId);
      return;
    }

    if (imageLayers.some((image) => image.id === itemId)) {
      selectImage(itemId);
    }
  }

  function toggleImageSelection(image: OverlayImageLayer): void {
    setSelectedWidgetId(null);
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
    cancelActiveWidgetDrag();
    setSelectedWidgetId(null);
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
    cancelActiveWidgetDrag();
    setSelectedWidgetId(null);
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

  function handleWidgetPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    widget: WidgetInstance,
  ): void {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    selectWidget(widget.id);
    const currentWidget = getWidgetLayers(canvasRef.current).find(
      (candidate) => candidate.id === widget.id,
    );
    if (!currentWidget || currentWidget.isLocked || !onCanvasChange) {
      return;
    }

    widgetDragStateRef.current = {
      latestWidget: currentWidget,
      pointerId: event.pointerId,
      previewElements: getWidgetPreviewElements(widget.id),
      startX: event.clientX,
      startY: event.clientY,
      target: event.currentTarget,
      widget: currentWidget,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleWidgetPointerMove(
    event: PointerEvent<HTMLButtonElement>,
  ): void {
    const dragState = widgetDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const nextWidget = moveWidget(
      dragState.widget,
      event.clientX - dragState.startX,
      event.clientY - dragState.startY,
    );
    dragState.latestWidget = nextWidget;
    previewWidgetPosition(dragState.previewElements, nextWidget);
  }

  function completeWidgetPointerDrag(
    event: PointerEvent<HTMLButtonElement>,
  ): void {
    const dragState = widgetDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    widgetDragStateRef.current = null;
    releasePointerCapture(dragState);
    if (dragState.latestWidget !== dragState.widget) {
      commitWidget(dragState.latestWidget);
    }
  }

  function cancelWidgetPointerDrag(
    event: PointerEvent<HTMLButtonElement>,
  ): void {
    if (widgetDragStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    cancelActiveWidgetDrag();
  }

  function handleToolbarPointerDown(event: PointerEvent<HTMLDivElement>): void {
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

  function handleToolbarPointerMove(event: PointerEvent<HTMLDivElement>): void {
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

  function endToolbarDrag(event: PointerEvent<HTMLDivElement>): void {
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
        selectImage(image.id);
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

  function handleWidgetKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    widget: WidgetInstance,
  ): void {
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
    selectWidget(widget.id);
    const currentWidget = getWidgetLayers(canvasRef.current).find(
      (candidate) => candidate.id === widget.id,
    );
    if (!currentWidget || currentWidget.isLocked) {
      return;
    }

    commitWidget(moveWidget(currentWidget, movement.x, movement.y));
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
    setSelectedWidgetId(nextImage ? null : (widgetLayers[0]?.id ?? null));
    commitScene(nextScene);
  }

  function removeSelectedWidget(): void {
    if (!canvas || !selectedWidget || !onCanvasChange) {
      return;
    }

    const nextCanvas = {
      ...canvas,
      layers: canvas.layers.filter((layer) => layer.id !== selectedWidget.id),
    };
    const nextWidget = getWidgetLayers(nextCanvas)[0];
    onCanvasChange(nextCanvas);
    if (imageLayers[0]) {
      selectImage(imageLayers[0].id);
    } else {
      setSelectedWidgetId(nextWidget?.id ?? null);
    }
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
                zIndex: isSelected
                  ? scene.layers.length + widgetLayers.length + index
                  : index,
              }}
              type="button"
            />
          );
        })}

        {widgetLayers.map((widget, index) => {
          const isSelected = selectedWidget?.id === widget.id;
          return (
            <button
              key={widget.id}
              aria-label={getWidgetName(widget)}
              aria-pressed={isSelected}
              className={styles.widgetTarget}
              data-canvas-widget-id={widget.id}
              data-hidden={widget.isHidden || undefined}
              data-locked={widget.isLocked || undefined}
              data-selected={isSelected || undefined}
              onClick={() => selectWidget(widget.id)}
              onKeyDown={(event) => handleWidgetKeyDown(event, widget)}
              onPointerCancel={cancelWidgetPointerDrag}
              onPointerDown={(event) => handleWidgetPointerDown(event, widget)}
              onPointerMove={handleWidgetPointerMove}
              onPointerUp={completeWidgetPointerDrag}
              style={{
                ...getWidgetFrameStyle(widget),
                zIndex: isSelected
                  ? scene.layers.length + widgetLayers.length + index
                  : scene.layers.length + index,
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
          <div
            className={styles.toolbarHeading}
            onPointerCancel={endToolbarDrag}
            onPointerDown={handleToolbarPointerDown}
            onPointerMove={handleToolbarPointerMove}
            onPointerUp={endToolbarDrag}
          >
            <button
              aria-label={t('layers.editor.moveToolbar')}
              className={styles.toolbarMoveHandle}
              onKeyDown={handleToolbarKeyDown}
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

        {imageLayers.length + widgetLayers.length > 0 ? (
          <>
            <label className={styles.field}>
              <span className={styles.label}>{t('layers.editor.item')}</span>
              <select
                className={styles.select}
                onChange={(event) =>
                  handleItemChange(event.currentTarget.value)
                }
                value={selectedWidget?.id ?? primarySelectedImage?.id ?? ''}
              >
                <option disabled value="">
                  {t('layers.editor.noItemSelected')}
                </option>
                {imageLayers.length > 0 ? (
                  <optgroup label={t('widgets.image')}>
                    {imageLayers.map((layer) => (
                      <option key={layer.id} value={layer.id}>
                        {layer.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {widgetLayers.length > 0 ? (
                  <optgroup label={t('sidebar.tab.widgets')}>
                    {widgetLayers.map((widget) => (
                      <option key={widget.id} value={widget.id}>
                        {getWidgetName(widget)}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>

            {selectedWidget && canvas && onCanvasChange ? (
              <WidgetEditor
                key={selectedWidget.id}
                canvas={canvas}
                onChange={onCanvasChange}
                onRemove={removeSelectedWidget}
                widget={selectedWidget}
              />
            ) : (
              <>
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
                        <output
                          className={styles.rangeValue}
                          htmlFor={rotationId}
                        >
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
            )}
          </>
        ) : (
          <Text tone="muted">{t('layers.editor.empty')}</Text>
        )}
      </aside>
    </section>
  );
}
