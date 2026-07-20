import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Bookmark, BookmarkItem } from './types';
import {
  useOpenBookmarkTabGroup,
  type OpenBookmarkTabGroupMessages,
} from './useOpenBookmarkTabGroup';

const openBookmarkTabGroup = vi.hoisted(() => vi.fn());

vi.mock('../platform/tabGroups/openBookmarkTabGroup', () => ({
  openBookmarkTabGroup,
}));

const messages: OpenBookmarkTabGroupMessages = {
  activationFailed: 'Activation failed.',
  empty: 'No bookmarks.',
  failed: 'Failed.',
  noValidBookmarks: 'No valid bookmarks.',
  opened: (openedCount, skippedCount) =>
    `Opened ${openedCount}; skipped ${skippedCount}.`,
  opening: 'Opening.',
  permissionDenied: 'Permission denied.',
  rollbackIncomplete: (remainingTabCount) =>
    `${remainingTabCount} tabs remain.`,
};

function getBookmarks(count: number): BookmarkItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `bookmark-${index}`,
    title: `Bookmark ${index}`,
    url: `https://${index}.example.com`,
  }));
}

function getFolder(count: number): Bookmark {
  return {
    id: 'folder',
    list: getBookmarks(count),
    title: 'Research',
  };
}

beforeEach((): void => {
  openBookmarkTabGroup.mockResolvedValue({
    activationFailed: false,
    openedCount: 1,
    skippedCount: 0,
    status: 'opened',
  });
});

describe('useOpenBookmarkTabGroup', () => {
  it('requires confirmation for every non-empty folder and restores trigger focus', async () => {
    const folder = getFolder(1);
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const { result } = renderHook(() => useOpenBookmarkTabGroup(messages));

    act(() => result.current.requestOpen(folder));

    expect(result.current.folderToConfirm).toBe(folder);
    expect(openBookmarkTabGroup).not.toHaveBeenCalled();

    act(() => result.current.confirmOpen());

    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(openBookmarkTabGroup).toHaveBeenCalledWith(
      folder.title,
      folder.list,
    );
    await waitFor(() =>
      expect(result.current.status?.message).toBe('Opened 1; skipped 0.'),
    );
  });

  it('reports an empty folder without requesting permission', () => {
    const { result } = renderHook(() => useOpenBookmarkTabGroup(messages));

    act(() => result.current.requestOpen(getFolder(0)));

    expect(result.current.status).toEqual({
      message: 'No bookmarks.',
      tone: 'muted',
    });
    expect(openBookmarkTabGroup).not.toHaveBeenCalled();
  });

  it('ignores duplicate requests while a group is opening', () => {
    openBookmarkTabGroup.mockReturnValue(new Promise(() => undefined));
    const folder = getFolder(2);
    const { result } = renderHook(() => useOpenBookmarkTabGroup(messages));

    act(() => result.current.requestOpen(folder));
    act(() => result.current.confirmOpen());
    act(() => result.current.requestOpen(folder));

    expect(result.current.folderToConfirm).toBeNull();
    expect(openBookmarkTabGroup).toHaveBeenCalledTimes(1);
  });
});
