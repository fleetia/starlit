import type { Placement } from './types';

const POSITION_MAP: Record<Placement, string> = {
  'top-left': 'start start',
  'top-center': 'start center',
  'top-right': 'start end',
  'center-left': 'center start',
  'center-center': 'center center',
  'center-right': 'center end',
  'bottom-left': 'end start',
  'bottom-center': 'end center',
  'bottom-right': 'end end',
};

export function positionToPlaceSelf(position: Placement): string {
  return POSITION_MAP[position] ?? POSITION_MAP['center-center'];
}
