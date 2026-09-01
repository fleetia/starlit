import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OverlayImageStacks } from './OverlayImageStacks';
import type { CanvasSceneV2 } from '../scenes';
import type { OverlayImageLayer, OverlayScene } from './types';

const mediaMocks = vi.hoisted(() => ({
  loadMedia: vi.fn<(key: string) => Promise<string | null>>(),
}));

vi.mock('../platform/storage/mediaStorage', () => mediaMocks);

function createImage(
  id: string,
  anchor: OverlayImageLayer['anchor'],
): OverlayImageLayer {
  return {
    anchor,
    height: 60,
    id,
    kind: 'image',
    name: id,
    offsetX: 12,
    offsetY: 18,
    rotationDeg: 30,
    width: 100,
  };
}

describe('OverlayImageStacks', () => {
  beforeEach(() => {
    mediaMocks.loadMedia.mockImplementation(async (key) => `blob:${key}`);
  });

  afterEach((): void => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders image layers on either side of the bookmark sentinel', async () => {
    const scene: OverlayScene = {
      layers: [
        createImage('behind', 'top-left'),
        { kind: 'bookmarks' },
        createImage('front', 'bottom-right'),
      ],
    };
    const { container } = render(<OverlayImageStacks scene={scene} />);

    await waitFor(() => {
      expect(container.querySelectorAll('img')).toHaveLength(2);
    });

    const below = container.querySelector<HTMLElement>(
      '[data-overlay-stack="below"]',
    );
    const above = container.querySelector<HTMLElement>(
      '[data-overlay-stack="above"]',
    );
    const behind = below?.querySelector<HTMLImageElement>(
      '[data-overlay-image-id="behind"]',
    );
    const front = above?.querySelector<HTMLImageElement>(
      '[data-overlay-image-id="front"]',
    );

    expect(below?.getAttribute('aria-hidden')).toBe('true');
    expect(above?.getAttribute('aria-hidden')).toBe('true');
    expect(below?.style.zIndex).toBe('1');
    expect(above?.style.zIndex).toBe('3');
    expect(behind?.alt).toBe('');
    expect(behind?.getAttribute('draggable')).toBe('false');
    expect(behind?.style.left).toBe('12px');
    expect(behind?.style.top).toBe('18px');
    expect(behind?.style.transformOrigin).toBe('top left');
    expect(front?.style.right).toBe('12px');
    expect(front?.style.bottom).toBe('18px');
    expect(front?.style.transformOrigin).toBe('bottom right');
    expect(mediaMocks.loadMedia).toHaveBeenCalledWith('overlayImage:behind');
    expect(mediaMocks.loadMedia).toHaveBeenCalledWith('overlayImage:front');
  });

  it('omits image elements whose media cannot be loaded', async () => {
    mediaMocks.loadMedia.mockResolvedValue(null);
    const scene: OverlayScene = {
      layers: [{ kind: 'bookmarks' }, createImage('missing', 'top-left')],
    };
    const { container } = render(<OverlayImageStacks scene={scene} />);

    await waitFor(() => {
      expect(mediaMocks.loadMedia).toHaveBeenCalledWith('overlayImage:missing');
    });

    expect(container.querySelector('img')).toBeNull();
  });

  it('does not load or render hidden image layers', () => {
    const hiddenImage = {
      ...createImage('hidden', 'top-left'),
      hidden: true,
    };
    const { container } = render(
      <OverlayImageStacks
        scene={{ layers: [{ kind: 'bookmarks' }, hiddenImage] }}
      />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(mediaMocks.loadMedia).not.toHaveBeenCalled();
  });

  it('loads prepared images from their draft media key', async () => {
    const draftImage = {
      ...createImage('draft', 'top-left'),
      draftMediaKey: 'overlayImageDraft:session-1:draft',
    };
    render(
      <OverlayImageStacks
        scene={{ layers: [{ kind: 'bookmarks' }, draftImage] }}
      />,
    );

    await waitFor(() => {
      expect(mediaMocks.loadMedia).toHaveBeenCalledWith(
        draftImage.draftMediaKey,
      );
    });
  });

  it('keeps loaded URLs across geometry changes', async () => {
    const image = createImage('stable', 'top-left');
    const { rerender } = render(
      <OverlayImageStacks scene={{ layers: [{ kind: 'bookmarks' }, image] }} />,
    );

    await waitFor(() => {
      expect(mediaMocks.loadMedia).toHaveBeenCalledTimes(1);
    });

    rerender(
      <OverlayImageStacks
        scene={{
          layers: [
            { kind: 'bookmarks' },
            { ...image, offsetX: image.offsetX + 20, rotationDeg: 45 },
          ],
        }}
      />,
    );
    expect(mediaMocks.loadMedia).toHaveBeenCalledTimes(1);

    rerender(
      <OverlayImageStacks scene={{ layers: [{ kind: 'bookmarks' }] }} />,
    );
    expect(mediaMocks.loadMedia).toHaveBeenCalledTimes(1);
  });

  it('keeps a pending shared URL when an image crosses the bookmark layer', async () => {
    let resolveMedia: ((url: string) => void) | undefined;
    const pendingMedia = new Promise<string>((resolve) => {
      resolveMedia = resolve;
    });
    mediaMocks.loadMedia.mockReturnValue(pendingMedia);
    const image = createImage('moving', 'top-left');
    const { container, rerender } = render(
      <OverlayImageStacks scene={{ layers: [image, { kind: 'bookmarks' }] }} />,
    );

    rerender(
      <OverlayImageStacks scene={{ layers: [{ kind: 'bookmarks' }, image] }} />,
    );
    resolveMedia?.('blob:overlayImage:moving');

    await waitFor(() => {
      expect(
        container.querySelector<HTMLImageElement>(
          '[data-overlay-stack="above"] [data-overlay-image-id="moving"]',
        )?.src,
      ).toContain('blob:overlayImage:moving');
    });
  });

  it('renders motion media as policy-controlled video at its playback rate', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        removeEventListener: vi.fn(),
      })),
    );
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined);
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => undefined);
    const motionImage = {
      ...createImage('motion', 'top-left'),
      mediaKind: 'motion' as const,
      playbackRate: 1.5 as const,
    };
    const { container, rerender } = render(
      <OverlayImageStacks
        motionPlaybackOverrides={{ motion: 'pause' }}
        scene={{ layers: [{ kind: 'bookmarks' }, motionImage] }}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('video')).not.toBeNull();
    });
    const video = container.querySelector<HTMLVideoElement>('video');
    expect(video?.dataset.motionPaused).toBe('true');
    expect(video?.dataset.motionPauseReason).toBe('manual');
    expect(video?.playbackRate).toBe(1.5);
    expect(pause).toHaveBeenCalled();
    expect(container.querySelector('img')).toBeNull();

    rerender(
      <OverlayImageStacks
        motionPlaybackOverrides={{ motion: 'play' }}
        scene={{ layers: [{ kind: 'bookmarks' }, motionImage] }}
      />,
    );
    await waitFor(() => {
      expect(video?.dataset.motionPaused).toBe('false');
      expect(play).toHaveBeenCalled();
    });
  });

  it('uses full Canvas indexes so decorations can interleave with widgets', async () => {
    const behind = createImage('behind', 'top-left');
    const front = createImage('front', 'bottom-right');
    const canvas: CanvasSceneV2 = {
      layers: [
        {
          anchor: behind.anchor,
          assetId: 'asset-behind',
          frame: {
            height: behind.height,
            offsetX: behind.offsetX,
            offsetY: behind.offsetY,
            width: behind.width,
          },
          id: behind.id,
          isHidden: false,
          isLocked: false,
          kind: 'decoration',
          mediaType: 'image',
          name: behind.name,
          playbackMode: 'active-tab-only',
          playbackRate: 1,
          rotationDeg: behind.rotationDeg,
          scale: 1,
        },
        {
          anchor: 'top-left',
          config: {
            appearance: 'digital',
            format: 'HH:mm',
            showSecondHand: true,
            timeZone: null,
          },
          frame: { height: 80, offsetX: 10, offsetY: 10, width: 120 },
          id: 'clock',
          isHidden: false,
          isLocked: false,
          kind: 'widget',
          widgetType: 'clock',
        },
        { id: 'bookmarks', kind: 'bookmarks' },
        {
          anchor: front.anchor,
          assetId: 'asset-front',
          frame: {
            height: front.height,
            offsetX: front.offsetX,
            offsetY: front.offsetY,
            width: front.width,
          },
          id: front.id,
          isHidden: false,
          isLocked: false,
          kind: 'decoration',
          mediaType: 'image',
          name: front.name,
          playbackMode: 'active-tab-only',
          playbackRate: 1,
          rotationDeg: front.rotationDeg,
          scale: 1,
        },
      ],
      version: 2,
    };
    const { container } = render(
      <OverlayImageStacks
        canvas={canvas}
        scene={{ layers: [behind, { kind: 'bookmarks' }, front] }}
      />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('img')).toHaveLength(2);
    });
    expect(
      container.querySelector('[data-overlay-image-id="behind"]')?.parentElement
        ?.style.zIndex,
    ).toBe('1');
    expect(
      container.querySelector('[data-overlay-image-id="front"]')?.parentElement
        ?.style.zIndex,
    ).toBe('4');
  });
});
