import type { ChangeEvent, DragEvent, MouseEvent, ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button, IconButton, Inline, Stack, Text } from '@fleetia/lagrange';

import { OverlayImageActionMenu } from '../../overlays/OverlayImageActionMenu';
import type { OverlayMotionPlaybackOverride } from '../../overlays/OverlayImageStacks';
import type { OverlayImageLayer, OverlayScene } from '../../overlays/types';
import {
  useOverlayImageActions,
  type OverlayImageMutation,
} from '../../overlays/useOverlayImageActions';
import type {
  CanvasLayerV2,
  CanvasSceneV2,
  WidgetInstance,
} from '../../scenes';
import { SettingsSection } from './controls';
import * as styles from './LayersPanel.css';

export type LayersPanelCopy = {
  addImages: string;
  back: string;
  bookmarks: string;
  bookmarksDescription: string;
  calendar: string;
  clock: string;
  configureWidget: (name: string) => string;
  description: string;
  dragToReorder: string;
  editPositions: string;
  empty: string;
  fileDescription: string;
  front: string;
  frontToBackDescription: string;
  layerList: string;
  moveTowardBack: (name: string) => string;
  moveTowardFront: (name: string) => string;
  moreActions: (name: string) => string;
  processing: string;
  removeImage: (name: string) => string;
  removeWidget: (name: string) => string;
  title: string;
};

export type LayersPanelProps = {
  canvas: CanvasSceneV2;
  copy: LayersPanelCopy;
  isProcessing: boolean;
  onCanvasChange: (canvas: CanvasSceneV2) => void;
  onConfigureWidget: (widgetId: string) => void;
  onEditPositions: (imageId?: string) => void;
  onFilesSelected: (files: File[]) => void;
  onImageAction: (mutation: OverlayImageMutation) => Promise<void> | void;
  onImageActionError: (error: Error | null) => void;
  onImageActionProcessingChange: (isProcessing: boolean) => void;
  onImageFilesPrepare: (files: readonly File[]) => Promise<OverlayImageLayer[]>;
  onImagePreparationRollback: (ids: readonly string[]) => Promise<void>;
  onMotionPlaybackOverrideChange: (
    imageId: string,
    override: OverlayMotionPlaybackOverride,
  ) => void;
  onSceneChange: (scene: OverlayScene) => void;
  scene: OverlayScene;
  showAddAction?: boolean;
};

function moveLayer(
  layers: CanvasLayerV2[],
  fromIndex: number,
  toIndex: number,
): CanvasLayerV2[] {
  if (
    fromIndex < 0 ||
    fromIndex >= layers.length ||
    toIndex < 0 ||
    toIndex >= layers.length ||
    fromIndex === toIndex
  ) {
    return layers;
  }

  const layer = layers[fromIndex];
  if (!layer) return layers;

  const reorderedLayers = [...layers];
  reorderedLayers.splice(fromIndex, 1);
  reorderedLayers.splice(toIndex, 0, layer);
  return reorderedLayers;
}

function toFrontToBack(layers: CanvasLayerV2[]): CanvasLayerV2[] {
  return [...layers].reverse();
}

