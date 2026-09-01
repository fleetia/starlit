import {
  MAX_OVERLAY_MEDIA_DIMENSION,
  MAX_OVERLAY_MEDIA_FILE_SIZE_BYTES,
} from './mediaProcessing';

export const MAX_OVERLAY_IMAGE_DIMENSION = MAX_OVERLAY_MEDIA_DIMENSION;

export type RasterizedOverlayImage = {
  blob: Blob;
  width: number;
  height: number;
};

export function rasterizeOverlayImage(
  file: File,
  maxDimension = MAX_OVERLAY_IMAGE_DIMENSION,
): Promise<RasterizedOverlayImage> {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('Overlay file must be an image.'));
  }

  if (file.size > MAX_OVERLAY_MEDIA_FILE_SIZE_BYTES) {
    return Promise.reject(
      new Error('Overlay image must be no larger than 20 MiB.'),
    );
  }

  if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
    return Promise.reject(
      new Error('Overlay image maximum dimension must be positive.'),
    );
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const sourceUrl = URL.createObjectURL(file);

    function rejectRasterization(error: Error): void {
      URL.revokeObjectURL(sourceUrl);
      reject(error);
    }

    image.onload = (): void => {
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;

      if (naturalWidth <= 0 || naturalHeight <= 0) {
        rejectRasterization(new Error('Overlay image has invalid dimensions.'));
        return;
      }
      if (naturalWidth > maxDimension || naturalHeight > maxDimension) {
        rejectRasterization(
          new Error(
            `Overlay image longest edge must be no larger than ${maxDimension} pixels.`,
          ),
        );
        return;
      }

      const size = { height: naturalHeight, width: naturalWidth };
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext('2d');

      if (!context) {
        rejectRasterization(new Error('Canvas context is unavailable.'));
        return;
      }

      try {
        context.drawImage(image, 0, 0, size.width, size.height);
      } catch {
        rejectRasterization(new Error('Overlay image could not be rendered.'));
        return;
      }

      try {
        canvas.toBlob(
          (blob): void => {
            URL.revokeObjectURL(sourceUrl);

            if (!blob) {
              reject(new Error('Overlay image could not be encoded.'));
              return;
            }

            resolve({ blob, ...size });
          },
          'image/webp',
          1,
        );
      } catch (error) {
        URL.revokeObjectURL(sourceUrl);
        reject(
          new Error('Overlay image could not be encoded.', { cause: error }),
        );
      }
    };
    image.onerror = (): void => {
      rejectRasterization(new Error('Overlay image could not be loaded.'));
    };
    image.src = sourceUrl;
  });
}
