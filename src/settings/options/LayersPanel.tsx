import type { ChangeEvent, DragEvent, ReactElement } from 'react';
import { useRef, useState } from 'react';
import { Button, IconButton, Inline, Stack, Text } from '@fleetia/lagrange';

import type {
  OverlayImageLayer,
  OverlayLayer,
  OverlayScene,
} from '../../overlays/types';
import { SettingsSection } from './controls';
import * as styles from './LayersPanel.css';

export type LayersPanelCopy = {
  addImages: string;
  back: string;
  bookmarks: string;
  bookmarksDescription: string;
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
  processing: string;
  removeImage: (name: string) => string;
  title: string;
};

export type LayersPanelProps = {
  copy: LayersPanelCopy;
  isProcessing: boolean;
  onEditPositions: () => void;
  onFilesSelected: (files: File[]) => void;
  onSceneChange: (scene: OverlayScene) => void;
  scene: OverlayScene;
};

function moveLayer(
  layers: OverlayLayer[],
  fromIndex: number,
  toIndex: number,
): OverlayLayer[] {
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
  if (!layer) {
    return layers;
  }

  const reorderedLayers = [...layers];
  reorderedLayers.splice(fromIndex, 1);
  reorderedLayers.splice(toIndex, 0, layer);
  return reorderedLayers;
}

function toFrontToBack(layers: OverlayLayer[]): OverlayLayer[] {
  return [...layers].reverse();
}

function toStoredScene(frontToBackLayers: OverlayLayer[]): OverlayScene {
  return { layers: [...frontToBackLayers].reverse() };
}

export function LayersPanel({
  copy,
  isProcessing,
  onEditPositions,
  onFilesSelected,
  onSceneChange,
  scene,
}: LayersPanelProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const frontToBackLayers = toFrontToBack(scene.layers);
  const hasImages = scene.layers.some((layer) => layer.kind === 'image');

  function clearDragState(): void {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function updateLayerOrder(nextFrontToBackLayers: OverlayLayer[]): void {
    onSceneChange(toStoredScene(nextFrontToBackLayers));
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';

    if (files.length > 0) {
      onFilesSelected(files);
    }
  }

  function handleMove(index: number, offset: -1 | 1): void {
    const nextIndex = index + offset;
    const nextLayers = moveLayer(frontToBackLayers, index, nextIndex);

    if (nextLayers !== frontToBackLayers) {
      updateLayerOrder(nextLayers);
    }
  }

  function handleDragOver(
    event: DragEvent<HTMLLIElement>,
    index: number,
  ): void {
    if (isProcessing) {
      return;
    }

    event.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(toIndex: number): void {
    if (isProcessing) {
      clearDragState();
      return;
    }

    if (dragIndex !== null) {
      const nextLayers = moveLayer(frontToBackLayers, dragIndex, toIndex);

      if (nextLayers !== frontToBackLayers) {
        updateLayerOrder(nextLayers);
      }
    }

    clearDragState();
  }

  function handleRemove(image: OverlayImageLayer): void {
    onSceneChange({
      layers: scene.layers.filter(
        (layer) => layer.kind !== 'image' || layer.id !== image.id,
      ),
    });
  }

  return (
    <SettingsSection description={copy.description} title={copy.title}>
      <Stack gap="md">
        <Inline align="center" gap="sm" wrap>
          <Button
            disabled={isProcessing}
            isPending={isProcessing}
            onClick={() => inputRef.current?.click()}
            size="compact"
            variant="secondary"
          >
            {copy.addImages}
          </Button>
          <Button
            disabled={isProcessing || !hasImages}
            onClick={onEditPositions}
            size="compact"
          >
            {copy.editPositions}
          </Button>
          {isProcessing ? (
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
        <input
          ref={inputRef}
          accept="image/*"
          aria-label={copy.addImages}
          className={styles.hiddenInput}
          disabled={isProcessing}
          multiple
          onChange={handleFilesSelected}
          type="file"
        />
        <Text as="p" tone="muted" variant="caption">
          {copy.fileDescription}
        </Text>
        {!hasImages ? (
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
              layer.kind === 'bookmarks' ? copy.bookmarks : layer.name;

            return (
              <li
                key={layer.kind === 'bookmarks' ? 'bookmarks' : layer.id}
                className={styles.layerRow}
                data-drag-over={dragOverIndex === index || undefined}
                data-kind={layer.kind}
                draggable={!isProcessing}
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
                    disabled={isProcessing || index === 0}
                    label={copy.moveTowardFront(name)}
                    onClick={() => handleMove(index, -1)}
                    size="compact"
                    variant="quiet"
                  >
                    <span aria-hidden="true">↑</span>
                  </IconButton>
                  <IconButton
                    disabled={
                      isProcessing || index === frontToBackLayers.length - 1
                    }
                    label={copy.moveTowardBack(name)}
                    onClick={() => handleMove(index, 1)}
                    size="compact"
                    variant="quiet"
                  >
                    <span aria-hidden="true">↓</span>
                  </IconButton>
                  {layer.kind === 'image' ? (
                    <IconButton
                      disabled={isProcessing}
                      label={copy.removeImage(name)}
                      onClick={() => handleRemove(layer)}
                      size="compact"
                      variant="critical"
                    >
                      <span aria-hidden="true">×</span>
                    </IconButton>
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
      </Stack>
    </SettingsSection>
  );
}
