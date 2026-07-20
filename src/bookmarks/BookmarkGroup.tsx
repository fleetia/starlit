import {
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Breadcrumb,
  Button,
  IconButton,
  Section,
  Text,
  type BreadcrumbItem,
} from '@fleetia/lagrange';

import { useTranslation } from '../i18n';
import type { GridSettings } from '../layout/types';
import { BookmarkTile } from './BookmarkTile';
import { getBookmarkEntries, paginateBookmarkEntries } from './presentation';
import type { Bookmark, BookmarkItem, BookmarkLayout } from './types';
import './bookmarks.css';

type GridStyle = CSSProperties & {
  '--starlit-columns': number;
  '--starlit-rows'?: number;
};

export type BookmarkGroupProps = {
  currentFolder: Bookmark;
  folder: Bookmark;
  folderPath: Bookmark[];
  gridSettings: GridSettings;
  isContentExpanded?: boolean;
  isExpanded: boolean;
  isOpeningTabGroup?: boolean;
  isPreview?: boolean;
  layout?: BookmarkLayout;
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
  onOpenAsTabGroup?: (folder: Bookmark) => void;
  onContentExpandedChange?: (isExpanded: boolean) => void;
  onPageChange: (page: number) => void;
  page: number;
};

function getBreadcrumbItems(
  root: Bookmark,
  path: Bookmark[],
  onNavigateToLevel: (level: number) => void,
  onOpenAsTabGroup: (() => void) | undefined,
  openActionLabel: string,
  isPreview: boolean,
): BreadcrumbItem[] {
  function getCurrentLabel(title: string): ReactNode {
    return (
      <span>
        <span aria-hidden="true" data-starlit-part="bookmark-group-title">
          {title}
        </span>
        <span className="starlit-visually-hidden">
          {title}: {openActionLabel}
        </span>
      </span>
    );
  }

  function getOnClick(
    isCurrent: boolean,
    navigate: () => void,
  ): (() => void) | undefined {
    if (isPreview) {
      return undefined;
    }

    if (isCurrent) {
      return onOpenAsTabGroup;
    }

    return navigate;
  }

  const isRootCurrent = path.length === 0;

  return [
    {
      key: root.id ?? root.title,
      label: isRootCurrent ? getCurrentLabel(root.title) : root.title,
      onClick: getOnClick(isRootCurrent, () => onNavigateToLevel(-1)),
    },
    ...path.map((folder, index) => {
      const isCurrent = index === path.length - 1;

      return {
        key: folder.id ?? `${folder.title}-${index}`,
        label: isCurrent ? getCurrentLabel(folder.title) : folder.title,
        onClick: getOnClick(isCurrent, () => onNavigateToLevel(index)),
      };
    }),
  ];
}

export function BookmarkGroup({
  currentFolder,
  folder,
  folderPath,
  gridSettings,
  isContentExpanded = true,
  isExpanded,
  isOpeningTabGroup = false,
  isPreview = false,
  layout,
  onActivateBookmark,
  onActivateFolder,
  onBookmarkContextMenu,
  onFolderContextMenu,
  onNavigateToLevel,
  onOpenAsTabGroup,
  onContentExpandedChange,
  onPageChange,
  page,
}: BookmarkGroupProps): ReactElement {
  const { t } = useTranslation();
  const isHorizontal = layout === 'horizontal';
  const isExpandedView = isExpanded && !isPreview;
  const canCollapse = isExpandedView && onContentExpandedChange !== undefined;
  const isContentVisible = !canCollapse || isContentExpanded;
  const hasRoute = Boolean(folder.route?.length);
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
      className={`starlit-bookmark-group${isPreview ? ' starlit-bookmark-group--preview' : ''}${isExpandedView ? ' starlit-bookmark-group--expanded' : ''}${isExpandedView && !isContentVisible ? ' starlit-bookmark-group--collapsed' : ''}`}
      data-expanded={isExpandedView ? isContentVisible : undefined}
      data-preview={isPreview || undefined}
      data-starlit-part="bookmark-group"
      inert={isPreview || undefined}
      spacing="compact"
    >
      <header
        aria-busy={isOpeningTabGroup || undefined}
        className="starlit-bookmark-group__header"
        data-starlit-part="bookmark-group-header"
      >
        <Breadcrumb
          aria-label={`${folder.title} ${t('navigation.path')}`}
          data-starlit-part="bookmark-breadcrumb"
          items={getBreadcrumbItems(
            folder,
            folderPath,
            onNavigateToLevel,
            isPreview || !onOpenAsTabGroup
              ? undefined
              : () => onOpenAsTabGroup(currentFolder),
            t('tabGroups.openAction'),
            isPreview,
          )}
        />
        {hasRoute || canCollapse ? (
          <div className="starlit-bookmark-group__header-actions">
            {hasRoute ? (
              <Text
                className="starlit-bookmark-group__route"
                data-starlit-part="bookmark-route"
                tone="muted"
                truncate
                variant="caption"
              >
                {folder.route?.join(' / ')}
              </Text>
            ) : null}
            {canCollapse ? (
              <IconButton
                aria-expanded={isContentExpanded}
                label={`${folder.title}: ${t(
                  isContentExpanded ? 'tree.collapse' : 'tree.expand',
                )}`}
                onClick={() => onContentExpandedChange(!isContentExpanded)}
                size="compact"
                variant="quiet"
              >
                <span aria-hidden="true">{isContentExpanded ? '−' : '+'}</span>
              </IconButton>
            ) : null}
          </div>
        ) : null}
      </header>

      {isContentVisible ? (
        <div
          className="starlit-bookmark-grid"
          data-layout={layout ?? 'vertical'}
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
                layout={layout}
                onActivate={() => onActivateFolder(entry.data)}
                onContextMenu={(event) =>
                  onFolderContextMenu(event, entry.data)
                }
                title={entry.data.title}
              />
            ) : (
              <BookmarkTile
                key={entry.data.id}
                favicon={entry.data.favicon}
                isPreview={isPreview}
                kind="bookmark"
                layout={layout}
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
      ) : null}

      {!isPreview && !isExpanded && totalPages > 1 ? (
        <nav
          aria-label={`${folder.title} ${t('pagination.pages')}`}
          className="starlit-pagination"
          data-starlit-part="pagination"
        >
          <Button
            aria-label={t('pagination.previousPage')}
            data-direction="previous"
            data-starlit-part="pagination-control"
            onClick={() =>
              onPageChange(safePage === 0 ? totalPages - 1 : safePage - 1)
            }
            size="compact"
            variant="quiet"
          >
            ←
          </Button>
          <Text data-starlit-part="pagination-status" variant="data">
            {safePage + 1} / {totalPages}
          </Text>
          <Button
            aria-label={t('pagination.nextPage')}
            data-direction="next"
            data-starlit-part="pagination-control"
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
