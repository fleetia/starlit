import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GuidePage } from './GuidePage';
import { GUIDE_SECTIONS } from './guideRoute';

beforeEach((): void => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

describe('GuidePage', () => {
  it('renders the wiki navigation, task articles, and product screenshots', () => {
    const { container } = render(<GuidePage locale="en" />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Starlit user guide' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('navigation', { name: 'Guide contents' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Save and switch Scenes safely',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Image widgets and motion',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Clock and URL-subscribed Calendar',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Find and act with Cmd/Ctrl+K',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('complementary', {
        name: 'Calendar release review is still pending',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(/does not claim that review is complete/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/Chrome Web Store privacy disclosure.*optional-host/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/reference screenshots use the English product UI/i),
    ).toBeTruthy();
    expect(container.querySelectorAll('[data-guide-section]')).toHaveLength(
      GUIDE_SECTIONS.length,
    );

    const screenshots = screen.getAllByRole('img');
    expect(screenshots.length).toBeGreaterThanOrEqual(6);
    expect(screenshots.map((image) => image.getAttribute('src'))).toContain(
      '/assets/guide/new-tab-overview.jpg',
    );
    expect(screenshots.map((image) => image.getAttribute('src'))).toContain(
      '/assets/guide/open-tab-group-confirm.jpg',
    );
    expect(
      screenshots.every(
        (image) => (image.getAttribute('alt')?.length ?? 0) > 0,
      ),
    ).toBe(true);
  });

  it('scrolls to and focuses the requested section heading after mount', async () => {
    render(<GuidePage locale="ja" section="widgets-calendar" />);

    const heading = document.getElementById('widgets-calendar');

    expect(heading).not.toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(heading?.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(heading?.textContent).toBe('Clock と URL 購読 Calendar');
    expect(
      screen.getByRole('complementary', {
        name: 'Calendar の公開審査はまだ完了していません',
      }),
    ).toBeTruthy();
    expect(document.documentElement.lang).toBe('ja');
  });

  it('renders the Korean v2 chapters and unfinished release review notice', () => {
    render(<GuidePage locale="ko" />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Scene을 안전하게 저장하고 전환하기',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '이미지 위젯과 motion',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('complementary', {
        name: 'Calendar 출시 전 Store 검토가 남아 있습니다',
      }),
    ).toBeTruthy();
  });
});
