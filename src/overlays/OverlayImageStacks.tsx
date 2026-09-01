import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';

import { loadMedia } from '../platform/storage/mediaStorage';
import { getOverlayImageStyle } from './geometry';
import {
  getOverlayImageMediaKind,
  getOverlayImagePlaybackMode,
  getOverlayImagePlaybackRate,
  getOverlayMediaKey,
  isOverlayImageHidden,
} from './model';
import type { OverlayMotionManualOverride } from './motionPolicy';
import type { CanvasSceneV2 } from '../scenes';
import type { OverlayImageLayer, OverlayScene } from './types';
import { useOverlayMotionPolicy } from './useOverlayMotionPolicy';
import * as styles from './OverlayImageStacks.css';

export type OverlayMotionPlaybackOverride = Exclude<
  OverlayMotionManualOverride,
  null
>;

export type OverlayImageStacksProps = {
  canvas?: CanvasSceneV2 | null;
  motionPlaybackOverrides?: Readonly<
    Partial<Record<string, OverlayMotionPlaybackOverride>>
  >;
  scene: OverlayScene;
};

type PositionedImageLayer = {
  layer: OverlayImageLayer;
  stack: 'above' | 'below';
  zIndex: number;
};

function getPositionedImageLayers(
  scene: OverlayScene,
  canvas: CanvasSceneV2 | null | undefined,
): PositionedImageLayer[] {
  const sceneBookmarkIndex = scene.layers.findIndex(
    (layer) => layer.kind === 'bookmarks',
  );
  const canvasBookmarkIndex =
    canvas?.layers.findIndex((layer) => layer.kind === 'bookmarks') ?? -1;
  const canvasIndexes = new Map(
    canvas?.layers.flatMap((layer, index) =>
      layer.kind === 'decoration' ? [[layer.id, index] as const] : [],
    ) ?? [],
  );

  return scene.layers.flatMap((layer, sceneIndex): PositionedImageLayer[] => {
    if (layer.kind !== 'image' || isOverlayImageHidden(layer)) return [];
    const canvasIndex = canvasIndexes.get(layer.id);
    const index = canvasIndex ?? sceneIndex;
    const bookmarkIndex =
      canvasIndex === undefined ? sceneBookmarkIndex : canvasBookmarkIndex;
    return [
      {
        layer,
        stack: index > bookmarkIndex ? 'above' : 'below',
        zIndex: index + 1,
      },
    ];
  });
}

type OverlayImageProps = {
  layer: OverlayImageLayer;
  motionPlaybackOverride?: OverlayMotionPlaybackOverride;
};

type OverlayMotionProps = {
  layer: OverlayImageLayer;
  motionPlaybackOverride?: OverlayMotionPlaybackOverride;
  src: string;
};

function OverlayMotion({
  layer,
  motionPlaybackOverride,
  src,
}: OverlayMotionProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRate = getOverlayImagePlaybackRate(layer);
  const playback = useOverlayMotionPolicy({
    manualOverride: motionPlaybackOverride,
    playbackMode: getOverlayImagePlaybackMode(layer),
  });

  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.defaultPlaybackRate = playbackRate;
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

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

  return (
    <video
      ref={videoRef}
      autoPlay={!playback.isPaused}
      className={styles.image}
      data-motion-pause-reason={playback.reason ?? undefined}
      data-motion-paused={playback.isPaused}
      data-overlay-image-id={layer.id}
      data-starlit-part="overlay-motion"
      draggable={false}
      loop
      muted
      playsInline
      preload="auto"
      src={src}
      style={getOverlayImageStyle(layer)}
    />
  );
}

function OverlayImage({
  layer,
  motionPlaybackOverride,
}: OverlayImageProps): ReactElement | null {
  const [src, setSrc] = useState<string | null>(null);
  const mediaKey = layer.draftMediaKey ?? getOverlayMediaKey(layer.id);

  useEffect(() => {
    let isActive = true;

    void loadMedia(mediaKey).then(
      (url) => {
        if (!isActive) {
          return;
        }

        setSrc(url);
      },
      () => {
        if (isActive) {
          setSrc(null);
        }
      },
    );

    return () => {
      isActive = false;
    };
  }, [mediaKey]);

  if (!src) {
    return null;
  }

  if (getOverlayImageMediaKind(layer) === 'motion') {
    return (
      <OverlayMotion
        layer={layer}
        motionPlaybackOverride={motionPlaybackOverride}
        src={src}
      />
    );
  }

  return (
    <img
      alt=""
      className={styles.image}
      data-overlay-image-id={layer.id}
      data-starlit-part="overlay-image"
      draggable={false}
      src={src}
      style={getOverlayImageStyle(layer)}
    />
  );
}

function renderImageLayers(
  layers: readonly PositionedImageLayer[],
  motionPlaybackOverrides: OverlayImageStacksProps['motionPlaybackOverrides'],
): ReactElement[] {
  return layers.map(({ layer, stack, zIndex }) => (
    <div
      key={layer.id}
      aria-hidden="true"
      className={styles.compositor}
      data-overlay-stack={stack}
      data-starlit-part={`overlay-images-${stack}`}
      style={{ zIndex }}
    >
      <OverlayImage
        layer={layer}
        motionPlaybackOverride={motionPlaybackOverrides?.[layer.id]}
      />
    </div>
  ));
}

export function OverlayImageStacks({
  canvas,
  motionPlaybackOverrides,
  scene,
}: OverlayImageStacksProps): ReactElement {
  const layers = useMemo(
    () => getPositionedImageLayers(scene, canvas),
    [canvas, scene],
  );

  return <>{renderImageLayers(layers, motionPlaybackOverrides)}</>;
}
