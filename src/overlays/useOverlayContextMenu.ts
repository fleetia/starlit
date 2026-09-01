import { useEffect } from 'react';

import { hitTestOverlayImages } from './canvasInteractions';
import type { OverlayScene } from './types';

const UI_OVERLAY_SELECTOR =
  'dialog, [role="dialog"], [role="alertdialog"], [role="menu"]';

export type OverlayContextTarget = {
  clientX: number;
  clientY: number;
  imageId: string;
};

export type UseOverlayContextMenuOptions = {
  isEnabled?: boolean;
  onTarget: (target: OverlayContextTarget) => void;
  scene: OverlayScene;
};

export function useOverlayContextMenu({
  isEnabled = true,
  onTarget,
  scene,
}: UseOverlayContextMenuOptions): void {
  useEffect(() => {
    function handleContextMenu(event: MouseEvent): void {
      if (!isEnabled) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(UI_OVERLAY_SELECTOR) !== null
      ) {
        return;
      }
      const image = hitTestOverlayImages(
        scene,
        { x: event.clientX, y: event.clientY },
        { height: window.innerHeight, width: window.innerWidth },
      );
      if (!image) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onTarget({
        clientX: event.clientX,
        clientY: event.clientY,
        imageId: image.id,
      });
    }

    document.addEventListener('contextmenu', handleContextMenu, true);
    return () =>
      document.removeEventListener('contextmenu', handleContextMenu, true);
  }, [isEnabled, onTarget, scene]);
}
