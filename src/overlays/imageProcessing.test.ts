import { afterEach, describe, expect, it, vi } from 'vitest';

import { rasterizeOverlayImage } from './imageProcessing';

type TestImageEventHandler = ((event: Event) => void) | null;

class TestImage {
  naturalHeight = 2000;
  naturalWidth = 4000;
  onerror: TestImageEventHandler = null;
  onload: TestImageEventHandler = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.(new Event('load')));
  }
}

afterEach((): void => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('rasterizeOverlayImage', () => {
  it('rasterizes an image to a bounded WebP while preserving its ratio', async () => {
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

    expect(result).toEqual({ blob: outputBlob, height: 960, width: 1920 });
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(960);
    expect(drawImage).toHaveBeenCalledWith(
      expect.any(TestImage),
      0,
      0,
      1920,
      960,
    );
    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/webp',
      1,
    );
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
});
