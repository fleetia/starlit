import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rasterizeOverlayImage } from './imageProcessing';

type TestImageEventHandler = ((event: Event) => void) | null;

let naturalHeight = 1080;
let naturalWidth = 1920;

class TestImage {
  naturalHeight = naturalHeight;
  naturalWidth = naturalWidth;
  onerror: TestImageEventHandler = null;
  onload: TestImageEventHandler = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.(new Event('load')));
  }
}

beforeEach((): void => {
  naturalHeight = 1080;
  naturalWidth = 1920;
});

afterEach((): void => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('rasterizeOverlayImage', () => {
  it('rasterizes an image at the exact dimension limit to WebP', async () => {
    const outputBlob = new Blob(['webp'], { type: 'image/webp' });
    const drawImage = vi.fn();
    const canvas = {
      getContext: vi.fn(() => ({ drawImage })),
      height: 0,
      toBlob: vi.fn((callback: BlobCallback) => callback(outputBlob)),
      width: 0,
    } as unknown as HTMLCanvasElement;
    vi.stubGlobal('Image', TestImage);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:source');
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    vi.spyOn(document, 'createElement').mockReturnValue(canvas);
    const file = new File(['image'], 'stars.png', { type: 'image/png' });

    const result = await rasterizeOverlayImage(file);

    expect(result).toEqual({ blob: outputBlob, height: 1080, width: 1920 });
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
    expect(drawImage).toHaveBeenCalledWith(
      expect.any(TestImage),
      0,
      0,
      1920,
      1080,
    );
    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/webp',
      1,
    );
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:source');
  });

  it('rejects an original image over 1920 pixels before allocating a canvas', async () => {
    naturalWidth = 1921;
    vi.stubGlobal('Image', TestImage);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:source');
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const createElement = vi.spyOn(document, 'createElement');
    const file = new File(['image'], 'too-wide.png', { type: 'image/png' });

    await expect(rasterizeOverlayImage(file)).rejects.toThrow('1920 pixels');

    expect(createElement).not.toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:source');
  });

  it('rejects non-image files before allocating an object URL', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' });

    await expect(rasterizeOverlayImage(file)).rejects.toThrow(
      'must be an image',
    );
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects images larger than 20 MiB before allocating an object URL', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const file = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.png', {
      type: 'image/png',
    });

    await expect(rasterizeOverlayImage(file)).rejects.toThrow('20 MiB');
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
