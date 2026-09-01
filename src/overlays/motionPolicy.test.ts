import { describe, expect, it } from 'vitest';

import {
  createOverlayMotionPolicyState,
  getOverlayMotionPlayback,
  reduceOverlayMotionPolicy,
} from './motionPolicy';

describe('overlay motion policy', () => {
  it('starts paused for reduced motion and allows a manual session override', () => {
    const initial = createOverlayMotionPolicyState({
      isTabVisible: true,
      prefersReducedMotion: true,
    });
    const manuallyPlayed = reduceOverlayMotionPolicy(initial, {
      type: 'manual-play',
    });

    expect(getOverlayMotionPlayback(initial)).toEqual({
      isPaused: true,
      reason: 'reduced-motion',
    });
    expect(getOverlayMotionPlayback(manuallyPlayed)).toEqual({
      isPaused: false,
      reason: null,
    });
  });

  it('keeps hidden-tab pause authoritative for every playback mode', () => {
    const playing = reduceOverlayMotionPolicy(
      createOverlayMotionPolicyState({
        isTabVisible: true,
        prefersReducedMotion: true,
      }),
      { type: 'manual-play' },
    );
    const hidden = reduceOverlayMotionPolicy(playing, {
      isTabVisible: false,
      type: 'visibility-change',
    });

    expect(getOverlayMotionPlayback(hidden)).toEqual({
      isPaused: true,
      reason: 'hidden-tab',
    });
    expect(getOverlayMotionPlayback(hidden, 'always')).toEqual({
      isPaused: true,
      reason: 'hidden-tab',
    });
  });

  it('pauses an inactive tab only in active-tab-only mode', () => {
    const inactive = createOverlayMotionPolicyState({
      isTabActive: false,
      isTabVisible: true,
      prefersReducedMotion: false,
    });

    expect(getOverlayMotionPlayback(inactive)).toEqual({
      isPaused: true,
      reason: 'inactive-tab',
    });
    expect(getOverlayMotionPlayback(inactive, 'always')).toEqual({
      isPaused: false,
      reason: null,
    });
  });

  it('persists manual pause until the session override is cleared', () => {
    const initial = createOverlayMotionPolicyState({
      isTabVisible: true,
      prefersReducedMotion: false,
    });
    const paused = reduceOverlayMotionPolicy(initial, { type: 'manual-pause' });
    const reset = reduceOverlayMotionPolicy(paused, {
      type: 'clear-manual-override',
    });

    expect(getOverlayMotionPlayback(paused)).toEqual({
      isPaused: true,
      reason: 'manual',
    });
    expect(getOverlayMotionPlayback(reset)).toEqual({
      isPaused: false,
      reason: null,
    });
  });
});