function SettingsGlyph(): ReactElement {
  return (
    <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm7-3.2c0-.5-.1-1-.2-1.5l2-1.6-2-3.4-2.5 1a8 8 0 0 0-2.6-1.5L13.3 2h-4l-.4 3a8 8 0 0 0-2.6 1.5l-2.5-1-2 3.4 2 1.6a8 8 0 0 0 0 3l-2 1.6 2 3.4 2.5-1a8 8 0 0 0 2.6 1.5l.4 3h4l.4-3a8 8 0 0 0 2.6-1.5l2.5 1 2-3.4-2-1.6c.1-.5.2-1 .2-1.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function getWidgetName(
  widget: WidgetInstance,
  canvas: CanvasSceneV2,
  copy: LayersPanelCopy,
): string {
  const sameTypeWidgets = canvas.layers.filter(
    (layer): layer is WidgetInstance =>
      layer.kind === 'widget' && layer.widgetType === widget.widgetType,
  );
  const ordinal =
    sameTypeWidgets.findIndex((item) => item.id === widget.id) + 1;
  const typeName = widget.widgetType === 'clock' ? copy.clock : copy.calendar;
  return `${typeName} ${ordinal}`;
}

export function LayersPanel({
  canvas,
  copy,
  isProcessing,
  onCanvasChange,
  onConfigureWidget,
  onEditPositions,
  onFilesSelected,
  onImageAction,
  onImageActionError,
  onImageActionProcessingChange,
  onImageFilesPrepare,
  onImagePreparationRollback,
  onMotionPlaybackOverrideChange,
  onSceneChange,
  scene,
  showAddAction = true,
}: LayersPanelProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const frontToBackLayers = toFrontToBack(canvas.layers);
  const hasImages = canvas.layers.some((layer) => layer.kind === 'decoration');
  const imageActions = useOverlayImageActions({
    isDisabled: isProcessing,
    onEditImage: onEditPositions,
    onError: onImageActionError,
    onMotionPlaybackOverrideChange,
    onMutation: onImageAction,
    onPreparationRollback: onImagePreparationRollback,
    prepareFiles: onImageFilesPrepare,
    scene,
  });
  const isMutating = isProcessing || imageActions.isProcessing;

  useEffect(() => {
    onImageActionProcessingChange(imageActions.isProcessing);
    return () => onImageActionProcessingChange(false);
  }, [imageActions.isProcessing, onImageActionProcessingChange]);

  function clearDragState(): void {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function updateLayerOrder(nextFrontToBackLayers: CanvasLayerV2[]): void {
    onCanvasChange({ ...canvas, layers: [...nextFrontToBackLayers].reverse() });
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (files.length > 0) onFilesSelected(files);
  }

  function handleMove(index: number, offset: -1 | 1): void {
    const nextLayers = moveLayer(frontToBackLayers, index, index + offset);
    if (nextLayers !== frontToBackLayers) updateLayerOrder(nextLayers);
  }

  function handleDragOver(
    event: DragEvent<HTMLLIElement>,
    index: number,
  ): void {
    if (isMutating) return;
    event.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(toIndex: number): void {
    if (!isMutating && dragIndex !== null) {
      const nextLayers = moveLayer(frontToBackLayers, dragIndex, toIndex);
      if (nextLayers !== frontToBackLayers) updateLayerOrder(nextLayers);
    }
    clearDragState();
  }

  function handleRemoveImage(imageId: string): void {
    onSceneChange({
      layers: scene.layers.filter(
        (layer) => layer.kind !== 'image' || layer.id !== imageId,
      ),
    });
  }

  function handleRemoveWidget(widgetId: string): void {
    onCanvasChange({
      ...canvas,
      layers: canvas.layers.filter((layer) => layer.id !== widgetId),
    });
  }

  function handleOpenImageActions(
    event: MouseEvent<HTMLButtonElement>,
    imageId: string,
  ): void {
    const bounds = event.currentTarget.getBoundingClientRect();
    imageActions.openMenu({
      imageId,
      point: { x: bounds.right, y: bounds.bottom },
    });
  }

  return (
    <SettingsSection description={copy.description} title={copy.title}>
      <Stack gap="md">
        <Inline align="center" gap="sm" wrap>
          {showAddAction ? (
            <Button
              disabled={isMutating}
              isPending={isMutating}
              onClick={() => inputRef.current?.click()}
              size="compact"
              variant="secondary"
            >
              {copy.addImages}
            </Button>
          ) : null}
          <Button
            disabled={isMutating || !hasImages}
            onClick={() => onEditPositions()}
            size="compact"
          >
            {copy.editPositions}
          </Button>
          {isMutating ? (
            <Text
              aria-live="polite"
              className={styles.status}
              role="status"
              tone="muted"
              variant="caption"
            >
              {copy.processing}
            </Text>
          ) : null}
        </Inline>
        {showAddAction ? (
          <input
            ref={inputRef}
            accept="image/*,video/*,.gif"
            aria-label={copy.addImages}
            className={styles.hiddenInput}
            disabled={isMutating}
            multiple
            onChange={handleFilesSelected}
            type="file"
          />
        ) : null}
        <Text as="p" tone="muted" variant="caption">
          {copy.fileDescription}
        </Text>
        {canvas.layers.length === 1 ? (
          <Text as="p" tone="muted" variant="caption">
            {copy.empty}
          </Text>
        ) : null}
        <Text as="p" tone="muted" variant="caption">
          {copy.frontToBackDescription}
        </Text>
        <div aria-hidden="true" className={styles.directionLabels}>
          <Text tone="accent" variant="caption" weight="strong">
            ↑ {copy.front}
          </Text>
          <Text tone="muted" variant="caption">
            {copy.back} ↓
          </Text>
        </div>
        <ol aria-label={copy.layerList} className={styles.layerList}>
          {frontToBackLayers.map((layer, index) => {
            const name =
              layer.kind === 'bookmarks'
                ? copy.bookmarks
                : layer.kind === 'widget'
                  ? getWidgetName(layer, canvas, copy)
                  : layer.name;

            return (
              <li
                key={layer.id}
                className={styles.layerRow}
                data-drag-over={dragOverIndex === index || undefined}
                data-kind={layer.kind}
                draggable={!isMutating}
                onDragEnd={clearDragState}
                onDragLeave={() => setDragOverIndex(null)}
                onDragOver={(event) => handleDragOver(event, index)}
                onDragStart={() => setDragIndex(index)}
                onDrop={() => handleDrop(index)}
              >
                <div className={styles.layerDetails}>
                  <Text truncate variant="label" weight="strong">
                    {name}
                  </Text>
                  {layer.kind === 'bookmarks' ? (
                    <Text tone="muted" variant="caption">
                      {copy.bookmarksDescription}
                    </Text>
                  ) : null}
                </div>
                <div className={styles.rowActions}>
                  <IconButton
                    disabled={isMutating || index === 0}
                    label={copy.moveTowardFront(name)}
                    onClick={() => handleMove(index, -1)}
                    size="compact"
                    variant="quiet"
                  >
                    <span aria-hidden="true">↑</span>
                  </IconButton>
                  <IconButton
                    disabled={
                      isMutating || index === frontToBackLayers.length - 1
                    }
                    label={copy.moveTowardBack(name)}
                    onClick={() => handleMove(index, 1)}
                    size="compact"
                    variant="quiet"
                  >
                    <span aria-hidden="true">↓</span>
                  </IconButton>
                  {layer.kind === 'widget' ? (
                    <>
                      <IconButton
                        disabled={isMutating}
                        label={copy.configureWidget(name)}
                        onClick={() => onConfigureWidget(layer.id)}
                        size="compact"
                        variant="quiet"
                      >
                        <SettingsGlyph />
                      </IconButton>
                      <IconButton
                        disabled={isMutating}
                        label={copy.removeWidget(name)}
                        onClick={() => handleRemoveWidget(layer.id)}
                        size="compact"
                        variant="critical"
                      >
                        <span aria-hidden="true">×</span>
                      </IconButton>
                    </>
                  ) : null}
                  {layer.kind === 'decoration' ? (
                    <>
                      <IconButton
                        disabled={isMutating}
                        label={copy.moreActions(name)}
                        onClick={(event) =>
                          handleOpenImageActions(event, layer.id)
                        }
                        size="compact"
                        variant="quiet"
                      >
                        <span aria-hidden="true">…</span>
                      </IconButton>
                      <IconButton
                        disabled={isMutating}
                        label={copy.removeImage(name)}
                        onClick={() => handleRemoveImage(layer.id)}
                        size="compact"
                        variant="critical"
                      >
                        <span aria-hidden="true">×</span>
                      </IconButton>
                    </>
                  ) : null}
                  <span
                    aria-hidden="true"
                    className={styles.dragHandle}
                    title={copy.dragToReorder}
                  >
                    ⋮⋮
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
        <OverlayImageActionMenu controller={imageActions} />
      </Stack>
    </SettingsSection>
  );
}
