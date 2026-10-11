import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OverlayImageLayer, OverlayScene } from './types';
import {
  useOverlayImageActions,
  type OverlayImageActionsController,
  type OverlayImageMutation,
} from './useOverlayImageActions';

const mediaMocks = vi.hoisted(() => ({
  loadMediaBlob: vi.fn<(key: string) => Promise<Blob | null>>(),
}));

vi.mock('../platform/storage/mediaStorage', () => mediaMocks);

function createImage(id: string): OverlayImageLayer {
  return {
    anchor: 'top-left',
    height: 80,
    id,
    kind: 'image',
    name: `${id}.png`,
    offsetX: 20,
    offsetY: 24,
    rotationDeg: 15,
    width: 120,
  };
}

const BACK_IMAGE = createImage('back');
const FRONT_IMAGE = createImage('front');
const SCENE: OverlayScene = {
  layers: [BACK_IMAGE, { kind: 'bookmarks' }, FRONT_IMAGE],
};

type HarnessOptions = {
  onEditImage?: (imageId: string) => void;
  onError?: (error: Error | null) => void;
  onMutation?: (mutation: OverlayImageMutation) => Promise<void> | void;
  onPreparationRollback?: (ids: readonly string[]) => Promise<void>;
  prepareFiles?: (files: readonly File[]) => Promise<OverlayImageLayer[]>;
  scene?: OverlayScene;
};

function renderActions(
  options: HarnessOptions = {},
): RenderHookResult<OverlayImageActionsController, unknown> {
  return renderHook(() =>
    useOverlayImageActions({
      onEditImage: options.onEditImage ?? vi.fn(),
      onError: options.onError,
      onMotionPlaybackOverrideChange: vi.fn(),
      onMutation: options.onMutation ?? vi.fn(),
      onPreparationRollback:
        options.onPreparationRollback ?? vi.fn(async () => undefined),
      prepareFiles: options.prepareFiles ?? vi.fn(async () => []),
      scene: options.scene ?? SCENE,
    }),
  );
}

describe('useOverlayImageActions', () => {
  beforeEach(() => {
    mediaMocks.loadMediaBlob.mockResolvedValue(
      new Blob(['image'], { type: 'image/webp' }),
    );
  });

  it('applies visibility and full-stack ordering actions to the selected layer', async () => {
    const onMutation = vi.fn<(mutation: OverlayImageMutation) => Promise<void>>(
      async () => undefined,
    );
    const { result } = renderActions({ onMutation });

    act(() =>
      result.current.openMenu({ imageId: 'back', point: { x: 10, y: 20 } }),
    );
    await act(() => result.current.setHidden(true));
    await act(() => result.current.bringToFront());

    expect(onMutation.mock.calls[0]?.[0]).toEqual({
      preparedImageIds: [],
      removedImageIds: [],
      scene: {
        layers: [
          { ...BACK_IMAGE, hidden: true },
          { kind: 'bookmarks' },
          FRONT_IMAGE,
        ],
      },
    });
    expect(onMutation.mock.calls[1]?.[0].scene.layers.at(-1)).toEqual(
      BACK_IMAGE,
    );
  });

  it('opens editing for the menu target and closes the action menu', () => {
    const onEditImage = vi.fn<(imageId: string) => void>();
    const { result } = renderActions({ onEditImage });

    act(() =>
      result.current.openMenu({ imageId: 'front', point: { x: 10, y: 20 } }),
    );
    act(() => result.current.editImage());

    expect(onEditImage).toHaveBeenCalledOnce();
    expect(onEditImage).toHaveBeenCalledWith('front');
    expect(result.current.menuTarget).toBeNull();
  });

  it('duplicates stored media through preparation and offsets the copy', async () => {
    const prepared: OverlayImageLayer = {
      ...BACK_IMAGE,
      draftMediaKey: 'overlayImageDraft:session:copy',
      id: 'copy',
      name: 'back.png',
      offsetX: 0,
      offsetY: 0,
    };
    const prepareFiles = vi.fn<
      (files: readonly File[]) => Promise<OverlayImageLayer[]>
    >(async () => [prepared]);
    const onMutation = vi.fn<(mutation: OverlayImageMutation) => Promise<void>>(
      async () => undefined,
    );
    const { result } = renderActions({ onMutation, prepareFiles });

    act(() =>
      result.current.openMenu({ imageId: 'back', point: { x: 10, y: 20 } }),
    );
    await act(() => result.current.duplicateImage());

    expect(mediaMocks.loadMediaBlob).toHaveBeenCalledWith('overlayImage:back');
    expect(prepareFiles.mock.calls[0]?.[0][0]).toMatchObject({
      name: BACK_IMAGE.name,
      type: 'image/webp',
    });
    expect(onMutation).toHaveBeenCalledWith({
      preparedImageIds: ['copy'],
      removedImageIds: [],
      scene: {
        layers: [
          BACK_IMAGE,
          {
            ...BACK_IMAGE,
            draftMediaKey: prepared.draftMediaKey,
            id: 'copy',
            mediaKind: undefined,
            offsetX: 32,
            offsetY: 36,
          },
          { kind: 'bookmarks' },
          FRONT_IMAGE,
        ],
      },
    });
  });

  it('rolls prepared media back when persistence fails', async () => {
    const prepared = {
      ...BACK_IMAGE,
      draftMediaKey: 'overlayImageDraft:session:copy',
      id: 'copy',
    };
    const onError = vi.fn<(error: Error | null) => void>();
    const onPreparationRollback = vi.fn(async () => undefined);
    const { result } = renderActions({
      onError,
      onMutation: vi.fn(async () => {
        throw new Error('save failed');
      }),
      onPreparationRollback,
      prepareFiles: vi.fn(async () => [prepared]),
    });

    act(() =>
      result.current.openMenu({ imageId: 'back', point: { x: 10, y: 20 } }),
    );
    await act(() => result.current.duplicateImage());

    expect(onPreparationRollback).toHaveBeenCalledWith(['copy']);
    expect(onError).toHaveBeenLastCalledWith(new Error('save failed'));
  });
});
