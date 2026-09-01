import { useEffect, useRef, useState, type ReactElement } from 'react';

import { useTranslation } from '../i18n';
import type { OverlayMotionPlaybackOverride } from '../overlays/OverlayImageStacks';
import { useOverlayMotionPolicy } from '../overlays/useOverlayMotionPolicy';
import type { BackgroundMedia } from '../settings/backgroundMedia';

type BackgroundLayerProps = {
  backgroundImage: string;
  blobUrl: string;
  isMediaMissing: boolean;
  media: BackgroundMedia | null;
};

function BackgroundVideo({ url }: { url: string }): ReactElement {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manualOverride, setManualOverride] = useState<
    OverlayMotionPlaybackOverride | undefined
  >();
  const playback = useOverlayMotionPolicy({
    manualOverride,
    playbackMode: 'active-tab-only',
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playback.isPaused) {
      video.pause();
      return;
    }

    try {
      void video.play().catch(() => undefined);
    } catch {
      return;
    }
  }, [playback.isPaused]);

  const showMotionControl =
    playback.reason === 'reduced-motion' || manualOverride !== undefined;

  return (
    <>
      <video
        ref={videoRef}
        aria-hidden="true"
        autoPlay={!playback.isPaused}
        className="starlit-background-media"
        data-motion-pause-reason={playback.reason ?? undefined}
        data-motion-paused={playback.isPaused}
        data-starlit-part="background-media"
        loop
        muted
        playsInline
        src={url}
      />
      {showMotionControl ? (
        <button
          className="starlit-background-motion-control"
          onClick={() =>
            setManualOverride(playback.isPaused ? 'play' : 'pause')
          }
          type="button"
        >
          {playback.isPaused
            ? t('background.motion.play')
            : t('background.motion.pause')}
        </button>
      ) : null}
    </>
  );
}

export function BackgroundLayer({
  backgroundImage,
  blobUrl,
  isMediaMissing,
  media,
}: BackgroundLayerProps): ReactElement | null {
  const mediaUrl = media?.source === 'url' ? media.url : blobUrl;

  if (!isMediaMissing && media?.type === 'video' && mediaUrl) {
    return <BackgroundVideo url={mediaUrl} />;
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
