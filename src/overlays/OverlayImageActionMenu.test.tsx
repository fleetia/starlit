import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../i18n';
import { OverlayImageActionMenu } from './OverlayImageActionMenu';
import type { OverlayImageLayer, OverlayScene } from './types';
import {
  useOverlayImageActions,
  type OverlayImageMutation,
} from './useOverlayImageActions';

const MOTION_IMAGE: OverlayImageLayer = {
  anchor: 'bottom-right',
  height: 90,
  hidden: true,
  id: 'motion',
  kind: 'image',
  locked: true,
  mediaKind: 'motion',
  name: 'motion.webm',
  offsetX: 30,
  offsetY: 36,
  playbackRate: 1.5,
  rotationDeg: 20,
  width: 160,
};

const SCENE: OverlayScene = {
  layers: [{ kind: 'bookmarks' }, MOTION_IMAGE],
};

type HarnessProps = {
  onEditImage: (imageId: string) => void;
  onMotionOverride: (imageId: string, override: 'pause' | 'play') => void;
  onMutation: (mutation: OverlayImageMutation) => Promise<void>;
  prepareFiles: (files: readonly File[]) => Promise<OverlayImageLayer[]>;
};

function Harness({
  onEditImage,
  onMotionOverride,
  onMutation,
  prepareFiles,
}: HarnessProps): ReactElement {
  const controller = useOverlayImageActions({
    onEditImage,
    onMotionPlaybackOverrideChange: onMotionOverride,
    onMutation,
    onPreparationRollback: vi.fn(async () => undefined),
    prepareFiles,
    scene: SCENE,
  });

  return (
    <>
      <button
        onClick={() =>
          controller.openMenu({ imageId: 'motion', point: { x: 20, y: 24 } })
        }
        type="button"
      >
        Open actions
      </button>
      <OverlayImageActionMenu controller={controller} />
    </>
  );
}

describe('OverlayImageActionMenu', () => {
  it('exposes the complete contextual action set and session motion controls', () => {
    const onMotionOverride = vi.fn();
    render(
      <I18nProvider locale="en">
        <Harness
          onEditImage={vi.fn()}
          onMotionOverride={onMotionOverride}
          onMutation={vi.fn(async () => undefined)}
          prepareFiles={vi.fn(async () => [])}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open actions' }));

    [
      'Edit',
      'Show',
      'Unlock',
      'Play for this session',
      'Pause for this session',
      'Duplicate',
      'Replace',
      'Move forward',
      'Move backward',
      'Bring to front',
      'Send to back',
      'Remove image',
    ].forEach((name) =>
      expect(screen.getByRole('menuitem', { name })).not.toBeNull(),
    );

    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Play for this session' }),
    );
    expect(onMotionOverride).toHaveBeenCalledWith('motion', 'play');
  });

  it('opens editing for the exact contextual image', () => {
    const onEditImage = vi.fn<(imageId: string) => void>();
    render(
      <I18nProvider locale="en">
        <Harness
          onEditImage={onEditImage}
          onMotionOverride={vi.fn()}
          onMutation={vi.fn(async () => undefined)}
          prepareFiles={vi.fn(async () => [])}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));

    expect(onEditImage).toHaveBeenCalledOnce();
    expect(onEditImage).toHaveBeenCalledWith('motion');
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).toBeNull();
  });

  it('replaces media while retaining the selected layer layout', async () => {
    const replacement: OverlayImageLayer = {
      anchor: 'top-left',
      draftMediaKey: 'overlayImageDraft:session:replacement',
      height: 240,
      id: 'replacement',
      kind: 'image',
      name: 'replacement.png',
      offsetX: 0,
      offsetY: 0,
      rotationDeg: 0,
      width: 320,
    };
    const onMutation = vi.fn<(mutation: OverlayImageMutation) => Promise<void>>(
      async () => undefined,
    );
    render(
      <I18nProvider locale="en">
        <Harness
          onEditImage={vi.fn()}
          onMotionOverride={vi.fn()}
          onMutation={onMutation}
          prepareFiles={vi.fn(async () => [replacement])}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Replace' }));
    fireEvent.change(screen.getByLabelText('Replace'), {
      target: {
        files: [new File(['replacement'], 'replacement.png')],
      },
    });

    await waitFor(() => expect(onMutation).toHaveBeenCalledOnce());
    expect(onMutation).toHaveBeenCalledWith({
      preparedImageIds: ['replacement'],
      removedImageIds: ['motion'],
      scene: {
        layers: [
          { kind: 'bookmarks' },
          {
            ...MOTION_IMAGE,
            draftMediaKey: replacement.draftMediaKey,
            id: 'replacement',
            mediaKind: undefined,
            name: replacement.name,
          },
        ],
      },
    });
  });
});
