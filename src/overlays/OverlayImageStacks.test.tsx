import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OverlayImageStacks } from './OverlayImageStacks';
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
    expect(below?.style.zIndex).toBe('0');
    expect(above?.style.zIndex).toBe('2');
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
});
