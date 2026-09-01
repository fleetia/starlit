import { DEFAULT_OVERLAY_PLAYBACK_MODE } from './model';
import type { OverlayPlaybackMode } from './types';

export type OverlayMotionManualOverride = 'play' | 'pause' | null;

export type OverlayMotionPolicyState = {
  isTabActive: boolean;
  isTabVisible: boolean;
  manualOverride: OverlayMotionManualOverride;
  prefersReducedMotion: boolean;
};

export type OverlayMotionPolicyAction =
  | { type: 'manual-play' }
  | { type: 'manual-pause' }
  | { type: 'clear-manual-override' }
  | { isTabActive: boolean; type: 'active-tab-change' }
  | { isTabVisible: boolean; type: 'visibility-change' }
  | { prefersReducedMotion: boolean; type: 'reduced-motion-change' };

export type OverlayMotionPauseReason =
  | 'hidden-tab'
  | 'inactive-tab'
  | 'manual'
  | 'reduced-motion'
  | null;

export type OverlayMotionPlayback = {
  isPaused: boolean;
  reason: OverlayMotionPauseReason;
};

export function createOverlayMotionPolicyState(input: {
  isTabActive?: boolean;
  isTabVisible: boolean;
  manualOverride?: OverlayMotionManualOverride;
  prefersReducedMotion: boolean;
}): OverlayMotionPolicyState {
  return {
    isTabActive: input.isTabActive ?? true,
    isTabVisible: input.isTabVisible,
    manualOverride: input.manualOverride ?? null,
    prefersReducedMotion: input.prefersReducedMotion,
  };
}

export function reduceOverlayMotionPolicy(
  state: OverlayMotionPolicyState,
  action: OverlayMotionPolicyAction,
): OverlayMotionPolicyState {
  switch (action.type) {
    case 'manual-play':
      return { ...state, manualOverride: 'play' };
    case 'manual-pause':
      return { ...state, manualOverride: 'pause' };
    case 'clear-manual-override':
      return { ...state, manualOverride: null };
    case 'active-tab-change':
      return { ...state, isTabActive: action.isTabActive };
    case 'visibility-change':
      return { ...state, isTabVisible: action.isTabVisible };
    case 'reduced-motion-change':
      return {
        ...state,
        prefersReducedMotion: action.prefersReducedMotion,
      };
  }
}

export function getOverlayMotionPlayback(
  state: OverlayMotionPolicyState,
  playbackMode: OverlayPlaybackMode = DEFAULT_OVERLAY_PLAYBACK_MODE,
): OverlayMotionPlayback {
  if (!state.isTabVisible) {
    return { isPaused: true, reason: 'hidden-tab' };
  }

  if (playbackMode === 'active-tab-only' && !state.isTabActive) {
    return { isPaused: true, reason: 'inactive-tab' };
  }

  if (state.manualOverride === 'pause') {
    return { isPaused: true, reason: 'manual' };
  }

  if (state.manualOverride === 'play') {
    return { isPaused: false, reason: null };
  }

  if (state.prefersReducedMotion) {
    return { isPaused: true, reason: 'reduced-motion' };
  }

  return { isPaused: false, reason: null };
}
