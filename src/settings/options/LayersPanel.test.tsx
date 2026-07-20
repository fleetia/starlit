import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { OverlayImageLayer, OverlayScene } from '../../overlays/types';
import { LayersPanel, type LayersPanelCopy } from './LayersPanel';

const COPY: LayersPanelCopy = {
  addImages: 'Add images',
  back: 'Back',
  bookmarks: 'Bookmarks',
  bookmarksDescription: 'This layer cannot be removed.',
  description: 'Arrange images around the bookmark layer.',
  dragToReorder: 'Drag to reorder',
  editPositions: 'Edit positions',
  empty: 'No overlay images have been added.',
  fileDescription: 'Images are stored on this device.',
  front: 'Front',
  frontToBackDescription: 'Layers are shown from front to back.',
  layerList: 'Layer order',
  moveTowardBack: (name) => `Move ${name} toward back`,
  moveTowardFront: (name) => `Move ${name} toward front`,
  processing: 'Processing images',
  removeImage: (name) => `Remove ${name}`,
  title: 'Overlay layers',
};

const BACK_IMAGE: OverlayImageLayer = {
  anchor: 'bottom-left',
  height: 80,
  id: 'back-image',
  kind: 'image',
  name: 'Back image',
  offsetX: 20,
  offsetY: 24,
  rotationDeg: 0,
  width: 120,
};

const FRONT_IMAGE: OverlayImageLayer = {
  anchor: 'top-right',
  height: 90,
  id: 'front-image',
  kind: 'image',
  name: 'Front image',
  offsetX: 32,
  offsetY: 40,
  rotationDeg: 15,
  width: 160,
};

const SCENE: OverlayScene = {
  layers: [BACK_IMAGE, { kind: 'bookmarks' }, FRONT_IMAGE],
};

type RenderPanelOptions = {
  isProcessing?: boolean;
  onEditPositions?: () => void;
  onFilesSelected?: (files: File[]) => void;
  onSceneChange?: (scene: OverlayScene) => void;
  scene?: OverlayScene;
};

function renderPanel(
  options: RenderPanelOptions = {},
): ReturnType<typeof render> {
  return render(
    <LayersPanel
      copy={COPY}
      isProcessing={options.isProcessing ?? false}
      onEditPositions={options.onEditPositions ?? vi.fn()}
      onFilesSelected={options.onFilesSelected ?? vi.fn()}
      onSceneChange={options.onSceneChange ?? vi.fn()}
      scene={options.scene ?? SCENE}
    />,
  );
}

function getLayerNames(): string[] {
  return within(screen.getByRole('list', { name: COPY.layerList }))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('span')?.textContent ?? '');
}

describe('LayersPanel', () => {
  it('shows stored layers from front to back with one movable bookmark layer', () => {
    renderPanel();

    expect(getLayerNames()).toEqual([
      FRONT_IMAGE.name,
      COPY.bookmarks,
      BACK_IMAGE.name,
    ]);
    expect(screen.getByText(COPY.frontToBackDescription).textContent).toBe(
      COPY.frontToBackDescription,
    );
    expect(screen.getAllByRole('button', { name: /^Remove /u })).toHaveLength(
      2,
    );
    expect(
      screen.queryByRole('button', { name: `Remove ${COPY.bookmarks}` }),
    ).toBeNull();
  });

  it('passes every selected image file and clears the native input', () => {
    const onFilesSelected = vi.fn<(files: File[]) => void>();
    const { container } = renderPanel({ onFilesSelected });
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    const firstFile = new File(['first'], 'first.png', { type: 'image/png' });
    const secondFile = new File(['second'], 'second.webp', {
      type: 'image/webp',
    });

    if (!input) {
      throw new Error('Expected the image file input.');
    }

    expect(input.multiple).toBe(true);
    expect(input.accept).toBe('image/*');
    fireEvent.change(input, {
      target: { files: [firstFile, secondFile] },
    });

    expect(onFilesSelected).toHaveBeenCalledWith([firstFile, secondFile]);
    expect(input.value).toBe('');
  });

  it('moves the bookmark layer toward the front and returns stored order', () => {
    const onSceneChange = vi.fn<(scene: OverlayScene) => void>();
    renderPanel({ onSceneChange });

    fireEvent.click(
      screen.getByRole('button', {
        name: COPY.moveTowardFront(COPY.bookmarks),
      }),
    );

    expect(onSceneChange).toHaveBeenCalledWith({
      layers: [BACK_IMAGE, FRONT_IMAGE, { kind: 'bookmarks' }],
    });
  });

  it('reorders image and bookmark layers through HTML drag and drop', () => {
    const onSceneChange = vi.fn<(scene: OverlayScene) => void>();
    renderPanel({ onSceneChange });
    const rows = within(
      screen.getByRole('list', { name: COPY.layerList }),
    ).getAllByRole('listitem');
    const frontRow = rows[0];
    const backRow = rows[2];

    if (!frontRow || !backRow) {
      throw new Error('Expected front and back layer rows.');
    }

    fireEvent.dragStart(frontRow);
    fireEvent.dragOver(backRow);
    fireEvent.drop(backRow);

    expect(onSceneChange).toHaveBeenCalledWith({
      layers: [FRONT_IMAGE, BACK_IMAGE, { kind: 'bookmarks' }],
    });
  });

  it('removes only the selected image layer', () => {
    const onSceneChange = vi.fn<(scene: OverlayScene) => void>();
    renderPanel({ onSceneChange });

    fireEvent.click(
      screen.getByRole('button', { name: COPY.removeImage(FRONT_IMAGE.name) }),
    );

    expect(onSceneChange).toHaveBeenCalledWith({
      layers: [BACK_IMAGE, { kind: 'bookmarks' }],
    });
  });

  it('opens position editing when the scene has an image', () => {
    const onEditPositions = vi.fn<() => void>();
    renderPanel({ onEditPositions });

    fireEvent.click(screen.getByRole('button', { name: COPY.editPositions }));

    expect(onEditPositions).toHaveBeenCalledOnce();
  });

  it('explains an empty scene and keeps position editing disabled', () => {
    renderPanel({ scene: { layers: [{ kind: 'bookmarks' }] } });

    expect(screen.getByText(COPY.empty).textContent).toBe(COPY.empty);
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: COPY.editPositions,
      }).disabled,
    ).toBe(true);
  });

  it('disables mutations while files are processing', () => {
    renderPanel({ isProcessing: true });

    expect(screen.getByRole('status').textContent).toBe(COPY.processing);
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: COPY.addImages })
        .disabled,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: COPY.editPositions,
      }).disabled,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: COPY.removeImage(FRONT_IMAGE.name),
      }).disabled,
    ).toBe(true);
  });
});
