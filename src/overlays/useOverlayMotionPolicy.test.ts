import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useOverlayMotionPolicy } from './useOverlayMotionPolicy';

type MediaQueryListener = (event: MediaQueryListEvent) => void;

function stubMotionEnvironment(options: {
  isTabActive?: boolean;
  isReducedMotion: boolean;
  visibilityState: DocumentVisibilityState;
}): {
  dispatchReducedMotion: (matches: boolean) => void;
  setVisibility: (state: DocumentVisibilityState) => void;
} {
  let visibilityState = options.visibilityState;
  let reducedMotionListener: MediaQueryListener | undefined;
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
    () => visibilityState,
  );
  vi.spyOn(document, 'hasFocus').mockReturnValue(options.isTabActive ?? true);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: vi.fn(
        (_type: 'change', listener: MediaQueryListener): void => {
          reducedMotionListener = listener;
        },
      ),
      matches: options.isReducedMotion,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      removeEventListener: vi.fn(),
    })),
  );

  return {
    dispatchReducedMotion(matches): void {
      reducedMotionListener?.({ matches } as MediaQueryListEvent);
    },
    setVisibility(state): void {
      visibilityState = state;
      document.dispatchEvent(new Event('visibilitychange'));
    },
  };
}

afterEach((): void => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useOverlayMotionPolicy', () => {
  it('reacts to tab visibility and retains manual play for the mounted session', () => {
    const environment = stubMotionEnvironment({
      isReducedMotion: true,
      visibilityState: 'visible',
    });
    const { result } = renderHook(() => useOverlayMotionPolicy());

    expect(result.current).toMatchObject({
      isPaused: true,
      reason: 'reduced-motion',
    });
    act(() => result.current.play());
    expect(result.current.isPaused).toBe(false);

    act(() => environment.setVisibility('hidden'));
    expect(result.current).toMatchObject({
      isPaused: true,
      reason: 'hidden-tab',
    });
    act(() => environment.setVisibility('visible'));
    expect(result.current.isPaused).toBe(false);

    act(() => environment.dispatchReducedMotion(false));
    expect(result.current.isPaused).toBe(false);
  });

  it('follows a controlled manual session override', () => {
    stubMotionEnvironment({
      isReducedMotion: false,
      visibilityState: 'visible',
    });
    const { result, rerender } = renderHook(
      ({ manualOverride }: { manualOverride: 'pause' | 'play' }) =>
        useOverlayMotionPolicy({ manualOverride }),
      {
        initialProps: {
          manualOverride: 'pause' as 'pause' | 'play',
        },
      },
    );

    expect(result.current).toMatchObject({
      isPaused: true,
      reason: 'manual',
    });
    rerender({ manualOverride: 'play' });
    expect(result.current).toMatchObject({ isPaused: false, reason: null });
  });

  it('uses window focus only for active-tab-only playback', () => {
    stubMotionEnvironment({
      isReducedMotion: false,
      visibilityState: 'visible',
    });
    const activeTab = renderHook(() =>
      useOverlayMotionPolicy({ playbackMode: 'active-tab-only' }),
    );
    const always = renderHook(() =>
      useOverlayMotionPolicy({ playbackMode: 'always' }),
    );

    act(() => window.dispatchEvent(new Event('blur')));
    expect(activeTab.result.current).toMatchObject({
      isPaused: true,
      reason: 'inactive-tab',
    });
    expect(always.result.current).toMatchObject({
      isPaused: false,
      reason: null,
    });

    act(() => window.dispatchEvent(new Event('focus')));
    expect(activeTab.result.current).toMatchObject({
      isPaused: false,
      reason: null,
    });
  });
});
