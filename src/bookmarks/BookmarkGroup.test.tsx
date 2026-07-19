import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../i18n';
import type { GridSettings } from '../layout/types';
import { BookmarkGroup, type BookmarkGroupProps } from './BookmarkGroup';
import type { Bookmark, BookmarkItem } from './types';

const GRID_SETTINGS: GridSettings = {
  background: { border: 'none', color: 'white', text: 'black' },
  columns: 1,
  gap: '8px',
  icon: { border: 'none', color: 'white', text: 'black' },
  position: 'center-center',
  rows: 1,
};

const CHILD_FOLDER: Bookmark = {
  id: 'folder-child',
  list: [
    {
      id: 'nested-bookmark',
      title: 'Nested docs',
      url: 'https://nested.example.com',
    },
  ],
  title: 'Reference',
};

const ROOT_FOLDER: Bookmark = {
  children: [CHILD_FOLDER],
  id: 'folder-root',
  list: [
    { id: 'bookmark-1', title: 'GitHub', url: 'https://github.com' },
    { id: 'bookmark-2', title: 'MDN', url: 'https://developer.mozilla.org' },
  ],
  route: ['Bookmarks', 'Work'],
  title: 'Work',
};

const callbacks = {
  onActivateBookmark: vi.fn<(bookmark: BookmarkItem) => void>(),
  onActivateFolder: vi.fn<(folder: Bookmark) => void>(),
  onBookmarkContextMenu: vi.fn<BookmarkGroupProps['onBookmarkContextMenu']>(),
  onContentExpandedChange:
    vi.fn<NonNullable<BookmarkGroupProps['onContentExpandedChange']>>(),
  onFolderContextMenu: vi.fn<BookmarkGroupProps['onFolderContextMenu']>(),
  onNavigateToLevel: vi.fn<(level: number) => void>(),
  onPageChange: vi.fn<(page: number) => void>(),
};

function getGroupElement(
  page: number,
  props: Partial<BookmarkGroupProps> = {},
): ReactElement {
  return (
    <I18nProvider locale="en">
      <BookmarkGroup
        {...callbacks}
        currentFolder={ROOT_FOLDER}
        folder={ROOT_FOLDER}
        folderPath={[]}
        gridSettings={GRID_SETTINGS}
        isExpanded={false}
        layout="vertical"
        page={page}
        {...props}
      />
    </I18nProvider>
  );
}

function renderGroup(
  page: number,
  props: Partial<BookmarkGroupProps> = {},
): ReturnType<typeof render> {
  return render(getGroupElement(page, props));
}

beforeEach((): void => {
  Object.values(callbacks).forEach((callback) => callback.mockClear());
});

describe('BookmarkGroup', () => {
  it('requests controlled content changes in expanded view', () => {
    const { rerender } = renderGroup(0, {
      isContentExpanded: true,
      isExpanded: true,
    });
    const collapse = screen.getByRole('button', { name: 'Work: Collapse' });

    expect(collapse.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'GitHub' })).toBeDefined();

    fireEvent.click(collapse);

    expect(callbacks.onContentExpandedChange).toHaveBeenCalledWith(false);
    rerender(
      getGroupElement(0, {
        isContentExpanded: false,
        isExpanded: true,
      }),
    );

    const expand = screen.getByRole('button', { name: 'Work: Expand' });
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'GitHub' })).toBeNull();

    fireEvent.click(expand);

    expect(callbacks.onContentExpandedChange).toHaveBeenLastCalledWith(true);
  });

  it('does not expose collapse controls in paged view or preview', () => {
    const paged = renderGroup(0);

    expect(paged.container.querySelector('button[aria-expanded]')).toBeNull();
    paged.unmount();

    const preview = renderGroup(0, { isExpanded: true, isPreview: true });

    expect(preview.container.querySelector('button[aria-expanded]')).toBeNull();
  });

  it('opens a folder and forwards its context-menu interaction', () => {
    renderGroup(0);
    const folder = screen.getByRole('button', { name: 'Reference' });

    fireEvent.click(folder);
    fireEvent.contextMenu(folder, { clientX: 40, clientY: 60 });

    expect(callbacks.onActivateFolder).toHaveBeenCalledWith(CHILD_FOLDER);
    expect(callbacks.onFolderContextMenu).toHaveBeenCalledTimes(1);
    expect(callbacks.onFolderContextMenu.mock.calls[0]?.[1]).toBe(CHILD_FOLDER);
    expect(screen.queryByRole('button', { name: 'GitHub' })).toBeNull();
  });

  it('shows the requested page and wraps page controls', () => {
    const { rerender } = renderGroup(1);
    const github = screen.getByRole('button', { name: 'GitHub' });

    fireEvent.click(github);
    fireEvent.contextMenu(github, { clientX: 80, clientY: 100 });
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));

    expect(callbacks.onActivateBookmark).toHaveBeenCalledWith(
      ROOT_FOLDER.list?.[0],
    );
    expect(callbacks.onBookmarkContextMenu.mock.calls[0]?.[1]).toBe(
      ROOT_FOLDER.list?.[0],
    );
    expect(callbacks.onPageChange).toHaveBeenNthCalledWith(1, 2);
    expect(callbacks.onPageChange).toHaveBeenNthCalledWith(2, 0);

    rerender(getGroupElement(2));

    expect(screen.getByRole('button', { name: 'MDN' })).toBeDefined();
    expect(screen.getByText('3 / 3')).toBeDefined();
  });

  it('exposes stable custom CSS parts for group chrome', () => {
    const { container } = renderGroup(1);
    const paginationControls = container.querySelectorAll(
      '[data-starlit-part="pagination-control"]',
    );

    expect(
      container.querySelector('[data-starlit-part="bookmark-group"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-starlit-part="bookmark-group-header"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-starlit-part="bookmark-breadcrumb"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-starlit-part="bookmark-route"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-starlit-part="bookmark-grid"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-starlit-part="pagination"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-starlit-part="pagination-status"]'),
    ).not.toBeNull();
    expect(paginationControls).toHaveLength(2);
    expect(paginationControls[0]?.getAttribute('data-direction')).toBe(
      'previous',
    );
    expect(paginationControls[1]?.getAttribute('data-direction')).toBe('next');
  });
});
