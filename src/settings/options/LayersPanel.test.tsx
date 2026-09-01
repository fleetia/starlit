import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../i18n';
import type { OverlayMotionPlaybackOverride } from '../../overlays/OverlayImageStacks';
import type { OverlayImageLayer, OverlayScene } from '../../overlays/types';
import type { OverlayImageMutation } from '../../overlays/useOverlayImageActions';
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
  moreActions: (name) => `More actions: ${name}`,
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
  onEditPositions?: (imageId?: string) => void;
  onFilesSelected?: (files: File[]) => void;
  onImageAction?: (mutation: OverlayImageMutation) => Promise<void> | void;
  onImageActionError?: (error: Error | null) => void;
  onImageActionProcessingChange?: (isProcessing: boolean) => void;
  onImageFilesPrepare?: (
    files: readonly File[],
  ) => Promise<OverlayImageLayer[]>;
  onImagePreparationRollback?: (ids: readonly string[]) => Promise<void>;
  onMotionPlaybackOverrideChange?: (
    imageId: string,
    override: OverlayMotionPlaybackOverride,
  ) => void;
  onSceneChange?: (scene: OverlayScene) => void;
  scene?: OverlayScene;
};

function renderPanel(
  options: RenderPanelOptions = {},
): ReturnType<typeof render> {
  const onSceneChange = options.onSceneChange ?? vi.fn();
  return render(
    <I18nProvider locale="en">
      <LayersPanel
        copy={COPY}
        isProcessing={options.isProcessing ?? false}
        onEditPositions={options.onEditPositions ?? vi.fn()}
        onFilesSelected={options.onFilesSelected ?? vi.fn()}
        onImageAction={
          options.onImageAction ?? ((mutation) => onSceneChange(mutation.scene))
        }
        onImageActionError={options.onImageActionError ?? vi.fn()}
        onImageActionProcessingChange={
          options.onImageActionProcessingChange ?? vi.fn()
        }
        onImageFilesPrepare={
          options.onImageFilesPrepare ?? vi.fn(async () => [])
        }
        onImagePreparationRollback={
          options.onImagePreparationRollback ?? vi.fn(async () => undefined)
        }
        onMotionPlaybackOverrideChange={
          options.onMotionPlaybackOverrideChange ?? vi.fn()
        }
        onSceneChange={onSceneChange}
        scene={options.scene ?? SCENE}
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
    expect(input.accept).toBe('image/*,video/*,.gif');
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

  it('opens the shared row action menu and applies its scene mutation', async () => {
    const onImageAction = vi.fn<
      (mutation: OverlayImageMutation) => Promise<void>
    >(async () => undefined);
    renderPanel({ onImageAction });

    fireEvent.click(
      screen.getByRole('button', {
        name: COPY.moreActions(FRONT_IMAGE.name),
      }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hide' }));

    await waitFor(() => expect(onImageAction).toHaveBeenCalledOnce());
    expect(onImageAction.mock.calls[0]?.[0].scene).toEqual({
      layers: [
        BACK_IMAGE,
        { kind: 'bookmarks' },
        { ...FRONT_IMAGE, hidden: true },
      ],
    });
  });

  it('opens position editing when the scene has an image', () => {
    const onEditPositions = vi.fn<(imageId?: string) => void>();
    renderPanel({ onEditPositions });

    fireEvent.click(screen.getByRole('button', { name: COPY.editPositions }));

    expect(onEditPositions).toHaveBeenCalledOnce();
    expect(onEditPositions).toHaveBeenCalledWith();
  });

  it('opens the exact row image in the position editor', () => {
    const onEditPositions = vi.fn<(imageId?: string) => void>();
    renderPanel({ onEditPositions });

    fireEvent.click(
      screen.getByRole('button', {
        name: COPY.moreActions(FRONT_IMAGE.name),
      }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));

    expect(onEditPositions).toHaveBeenCalledOnce();
    expect(onEditPositions).toHaveBeenCalledWith(FRONT_IMAGE.id);
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
