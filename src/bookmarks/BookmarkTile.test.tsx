import type { MouseEvent } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BookmarkTile, type BookmarkTileLayout } from './BookmarkTile';

describe('BookmarkTile', () => {
  it.each<BookmarkTileLayout>(['vertical', 'horizontal'])(
    'activates a %s bookmark from its accessible button',
    (layout) => {
      const handleActivate = vi.fn();

      render(
        <BookmarkTile
          kind="bookmark"
          layout={layout}
          onActivate={handleActivate}
          title="GitHub"
        />,
      );
      const tile = screen.getByRole('button', { name: 'GitHub' });

      fireEvent.click(tile);

      expect(handleActivate).toHaveBeenCalledTimes(1);
      expect(tile.getAttribute('data-layout')).toBe(layout);
    },
  );

  it('forwards the pointer location through a context-menu interaction', () => {
    const handleContextMenu = vi.fn((event: MouseEvent<HTMLElement>): void =>
      event.preventDefault(),
    );

    render(
      <BookmarkTile
        kind="folder"
        layout="horizontal"
        onContextMenu={handleContextMenu}
        title="Reference"
      />,
    );

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Reference' }), {
      clientX: 120,
      clientY: 84,
    });

    expect(handleContextMenu).toHaveBeenCalledTimes(1);
    expect(handleContextMenu.mock.calls[0]?.[0].clientX).toBe(120);
    expect(handleContextMenu.mock.calls[0]?.[0].clientY).toBe(84);
  });

  it('exposes stable custom CSS parts for tile content', () => {
    const { container, rerender } = render(
      <BookmarkTile
        favicon="data:image/png;base64,AAAA"
        kind="bookmark"
        title="GitHub"
      />,
    );

    expect(
      container.querySelector('[data-starlit-part="bookmark-tile"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-starlit-part="bookmark-tile-icon"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-starlit-part="bookmark-tile-favicon"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-starlit-part="bookmark-tile-label"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-starlit-part="bookmark-tile-marker"]'),
    ).toBeNull();

    rerender(<BookmarkTile kind="folder" title="Reference" />);

    expect(
      container.querySelector('[data-starlit-part="bookmark-tile-marker"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-starlit-part="bookmark-tile-favicon"]'),
    ).toBeNull();
  });
});
