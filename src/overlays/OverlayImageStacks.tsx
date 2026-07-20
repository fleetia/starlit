import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { loadMedia } from '../platform/storage/mediaStorage';
import { getOverlayMediaKey } from './model';
import { getOverlayImageStyle } from './geometry';
import type { OverlayImageLayer, OverlayScene } from './types';
import * as styles from './OverlayImageStacks.css';

type OverlayImageStacksProps = {
  scene: OverlayScene;
};

type ImageLayerStacks = {
  above: OverlayImageLayer[];
  below: OverlayImageLayer[];
};

function splitImageLayers(scene: OverlayScene): ImageLayerStacks {
  const bookmarkIndex = scene.layers.findIndex(
    (layer) => layer.kind === 'bookmarks',
  );
  const splitIndex = bookmarkIndex < 0 ? 0 : bookmarkIndex;

  return {
    above: scene.layers
      .slice(splitIndex + (bookmarkIndex < 0 ? 0 : 1))
      .filter((layer): layer is OverlayImageLayer => layer.kind === 'image'),
    below: scene.layers
      .slice(0, splitIndex)
      .filter((layer): layer is OverlayImageLayer => layer.kind === 'image'),
  };
}

type OverlayImageProps = {
  layer: OverlayImageLayer;
};

function OverlayImage({ layer }: OverlayImageProps): ReactElement | null {
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

function renderImages(layers: OverlayImageLayer[]): ReactElement[] {
  return layers.map((layer) => <OverlayImage key={layer.id} layer={layer} />);
}

export function OverlayImageStacks({
  scene,
}: OverlayImageStacksProps): ReactElement {
  const stacks = useMemo(() => splitImageLayers(scene), [scene]);

  return (
    <>
      <div
        aria-hidden="true"
        className={styles.compositor}
        data-overlay-stack="below"
        data-starlit-part="overlay-images-below"
        style={{ zIndex: 0 }}
      >
        {renderImages(stacks.below)}
      </div>
      <div
        aria-hidden="true"
        className={styles.compositor}
        data-overlay-stack="above"
        data-starlit-part="overlay-images-above"
        style={{ zIndex: 2 }}
      >
        {renderImages(stacks.above)}
      </div>
    </>
  );
}
