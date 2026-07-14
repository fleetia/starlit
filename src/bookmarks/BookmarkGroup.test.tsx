import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Bookmark,
  BookmarkItem,
  GridSettings,
  Settings,
} from '../newtab/types';
import { I18nProvider } from '../i18n';
import { BookmarkGroup, type BookmarkGroupProps } from './BookmarkGroup';

const GRID_SETTINGS: GridSettings = {
  background: { border: 'none', color: 'white', text: 'black' },
  columns: 1,
  gap: '8px',
  icon: { border: 'none', color: 'white', text: 'black' },
  position: 'center-center',
  rows: 1,
};

const SETTINGS: Settings = {
  iconLayout: 'vertical',
  isExpandView: false,
  isFolderEnabled: true,
  isOpenInNewTab: false,
  isVisibleOnce: false,
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
  onFolderContextMenu: vi.fn<BookmarkGroupProps['onFolderContextMenu']>(),
  onNavigateToLevel: vi.fn<(level: number) => void>(),
  onPageChange: vi.fn<(page: number) => void>(),
};

function renderGroup(page: number): ReturnType<typeof render> {
  return render(
    <I18nProvider locale="en">
      <BookmarkGroup
        {...callbacks}
        currentFolder={ROOT_FOLDER}
        folder={ROOT_FOLDER}
        folderPath={[]}
        gridSettings={GRID_SETTINGS}
        isExpanded={false}
        page={page}
        settings={SETTINGS}
      />
    </I18nProvider>,
  );
}

beforeEach((): void => {
  Object.values(callbacks).forEach((callback) => callback.mockClear());
});

describe('BookmarkGroup', () => {
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

    rerender(
      <I18nProvider locale="en">
        <BookmarkGroup
          {...callbacks}
          currentFolder={ROOT_FOLDER}
          folder={ROOT_FOLDER}
          folderPath={[]}
          gridSettings={GRID_SETTINGS}
          isExpanded={false}
          page={2}
          settings={SETTINGS}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole('button', { name: 'MDN' })).toBeDefined();
    expect(screen.getByText('3 / 3')).toBeDefined();
  });
});
