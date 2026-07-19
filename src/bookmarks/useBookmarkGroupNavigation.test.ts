import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Bookmark } from './types';
import { useBookmarkGroupNavigation } from './useBookmarkGroupNavigation';

const CHILD_FOLDER: Bookmark = {
  id: 'child',
  title: 'Child',
};

describe('useBookmarkGroupNavigation', () => {
  it('keeps folder paths and pages by group while resetting navigation pages', () => {
    const { result } = renderHook(() => useBookmarkGroupNavigation(2));

    act(() => {
      result.current.setPage('first', 2);
      result.current.setPage('second', 1);
      result.current.enterFolder('first', CHILD_FOLDER);
    });

    expect(result.current.folderPaths).toEqual({ first: [CHILD_FOLDER] });
    expect(result.current.pages).toEqual({ first: 0, second: 1 });

    act(() => {
      result.current.navigateToLevel('first', -1);
    });

    expect(result.current.folderPaths).toEqual({ first: [] });
    expect(result.current.pages).toEqual({ first: 0, second: 1 });
  });

  it('wraps paged group navigation and scrolls the selected group into view', () => {
    const { result } = renderHook(() => useBookmarkGroupNavigation(2));
    const rail = document.createElement('div');
    const firstGroup = document.createElement('section');
    const secondGroup = document.createElement('section');
    const scrollIntoView = vi.fn();
    secondGroup.scrollIntoView = scrollIntoView;
    rail.append(firstGroup, secondGroup);
    result.current.groupRailRef.current = rail;

    act(() => {
      result.current.scrollToGroup(-1);
    });

    expect(result.current.activeGroupIndex).toBe(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      inline: 'center',
    });
  });
});
