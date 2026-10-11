import { useCallback, useEffect, useReducer } from 'react';

import {
  createOverlayMotionPolicyState,
  getOverlayMotionPlayback,
  reduceOverlayMotionPolicy,
  type OverlayMotionManualOverride,
  type OverlayMotionPauseReason,
} from './motionPolicy';
import type { OverlayPlaybackMode } from './types';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export type UseOverlayMotionPolicyOptions = {
  manualOverride?: OverlayMotionManualOverride;
  playbackMode?: OverlayPlaybackMode;
};

export type UseOverlayMotionPolicyReturn = {
  clearManualOverride: () => void;
  isPaused: boolean;
  pause: () => void;
  play: () => void;
  reason: OverlayMotionPauseReason;
};

function createInitialMotionPolicyState(
  manualOverride?: OverlayMotionManualOverride,
): ReturnType<typeof createOverlayMotionPolicyState> {
  return createOverlayMotionPolicyState({
    isTabActive: document.hasFocus(),
    isTabVisible: document.visibilityState === 'visible',
    manualOverride,
    prefersReducedMotion: window.matchMedia(REDUCED_MOTION_QUERY).matches,
  });
}

export function useOverlayMotionPolicy(
  options: UseOverlayMotionPolicyOptions = {},
): UseOverlayMotionPolicyReturn {
  const [state, dispatch] = useReducer(
    reduceOverlayMotionPolicy,
    undefined,
    () => createInitialMotionPolicyState(options.manualOverride),
  );

  useEffect(() => {
    if (options.manualOverride === 'play') {
      dispatch({ type: 'manual-play' });
      return;
    }

    if (options.manualOverride === 'pause') {
      dispatch({ type: 'manual-pause' });
      return;
    }

    dispatch({ type: 'clear-manual-override' });
  }, [options.manualOverride]);

  useEffect(() => {
    function handleFocus(): void {
      dispatch({ isTabActive: true, type: 'active-tab-change' });
    }

    function handleBlur(): void {
      dispatch({ isTabActive: false, type: 'active-tab-change' });
    }

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    function handleVisibilityChange(): void {
      dispatch({
        isTabVisible: document.visibilityState === 'visible',
        type: 'visibility-change',
      });
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    function handleReducedMotionChange(event: MediaQueryListEvent): void {
      dispatch({
        prefersReducedMotion: event.matches,
        type: 'reduced-motion-change',
      });
    }

    mediaQuery.addEventListener('change', handleReducedMotionChange);
    return () =>
      mediaQuery.removeEventListener('change', handleReducedMotionChange);
  }, []);

  const play = useCallback((): void => {
    dispatch({ type: 'manual-play' });
  }, []);
  const pause = useCallback((): void => {
    dispatch({ type: 'manual-pause' });
  }, []);
  const clearManualOverride = useCallback((): void => {
    dispatch({ type: 'clear-manual-override' });
  }, []);
  const playback = getOverlayMotionPlayback(state, options.playbackMode);

  return {
    clearManualOverride,
    isPaused: playback.isPaused,
    pause,
    play,
    reason: playback.reason,
  };
}
