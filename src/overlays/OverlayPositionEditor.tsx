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
  changeOverlayImageAnchor,
  getOverlayImageStyle,
  moveOverlayImage,
} from './geometry';
import {
  DEFAULT_OVERLAY_IMAGE_SCALE,
  MAX_OVERLAY_IMAGE_SCALE,
  MIN_OVERLAY_IMAGE_SCALE,
  getOverlayImageLayers,
  getOverlayImageScale,
} from './model';
import type { OverlayAnchor, OverlayImageLayer, OverlayScene } from './types';
import * as styles from './OverlayPositionEditor.css';

const DEFAULT_OFFSET = 24;
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

type DragState = {
  image: OverlayImageLayer;
  latestImage: OverlayImageLayer;
  pointerId: number;
  previewElements: HTMLElement[];
  startX: number;
  startY: number;
  target: HTMLButtonElement;
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

export type OverlayPositionEditorProps = {
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
  target: HTMLButtonElement;
}): void {
  if (dragState.target.hasPointerCapture?.(dragState.pointerId)) {
    dragState.target.releasePointerCapture?.(dragState.pointerId);
  }
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
  onChange,
  onClose,
  scene,
}: OverlayPositionEditorProps): ReactElement {
  const { t } = useTranslation();
  const rotationId = useId();
  const zoomId = useId();
  const instructionsId = useId();
  const imageLayers = useMemo(() => getOverlayImageLayers(scene), [scene]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    () => imageLayers[0]?.id ?? null,
  );
  const [toolbarPosition, setToolbarPosition] =
    useState<ToolbarPosition | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const toolbarDragStateRef = useRef<ToolbarDragState | null>(null);
  const toolbarRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const doneButtonRef = useRef<HTMLButtonElement>(null);
  const sceneRef = useRef(scene);

  const selectedImage =
    (selectedImageId ? findImageLayer(scene, selectedImageId) : undefined) ??
    imageLayers[0];
  const effectiveSelectedImageId = selectedImage?.id ?? null;
  const selectedImageScale = selectedImage
    ? getOverlayImageScale(selectedImage)
    : DEFAULT_OVERLAY_IMAGE_SCALE;

  const cancelActiveDrag = useCallback((): void => {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }

    const sceneImage = findImageLayer(sceneRef.current, dragState.image.id);
    previewImagePosition(
      dragState.previewElements,
      sceneImage ?? dragState.image,
    );
    dragStateRef.current = null;
    releasePointerCapture(dragState);
  }, []);

  const closeEditor = useCallback((): void => {
    cancelActiveDrag();
    onClose();
  }, [cancelActiveDrag, onClose]);

  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => () => cancelActiveDrag(), [cancelActiveDrag]);

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

  function commitImage(nextImage: OverlayImageLayer): void {
    const nextScene = {
      layers: sceneRef.current.layers.map((layer) =>
        layer.kind === 'image' && layer.id === nextImage.id ? nextImage : layer,
      ),
    };
    sceneRef.current = nextScene;
    onChange(nextScene);
  }

  function handlePointerDown(
    event: PointerEvent<HTMLButtonElement>,
    image: OverlayImageLayer,
  ): void {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    setSelectedImageId(image.id);
    const currentImage = findImageLayer(sceneRef.current, image.id) ?? image;
    dragStateRef.current = {
      image: currentImage,
      latestImage: currentImage,
      pointerId: event.pointerId,
      previewElements: getPreviewElements(image.id),
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
    const nextImage = moveOverlayImage(
      dragState.image,
      event.clientX - dragState.startX,
      event.clientY - dragState.startY,
    );
    dragState.latestImage = nextImage;
    previewImagePosition(dragState.previewElements, nextImage);
  }

  function completePointerDrag(event: PointerEvent<HTMLButtonElement>): void {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    releasePointerCapture(dragState);

    if (dragState.latestImage !== dragState.image) {
      commitImage(dragState.latestImage);
    }
  }

  function cancelPointerDrag(event: PointerEvent<HTMLButtonElement>): void {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    cancelActiveDrag();
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
    imageId: string,
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

    const currentImage = findImageLayer(sceneRef.current, imageId);
    if (!currentImage) {
      return;
    }

    event.preventDefault();
    commitImage(moveOverlayImage(currentImage, movement.x, movement.y));
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

    commitImage(
      changeOverlayImageAnchor(selectedImage, anchor, {
        height: window.innerHeight,
        width: window.innerWidth,
      }),
    );
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
      <div className={styles.canvas} data-starlit-part="overlay-editor-canvas">
        {scene.layers.map((layer, index) =>
          layer.kind === 'image' ? (
            <button
              key={layer.id}
              aria-label={`${t('layers.editor.image')}: ${layer.name}`}
              aria-pressed={layer.id === effectiveSelectedImageId}
              className={styles.imageTarget}
              data-overlay-image-id={layer.id}
              data-selected={layer.id === effectiveSelectedImageId || undefined}
              onKeyDown={(event) => handleImageKeyDown(event, layer.id)}
              onPointerCancel={cancelPointerDrag}
              onPointerDown={(event) => handlePointerDown(event, layer)}
              onPointerMove={handlePointerMove}
              onPointerUp={completePointerDrag}
              style={{
                ...getOverlayImageStyle(layer),
                zIndex:
                  layer.id === effectiveSelectedImageId
                    ? scene.layers.length
                    : index,
              }}
              type="button"
            />
          ) : null,
        )}
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

        {selectedImage ? (
          <>
            <label className={styles.field}>
              <span className={styles.label}>{t('layers.editor.image')}</span>
              <select
                className={styles.select}
                onChange={(event) =>
                  setSelectedImageId(event.currentTarget.value)
                }
                value={selectedImage.id}
              >
                {imageLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.name}
                  </option>
                ))}
              </select>
            </label>

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
        ) : (
          <Text tone="muted">{t('layers.editor.empty')}</Text>
        )}
      </aside>
    </section>
  );
}
