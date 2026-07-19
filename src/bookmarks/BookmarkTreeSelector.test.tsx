import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../i18n';
import { getBookmarkIdKey } from './bookmarkRoute';
import { BookmarkTreeSelector } from './BookmarkTreeSelector';
import type { Bookmark } from './types';

describe('BookmarkTreeSelector', () => {
  it('selects a direct-bookmark folder whose title contains a slash', () => {
    const onSelectRoot = vi.fn<(route: string[]) => void>();
    const bookmarks: Bookmark[] = [
      {
        id: 'slash-folder',
        list: [
          {
            id: 'bookmark',
            title: 'Reference',
            url: 'https://example.com/reference',
          },
        ],
        route: ['Bookmarks Bar', 'Design/Systems'],
        title: 'Design/Systems',
      },
    ];

    render(
      <I18nProvider locale="en">
        <BookmarkTreeSelector
          bookmarks={bookmarks}
          groupPreferences={[]}
          onSelectRoot={onSelectRoot}
          onSiblingReorder={vi.fn()}
          onToggleVisibility={vi.fn()}
          rootPath={[]}
          siblingOrder={{}}
        />
      </I18nProvider>,
    );

    const select = screen.getByRole('combobox', { name: 'Root group' });
    const option = screen.getByRole<HTMLOptionElement>('option', {
      name: 'Design/Systems',
    });

    expect(option.value).not.toBe('Bookmarks Bar/Design/Systems');
    fireEvent.change(select, { target: { value: option.value } });

    expect(onSelectRoot).toHaveBeenCalledWith(
      ['Bookmarks Bar', 'Design/Systems'],
      'slash-folder',
    );
  });

  it('selects duplicate title routes by their Chrome bookmark id', () => {
    const onSelectRoot = vi.fn<(route: string[], rootId?: string) => void>();
    const bookmarks: Bookmark[] = [
      {
        id: 'first',
        list: [{ id: 'one', title: 'One', url: 'https://one.test' }],
        route: ['Bookmarks Bar', 'Same'],
        title: 'Same',
      },
      {
        id: 'second',
        list: [{ id: 'two', title: 'Two', url: 'https://two.test' }],
        route: ['Bookmarks Bar', 'Same'],
        title: 'Same',
      },
    ];

    render(
      <I18nProvider locale="en">
        <BookmarkTreeSelector
          bookmarks={bookmarks}
          groupPreferences={[]}
          onSelectRoot={onSelectRoot}
          onSiblingReorder={vi.fn()}
          onToggleVisibility={vi.fn()}
          rootPath={[]}
          siblingOrder={{}}
        />
      </I18nProvider>,
    );

    const select = screen.getByRole('combobox', { name: 'Root group' });
    const duplicateOptions = screen.getAllByRole<HTMLOptionElement>('option', {
      name: 'Same',
    });
    const secondOption = duplicateOptions[1];
    expect(secondOption).toBeDefined();

    fireEvent.change(select, { target: { value: secondOption?.value } });

    expect(onSelectRoot).toHaveBeenCalledWith(
      ['Bookmarks Bar', 'Same'],
      'second',
    );
  });

  it('shows the selected root direct bookmarks as a manageable group', () => {
    const onToggleVisibility = vi.fn<(key: string) => void>();
    const bookmarks: Bookmark[] = [
      {
        children: [
          {
            id: 'nested',
            list: [
              { id: 'nested-item', title: 'Nested', url: 'https://n.test' },
            ],
            route: ['Toolbar', 'Nested'],
            title: 'Nested',
          },
        ],
        id: 'toolbar',
        list: [{ id: 'direct', title: 'Direct', url: 'https://direct.test' }],
        route: ['Toolbar'],
        title: 'Toolbar',
      },
    ];

    const { container } = render(
      <I18nProvider locale="en">
        <BookmarkTreeSelector
          bookmarks={bookmarks}
          groupPreferences={[
            { key: getBookmarkIdKey('toolbar'), visible: true },
            { key: getBookmarkIdKey('nested'), visible: true },
          ]}
          onSelectRoot={vi.fn()}
          onSiblingReorder={vi.fn()}
          onToggleVisibility={onToggleVisibility}
          rootId="toolbar"
          rootPath={['Toolbar']}
          siblingOrder={{}}
        />
      </I18nProvider>,
    );

    const rows = container.querySelectorAll('[data-starlit-part="group-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain('Toolbar');

    fireEvent.click(screen.getAllByRole('button', { name: 'Hide' })[0]!);

    expect(onToggleVisibility).toHaveBeenCalledWith(
      getBookmarkIdKey('toolbar'),
    );
  });
});
