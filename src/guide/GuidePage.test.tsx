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
      screen.getByRole('heading', { level: 2, name: 'Overlay image layers' }),
    ).toBeTruthy();
    expect(
      screen.getByText(/reference screenshots use the Korean product UI/i),
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
    render(<GuidePage locale="ja" section="tab-groups" />);

    const heading = document.getElementById('tab-groups');

    expect(heading).not.toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(heading?.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(document.documentElement.lang).toBe('ja');
  });
});
