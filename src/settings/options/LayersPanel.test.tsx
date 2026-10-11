import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../i18n';
import type { OverlayScene } from '../../overlays/types';
import type { CanvasSceneV2 } from '../../scenes';
import { LayersPanel, type LayersPanelCopy } from './LayersPanel';

const COPY: LayersPanelCopy = {
  addImages: 'Add images',
  back: 'Back',
  bookmarks: 'Bookmarks',
  bookmarksDescription: 'This layer cannot be removed.',
  calendar: 'Calendar',
  clock: 'Clock',
  configureWidget: (name) => `Configure ${name}`,
  description: 'Arrange all Canvas layers.',
  dragToReorder: 'Drag to reorder',
  editPositions: 'Edit positions',
  empty: 'No widgets have been added.',
  fileDescription: 'Images are stored on this device.',
  front: 'Front',
  frontToBackDescription: 'Layers are shown from front to back.',
  layerList: 'Layer order',
  moveTowardBack: (name) => `Move ${name} toward back`,
  moveTowardFront: (name) => `Move ${name} toward front`,
  moreActions: (name) => `More actions: ${name}`,
  processing: 'Processing images',
  removeImage: (name) => `Remove ${name}`,
  removeWidget: (name) => `Remove ${name}`,
  title: 'Canvas layers',
};

const CANVAS: CanvasSceneV2 = {
  layers: [
    { id: 'bookmarks', kind: 'bookmarks' },
    {
      anchor: 'top-left',
      config: {
        appearance: 'digital',
        format: 'HH:mm',
        showSecondHand: true,
        timeZone: null,
      },
      frame: { height: 80, offsetX: 10, offsetY: 10, width: 160 },
      id: 'clock-1',
      isHidden: false,
      isLocked: false,
      kind: 'widget',
      widgetType: 'clock',
    },
    {
      anchor: 'top-right',
      config: {
        appearance: 'analog',
        format: 'HH:mm',
        showSecondHand: false,
        timeZone: null,
      },
      frame: { height: 160, offsetX: 10, offsetY: 10, width: 160 },
      id: 'clock-2',
      isHidden: false,
      isLocked: false,
      kind: 'widget',
      widgetType: 'clock',
    },
  ],
  version: 2,
};

const OVERLAY_SCENE: OverlayScene = { layers: [{ kind: 'bookmarks' }] };

function renderPanel({
  onCanvasChange = vi.fn(),
  onConfigureWidget = vi.fn(),
}: {
  onCanvasChange?: (canvas: CanvasSceneV2) => void;
  onConfigureWidget?: (widgetId: string) => void;
} = {}): void {
  render(
    <I18nProvider locale="en">
      <LayersPanel
        canvas={CANVAS}
        copy={COPY}
        isProcessing={false}
        onCanvasChange={onCanvasChange}
        onConfigureWidget={onConfigureWidget}
        onEditPositions={vi.fn()}
        onFilesSelected={vi.fn()}
        onImageAction={vi.fn()}
        onImageActionError={vi.fn()}
        onImageActionProcessingChange={vi.fn()}
        onImageFilesPrepare={vi.fn(async () => [])}
        onImagePreparationRollback={vi.fn(async () => undefined)}
        onMotionPlaybackOverrideChange={vi.fn()}
        onSceneChange={vi.fn()}
        scene={OVERLAY_SCENE}
      />
    </I18nProvider>,
  );
}

function getLayerNames(): string[] {
  return within(screen.getByRole('list', { name: COPY.layerList }))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('span')?.textContent ?? '');
}

describe('LayersPanel', () => {
  it('shows all Canvas layers from front to back with stable ordinals', () => {
    renderPanel();
    expect(getLayerNames()).toEqual(['Clock 2', 'Clock 1', 'Bookmarks']);
  });

  it('opens the selected widget editor from the gear action', () => {
    const onConfigureWidget = vi.fn<(widgetId: string) => void>();
    renderPanel({ onConfigureWidget });

    fireEvent.click(screen.getByRole('button', { name: 'Configure Clock 2' }));
    expect(onConfigureWidget).toHaveBeenCalledWith('clock-2');
  });

  it('reorders and removes widget instances in the Canvas model', () => {
    const onCanvasChange = vi.fn<(canvas: CanvasSceneV2) => void>();
    renderPanel({ onCanvasChange });

    fireEvent.click(
      screen.getByRole('button', { name: 'Move Clock 2 toward back' }),
    );
    expect(onCanvasChange).toHaveBeenLastCalledWith({
      ...CANVAS,
      layers: [CANVAS.layers[0], CANVAS.layers[2], CANVAS.layers[1]],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove Clock 2' }));
    expect(onCanvasChange).toHaveBeenLastCalledWith({
      ...CANVAS,
      layers: [CANVAS.layers[0], CANVAS.layers[1]],
    });
  });
});
