import type { ReactElement } from 'react';

import {
  useOverlayContextMenu,
  type OverlayContextTarget,
} from './useOverlayContextMenu';
import type { OverlayScene } from './types';

export type OverlayContextMenuListenerProps = {
  isEnabled?: boolean;
  onTarget: (target: OverlayContextTarget) => void;
  scene: OverlayScene;
};

export function OverlayContextMenuListener({
  isEnabled,
  onTarget,
  scene,
}: OverlayContextMenuListenerProps): ReactElement | null {
  useOverlayContextMenu({ isEnabled, onTarget, scene });
  return null;
}
