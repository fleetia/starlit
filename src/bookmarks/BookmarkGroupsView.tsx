import {
  useMemo,
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
} from 'react';
import { IconButton, Text } from '@fleetia/lagrange';

import { useTranslation } from '../i18n';
import {
  COLLAPSED_GROUP_HEIGHT_PX,
  EXPANDED_GROUP_MIN_HEIGHT_PX,
  getExpandedColumnVisualOrder,
} from '../layout/expandedLayout';
import { positionToPlaceSelf } from '../layout/positionToPlaceSelf';
import type { GridSettings } from '../layout/types';
import type { ExpandedGroupsLayout } from '../layout/useExpandedGroupsLayout';
import { BookmarkGroup } from './BookmarkGroup';
import { getGroupKey } from './bookmarkRoute';
import { getCurrentFolder } from './presentation';
import type { Bookmark, BookmarkItem, BookmarkLayout } from './types';
import { useBookmarkGroupNavigation } from './useBookmarkGroupNavigation';
import '../layout/layout.css';

type SurfaceStyle = CSSProperties & {
  '--starlit-paged-width': string;
};

type ExpandedSurfaceStyle = SurfaceStyle & {
  '--starlit-collapsed-group-height': string;
  '--starlit-expanded-group-min-height': string;
  '--starlit-masonry-columns': number;
};

type BookmarkGroupDescriptor = {
  folder: Bookmark;
  key: string;
};

type BookmarkGroupsViewProps = {
  expandedLayout: ExpandedGroupsLayout;
  gridSettings: GridSettings;
  groups: Bookmark[];
  isExpandView: boolean;
  isOpenInNewTab: boolean;
  layout?: BookmarkLayout;
  onOpenContextMenu: (
    event: MouseEvent<HTMLElement>,
    bookmarkId: string,
    isFolder: boolean,
  ) => void;
  size: number;
};

export function BookmarkGroupsView({
  expandedLayout,
  gridSettings,
  groups,
  isExpandView,
  isOpenInNewTab,
  layout,
  onOpenContextMenu,
  size,
}: BookmarkGroupsViewProps): ReactElement {
  const { t } = useTranslation();
  const {
    activeGroupIndex,
    enterFolder,
    folderPaths,
    groupRailRef,
    navigateToLevel,
    pages,
    scrollToGroup,
    setPage,
  } = useBookmarkGroupNavigation(groups.length);
  const groupDescriptors = useMemo<BookmarkGroupDescriptor[]>(
    () =>
      groups.map((folder) => ({
        folder,
        key: getGroupKey(folder),
      })),
    [groups],
  );
  const groupDescriptorByKey = useMemo(
    () =>
      new Map(
        groupDescriptors.map(
          (descriptor) => [descriptor.key, descriptor] as const,
        ),
      ),
    [groupDescriptors],
  );

  function openBookmark(bookmark: BookmarkItem): void {
    if (isOpenInNewTab) {
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
      return;
    }

    window.location.assign(bookmark.url);
  }

  function renderBookmarkGroup(
    descriptor: BookmarkGroupDescriptor,
    isContentExpanded?: boolean,
    onContentExpandedChange?: (isExpanded: boolean) => void,
  ): ReactElement {
    const { folder, key: groupKey } = descriptor;
    const path = folderPaths[groupKey] ?? [];
    const currentFolder = getCurrentFolder(folder, path);

    return (
      <BookmarkGroup
        key={groupKey}
        currentFolder={currentFolder}
        folder={folder}
        folderPath={path}
        gridSettings={gridSettings}
        isContentExpanded={isContentExpanded}
        isExpanded={isExpandView}
        layout={layout}
        onActivateBookmark={openBookmark}
        onActivateFolder={(child) => enterFolder(groupKey, child)}
        onBookmarkContextMenu={(event, bookmark) =>
          onOpenContextMenu(event, bookmark.id, false)
        }
        onFolderContextMenu={(event, child) => {
          if (child.id) {
            onOpenContextMenu(event, child.id, true);
          }
        }}
        onNavigateToLevel={(level) => navigateToLevel(groupKey, level)}
        onContentExpandedChange={onContentExpandedChange}
        onPageChange={(page) => setPage(groupKey, page)}
        page={pages[groupKey] ?? 0}
      />
    );
  }

  const tileWidth = gridSettings.icon.width ?? 4;
  const gapCount = Math.max(
    0,
    Math.min(9, Math.trunc(gridSettings.columns) - 1),
  );
  const gapWidth = Array.from(
    { length: gapCount },
    () => gridSettings.gap,
  ).join(' + ');
  const pagedWidth = gridSettings.columns * tileWidth * size + 64;
  const surfaceStyle: SurfaceStyle = {
    '--starlit-paged-width': `calc(${pagedWidth}px${gapWidth ? ` + ${gapWidth}` : ''})`,
    placeSelf: positionToPlaceSelf(gridSettings.position),
  };
  const expandedSurfaceStyle: ExpandedSurfaceStyle = {
    ...surfaceStyle,
    '--starlit-collapsed-group-height': `${COLLAPSED_GROUP_HEIGHT_PX}px`,
    '--starlit-expanded-group-min-height': `${EXPANDED_GROUP_MIN_HEIGHT_PX}px`,
    '--starlit-masonry-columns': expandedLayout.columns.length,
    width: expandedLayout.surfaceWidth,
  };

  if (groupDescriptors.length === 0) {
    return (
      <section className="starlit-empty" style={surfaceStyle}>
        <Text tone="muted">{t('newtab.empty')}</Text>
      </section>
    );
  }

  if (isExpandView) {
    return (
      <section
        className="starlit-masonry"
        data-position={gridSettings.position}
        data-starlit-part="expanded-groups"
        style={expandedSurfaceStyle}
      >
        {expandedLayout.columns.map((column, columnIndex) => (
          <div
            key={`expanded-column-${columnIndex}`}
            className="starlit-masonry__column"
            data-column-index={columnIndex}
          >
            {getExpandedColumnVisualOrder(column, gridSettings.position).map(
              (groupKey) => {
                const descriptor = groupDescriptorByKey.get(groupKey);

                return descriptor
                  ? renderBookmarkGroup(
                      descriptor,
                      expandedLayout.openKeySet.has(groupKey),
                      (isOpen) => {
                        void expandedLayout.setGroupOpen(groupKey, isOpen);
                      },
                    )
                  : null;
              },
            )}
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      className="starlit-paged"
      data-single-group={groups.length === 1 || undefined}
      data-starlit-part="paged-groups"
      style={surfaceStyle}
    >
      {groups.length > 1 ? (
        <IconButton
          data-direction="previous"
          data-starlit-part="group-navigation"
          label={t('navigation.previous')}
          onClick={() => scrollToGroup(activeGroupIndex - 1)}
          variant="quiet"
        >
          ←
        </IconButton>
      ) : null}
      <div
        ref={groupRailRef}
        className="starlit-group-rail"
        data-starlit-part="group-rail"
      >
        {groupDescriptors.map((descriptor) => renderBookmarkGroup(descriptor))}
      </div>
      {groups.length > 1 ? (
        <IconButton
          data-direction="next"
          data-starlit-part="group-navigation"
          label={t('navigation.next')}
          onClick={() => scrollToGroup(activeGroupIndex + 1)}
          variant="quiet"
        >
          →
        </IconButton>
      ) : null}
    </section>
  );
}
