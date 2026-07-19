import type { ReactElement } from 'react';

import type { BackgroundMedia } from '../settings/backgroundMedia';

type BackgroundLayerProps = {
  backgroundImage: string;
  blobUrl: string;
  isMediaMissing: boolean;
  media: BackgroundMedia | null;
};

export function BackgroundLayer({
  backgroundImage,
  blobUrl,
  isMediaMissing,
  media,
}: BackgroundLayerProps): ReactElement | null {
  const mediaUrl = media?.source === 'url' ? media.url : blobUrl;

  if (!isMediaMissing && media?.type === 'video' && mediaUrl) {
    return (
      <video
        aria-hidden="true"
        autoPlay
        className="starlit-background-media"
        data-starlit-part="background-media"
        loop
        muted
        playsInline
        src={mediaUrl}
      />
    );
  }

  if (backgroundImage === 'none') {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="starlit-background-image"
      data-starlit-part="background-media"
    />
  );
}
