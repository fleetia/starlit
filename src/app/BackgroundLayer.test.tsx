import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../i18n';
import { BackgroundLayer } from './BackgroundLayer';

afterEach((): void => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BackgroundLayer', () => {
  it('pauses motion by default for reduced motion and allows a session override', async () => {
    let visibilityState: DocumentVisibilityState = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
      () => visibilityState,
    );
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        removeEventListener: vi.fn(),
      })),
    );
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined);
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => undefined);

    const { container } = render(
      <I18nProvider locale="en">
        <BackgroundLayer
          backgroundImage="none"
          blobUrl=""
          isMediaMissing={false}
          media={{
            source: 'url',
            type: 'video',
            url: 'https://example.com/background.webm',
          }}
        />
      </I18nProvider>,
    );
    const video = container.querySelector<HTMLVideoElement>('video');

    expect(video?.dataset.motionPaused).toBe('true');
    expect(video?.dataset.motionPauseReason).toBe('reduced-motion');
    expect(pause).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Play background motion' }),
    );
    await waitFor(() => {
      expect(video?.dataset.motionPaused).toBe('false');
      expect(play).toHaveBeenCalled();
    });

    act(() => {
      visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(video?.dataset.motionPaused).toBe('true');
    expect(video?.dataset.motionPauseReason).toBe('hidden-tab');

    act(() => {
      visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(video?.dataset.motionPaused).toBe('false');
  });
});
