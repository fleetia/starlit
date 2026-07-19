import {
  createRef,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../i18n';
import { useBookmarkActions } from './useBookmarkActions';

type WrapperProps = {
  children: ReactNode;
};

function Wrapper({ children }: WrapperProps): ReactElement {
  return <I18nProvider locale="en">{children}</I18nProvider>;
}

describe('useBookmarkActions', () => {
  it('moves a context target through delete confirmation and successful deletion', async () => {
    const deleteBookmark = vi.fn<(bookmarkId: string) => Promise<void>>();
    deleteBookmark.mockResolvedValue(undefined);
    const fallbackFocusRef = createRef<HTMLButtonElement>();
    const { result } = renderHook(
      () =>
        useBookmarkActions({
          deleteBookmark,
          fallbackFocusRef,
          resetFavicon: vi.fn<() => Promise<void>>(),
          updateFavicon: vi.fn<() => Promise<void>>(),
        }),
      { wrapper: Wrapper },
    );
    const grid = document.createElement('div');
    grid.dataset.starlitPart = 'bookmark-grid';
    const trigger = document.createElement('button');
    trigger.dataset.starlitPart = 'bookmark-tile';
    const adjacent = document.createElement('button');
    adjacent.dataset.starlitPart = 'bookmark-tile';
    grid.append(trigger, adjacent);
    const event = {
      clientX: 120,
      clientY: 80,
      currentTarget: trigger,
      preventDefault: vi.fn(),
    } as unknown as ReactMouseEvent<HTMLElement>;

    act(() => {
      result.current.openContextMenu(event, 'bookmark-github', false);
    });

    expect(result.current.contextTarget).toEqual({
      bookmarkId: 'bookmark-github',
      isFolder: false,
      point: { x: 120, y: 80 },
    });

    act(() => {
      result.current.requestDelete();
    });

    expect(result.current.isDeleteDialogOpen).toBe(true);

    await act(async () => {
      await result.current.confirmDeleteBookmark();
    });

    expect(deleteBookmark).toHaveBeenCalledWith('bookmark-github');
    expect(result.current.isDeleteDialogOpen).toBe(false);
    expect(result.current.deleteError).toBeNull();
  });
});
