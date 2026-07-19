import type { ReactElement } from 'react';

import { BookmarkGroup } from '../bookmarks/BookmarkGroup';
import type { Bookmark, BookmarkLayout } from '../bookmarks/types';
import { useTranslation } from '../i18n';
import type { GridSettings } from '../layout/types';

type BookmarkPreviewProps = {
  gridSettings: GridSettings;
  layout?: BookmarkLayout;
};

export function BookmarkPreview({
  gridSettings,
  layout,
}: BookmarkPreviewProps): ReactElement {
  const { t } = useTranslation();
  const previewFolder: Bookmark = {
    children: [
      {
        id: 'starlit-preview-folder',
        title: t('sidebar.folder.mockupName'),
      },
    ],
    id: 'starlit-preview',
    list: [
      {
        id: 'starlit-preview-bookmark',
        title: 'Starlit',
        url: 'https://example.com',
      },
    ],
    route: ['Preview'],
    title: 'Starlit',
  };

  return (
    <BookmarkGroup
      currentFolder={previewFolder}
      folder={previewFolder}
      folderPath={[]}
      gridSettings={{
        ...gridSettings,
        columns: 2,
        horizontalColumns: 2,
        rows: 1,
      }}
      isExpanded
      isPreview
      layout={layout}
      onActivateBookmark={() => undefined}
      onActivateFolder={() => undefined}
      onBookmarkContextMenu={() => undefined}
      onFolderContextMenu={() => undefined}
      onNavigateToLevel={() => undefined}
      onPageChange={() => undefined}
      page={0}
    />
  );
}
