import type { Bookmark, BookmarkItem } from './types';

export type BookmarkEntry =
  | { data: Bookmark; type: 'folder' }
  | { data: BookmarkItem; type: 'bookmark' };

export type BookmarkPage = {
  entries: BookmarkEntry[];
  page: number;
  pageSize: number;
  totalPages: number;
};

export function getBookmarkEntries(folder: Bookmark): BookmarkEntry[] {
  return [
    ...(folder.children ?? []).map(
      (data): BookmarkEntry => ({
        data,
        type: 'folder',
      }),
    ),
    ...(folder.list ?? []).map(
      (data): BookmarkEntry => ({
        data,
        type: 'bookmark',
      }),
    ),
  ];
}

export function getCurrentFolder(
  folder: Bookmark,
  path: readonly Bookmark[],
): Bookmark {
  return path.reduce((current, segment) => {
    const next = current.children?.find((candidate) =>
      segment.id
        ? candidate.id === segment.id
        : candidate.title === segment.title,
    );
    return next ?? current;
  }, folder);
}

export function paginateBookmarkEntries(
  entries: BookmarkEntry[],
  requestedPage: number,
  requestedPageSize: number,
): BookmarkPage {
  const pageSize = Math.max(1, Math.floor(requestedPageSize));
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const page = Math.min(totalPages - 1, Math.max(0, Math.floor(requestedPage)));

  return {
    entries: entries.slice(page * pageSize, (page + 1) * pageSize),
    page,
    pageSize,
    totalPages,
  };
}
