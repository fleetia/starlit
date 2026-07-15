import type { CSSProperties, MouseEvent, ReactElement } from 'react';
import {
  Breadcrumb,
  Button,
  Section,
  Text,
  type BreadcrumbItem,
} from '@fleetia/lagrange';

import type {
  Bookmark,
  BookmarkItem,
  GridSettings,
  Settings,
} from '../newtab/types';
import { useTranslation } from '../i18n';
import { BookmarkTile } from './BookmarkTile';
import { getBookmarkEntries, paginateBookmarkEntries } from './presentation';

type GridStyle = CSSProperties & {
  '--starlit-columns': number;
  '--starlit-rows'?: number;
};

export type BookmarkGroupProps = {
  currentFolder: Bookmark;
  folder: Bookmark;
  folderPath: Bookmark[];
  gridSettings: GridSettings;
  isExpanded: boolean;
  isPreview?: boolean;
  onActivateBookmark: (bookmark: BookmarkItem) => void;
  onActivateFolder: (folder: Bookmark) => void;
  onBookmarkContextMenu: (
    event: MouseEvent<HTMLElement>,
    bookmark: BookmarkItem,
  ) => void;
  onFolderContextMenu: (
    event: MouseEvent<HTMLElement>,
    folder: Bookmark,
  ) => void;
  onNavigateToLevel: (level: number) => void;
  onPageChange: (page: number) => void;
  page: number;
  settings: Settings;
};

function getBreadcrumbItems(
  root: Bookmark,
  path: Bookmark[],
  onNavigateToLevel: (level: number) => void,
  isPreview: boolean,
): BreadcrumbItem[] {
  return [
    {
      key: root.id ?? root.title,
      label: root.title,
      onClick: isPreview ? undefined : () => onNavigateToLevel(-1),
    },
    ...path.map((folder, index) => ({
      key: folder.id ?? `${folder.title}-${index}`,
      label: folder.title,
      onClick: isPreview ? undefined : () => onNavigateToLevel(index),
    })),
  ];
}

export function BookmarkGroup({
  currentFolder,
  folder,
  folderPath,
  gridSettings,
  isExpanded,
  isPreview = false,
  onActivateBookmark,
  onActivateFolder,
  onBookmarkContextMenu,
  onFolderContextMenu,
  onNavigateToLevel,
  onPageChange,
  page,
  settings,
}: BookmarkGroupProps): ReactElement {
  const { t } = useTranslation();
  const isHorizontal = settings.iconLayout === 'horizontal';
  const columns = isHorizontal
    ? (gridSettings.horizontalColumns ?? 1)
    : gridSettings.columns;
  const pageSize = Math.max(1, columns * gridSettings.rows);
  const entries = getBookmarkEntries(currentFolder);
  const paginated = paginateBookmarkEntries(entries, page, pageSize);
  const totalPages = paginated.totalPages;
  const safePage = paginated.page;
  const visibleEntries = isExpanded ? entries : paginated.entries;
  const placeholderCount = isExpanded
    ? 0
    : Math.max(0, pageSize - visibleEntries.length);
  const gridStyle: GridStyle = {
    '--starlit-columns': columns,
    '--starlit-rows': isExpanded ? undefined : gridSettings.rows,
  };

  return (
    <Section
      aria-hidden={isPreview || undefined}
      boundary="structural"
      className={`starlit-bookmark-group${isPreview ? ' starlit-bookmark-group--preview' : ''}`}
      data-preview={isPreview || undefined}
      data-starlit-part="bookmark-group"
      inert={isPreview || undefined}
      spacing="compact"
    >
      <header className="starlit-bookmark-group__header">
        <Breadcrumb
          aria-label={`${folder.title} ${t('navigation.path')}`}
          items={getBreadcrumbItems(
            folder,
            folderPath,
            onNavigateToLevel,
            isPreview,
          )}
        />
        {folder.route?.length ? (
          <Text
            className="starlit-bookmark-group__route"
            tone="muted"
            truncate
            variant="caption"
          >
            {folder.route.join(' / ')}
          </Text>
        ) : null}
      </header>

      <div
        className="starlit-bookmark-grid"
        data-layout={settings.iconLayout ?? 'vertical'}
        data-starlit-part="bookmark-grid"
        style={gridStyle}
      >
        {visibleEntries.map((entry) =>
          entry.type === 'folder' ? (
            <BookmarkTile
              key={entry.data.id ?? entry.data.title}
              favicon={entry.data.favicon}
              isPreview={isPreview}
              kind="folder"
              layout={settings.iconLayout}
              onActivate={() => onActivateFolder(entry.data)}
              onContextMenu={(event) => onFolderContextMenu(event, entry.data)}
              title={entry.data.title}
            />
          ) : (
            <BookmarkTile
              key={entry.data.id}
              favicon={entry.data.favicon}
              isPreview={isPreview}
              kind="bookmark"
              layout={settings.iconLayout}
              onActivate={() => onActivateBookmark(entry.data)}
              onContextMenu={(event) =>
                onBookmarkContextMenu(event, entry.data)
              }
              title={entry.data.title}
            />
          ),
        )}
        {Array.from({ length: placeholderCount }, (_, index) => (
          <span
            key={`placeholder-${index}`}
            aria-hidden="true"
            className="starlit-bookmark-grid__placeholder"
          />
        ))}
      </div>

      {!isPreview && !isExpanded && totalPages > 1 ? (
        <nav
          aria-label={`${folder.title} ${t('pagination.pages')}`}
          className="starlit-pagination"
          data-starlit-part="pagination"
        >
          <Button
            aria-label={t('pagination.previousPage')}
            onClick={() =>
              onPageChange(safePage === 0 ? totalPages - 1 : safePage - 1)
            }
            size="compact"
            variant="quiet"
          >
            ←
          </Button>
          <Text variant="data">
            {safePage + 1} / {totalPages}
          </Text>
          <Button
            aria-label={t('pagination.nextPage')}
            onClick={() =>
              onPageChange(safePage === totalPages - 1 ? 0 : safePage + 1)
            }
            size="compact"
            variant="quiet"
          >
            →
          </Button>
        </nav>
      ) : null}
    </Section>
  );
}
