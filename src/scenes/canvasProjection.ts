import type { OverlayScene } from '../overlays/types';

import {
  projectCanvasSceneToOverlayScene,
  projectOverlaySceneToCanvasScene,
} from './runtime';
import type { CanvasSceneV2 } from './types';

export function mergeCanvasWithOverlay(
  canvas: CanvasSceneV2,
  overlayScene: OverlayScene,
): CanvasSceneV2 {
  const projectedLayers = [
    ...projectOverlaySceneToCanvasScene(overlayScene).layers,
  ];
  const layers = canvas.layers.flatMap((layer) => {
    if (layer.kind === 'widget') return [layer];
    const replacement = projectedLayers.shift();
    return replacement ? [replacement] : [];
  });

  return { ...canvas, layers: [...layers, ...projectedLayers] };
}

export function projectCanvasSceneToStableOverlayScene(
  canvas: CanvasSceneV2,
  currentOverlayScene: OverlayScene,
): OverlayScene {
  const nextOverlayScene = projectCanvasSceneToOverlayScene(canvas);
  const normalizedCurrentOverlayScene = projectCanvasSceneToOverlayScene(
    projectOverlaySceneToCanvasScene(currentOverlayScene),
  );

  return JSON.stringify(nextOverlayScene) ===
    JSON.stringify(normalizedCurrentOverlayScene)
    ? currentOverlayScene
    : nextOverlayScene;
}
