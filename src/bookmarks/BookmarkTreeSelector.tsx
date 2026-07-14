import type { DragEvent, ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { FormField, IconButton, Select, Text } from '@fleetia/lagrange';

import { useTranslation } from '../i18n';
import type { Bookmark, GroupPreference } from '../newtab/types';
import { getBookmarksAtRoot } from './bookmarkTree';
import {
  getBookmarkRouteKey,
  getGroupKey,
  getLegacyGroupKey,
  getRouteGroupKey,
} from './bookmarkRoute';
import * as styles from './BookmarkTreeSelector.css';

export type BookmarkTreeSelectorProps = {
  bookmarks: Bookmark[];
  groupPreferences: GroupPreference[];
  onSelectRoot: (path: string[], rootId?: string) => void;
  onSiblingReorder: (parentKey: string, identities: string[]) => void;
  onToggleVisibility: (key: string) => void;
  rootId?: string;
  rootPath: string[];
  siblingOrder: Record<string, string[]>;
};

type FolderOption = Pick<Bookmark, 'id' | 'route' | 'title'> & {
  route: string[];
};

function collectFolders(items: Bookmark[]): FolderOption[] {
  return items.flatMap((bookmark) => {
    const route = bookmark.route ?? [];
    const children = bookmark.children ?? [];
    const hasContent = children.length > 0 || Boolean(bookmark.list?.length);

    if (!hasContent) {
      return [];
    }

    return [
      ...(route.length > 0
        ? [{ id: bookmark.id, route, title: bookmark.title }]
        : []),
      ...collectFolders(children),
    ];
  });
}

function isSameRoute(
  route: readonly string[],
  rootPath: readonly string[],
): boolean {
  return (
    route.length === rootPath.length &&
    route.every((segment, index) => segment === rootPath[index])
  );
}

function moveIdentity(
  items: Bookmark[],
  fromIndex: number,
  toIndex: number,
): string[] {
  const movedItem = items[fromIndex];

  if (!movedItem || fromIndex === toIndex) {
    return items.map(getGroupKey);
  }

  const remainingItems = items.filter((_, index) => index !== fromIndex);
  const boundedIndex = Math.max(0, Math.min(toIndex, remainingItems.length));

  return [
    ...remainingItems.slice(0, boundedIndex),
    movedItem,
    ...remainingItems.slice(boundedIndex),
  ].map(getGroupKey);
}

export function BookmarkTreeSelector({
  bookmarks,
  groupPreferences,
  onSelectRoot,
  onSiblingReorder,
  onToggleVisibility,
  rootId,
  rootPath,
  siblingOrder,
}: BookmarkTreeSelectorProps): ReactElement {
  const { t } = useTranslation();
  const folders = useMemo(() => collectFolders(bookmarks), [bookmarks]);
  const selectedFolder =
    (rootId ? folders.find((folder) => folder.id === rootId) : undefined) ??
    folders.find((folder) => isSameRoute(folder.route, rootPath));
  const rootPathValue = selectedFolder
    ? getGroupKey(selectedFolder)
    : getBookmarkRouteKey(rootPath);
  const treeItems = getBookmarksAtRoot(
    bookmarks,
    rootPath,
    rootId,
    siblingOrder,
  );

  function handleRootChange(value: string): void {
    if (!value) {
      onSelectRoot([]);
      return;
    }

    const folder = folders.find(
      (candidate) => getGroupKey(candidate) === value,
    );
    if (folder) {
      onSelectRoot(folder.route, folder.id);
    }
  }

  return (
    <div className={styles.tree} data-starlit-part="group-tree">
      <FormField label={t('groups.rootGroup')}>
        <Select
          data-starlit-part="group-root-select"
          onChange={(event) => handleRootChange(event.currentTarget.value)}
          value={rootPathValue}
        >
          <option value="">{t('groups.allTopLevel')}</option>
          {folders.map((folder) => {
            const value = getGroupKey(folder);
            const indent = '\u00a0\u00a0'.repeat(
              Math.max(0, folder.route.length - 1),
            );

            return (
              <option key={value} value={value}>
                {indent}
                {folder.title}
              </option>
            );
          })}
        </Select>
      </FormField>
      <div className={styles.rows} data-starlit-part="group-tree-rows">
        {treeItems.length > 0 ? (
          <TreeLevel
            depth={0}
            groupPreferences={groupPreferences}
            items={treeItems}
            onSiblingReorder={onSiblingReorder}
            onToggleVisibility={onToggleVisibility}
            parentKey={rootPathValue}
          />
        ) : (
          <Text as="p" tone="muted" variant="caption">
            {t('groups.allTopLevel')}
          </Text>
        )}
      </div>
    </div>
  );
}

type TreeLevelProps = {
  depth: number;
  groupPreferences: GroupPreference[];
  items: Bookmark[];
  onSiblingReorder: (parentKey: string, titles: string[]) => void;
  onToggleVisibility: (key: string) => void;
  parentKey: string;
};

function TreeLevel({
  depth,
  groupPreferences,
  items,
  onSiblingReorder,
  onToggleVisibility,
  parentKey,
}: TreeLevelProps): ReactElement {
  const { t } = useTranslation();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () =>
      new Set(
        items
          .filter(({ children }) => Boolean(children?.length))
          .map((bookmark) => getGroupKey(bookmark)),
      ),
  );
  const visibilityMap = useMemo(
    () => new Map(groupPreferences.map(({ key, visible }) => [key, visible])),
    [groupPreferences],
  );

  function toggleExpanded(key: string): void {
    setExpandedKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      if (nextKeys.has(key)) {
        nextKeys.delete(key);
      } else {
        nextKeys.add(key);
      }

      return nextKeys;
    });
  }

  function clearDragState(): void {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>,
    index: number,
  ): void {
    event.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(toIndex: number): void {
    if (dragIndex !== null && dragIndex !== toIndex) {
      onSiblingReorder(parentKey, moveIdentity(items, dragIndex, toIndex));
    }

    clearDragState();
  }

  function handleMove(index: number, offset: -1 | 1): void {
    const nextIndex = index + offset;

    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    onSiblingReorder(parentKey, moveIdentity(items, index, nextIndex));
  }

  return (
    <div className={styles.level} data-depth={depth}>
      {items.map((bookmark, index) => {
        const groupKey = getGroupKey(bookmark);
        const routeGroupKey = getRouteGroupKey(bookmark);
        const legacyGroupKey = getLegacyGroupKey(bookmark);
        const hasChildren = Boolean(bookmark.children?.length);
        const isExpanded = expandedKeys.has(groupKey);
        const isVisible =
          visibilityMap.get(groupKey) ??
          visibilityMap.get(routeGroupKey) ??
          visibilityMap.get(legacyGroupKey) ??
          true;

        return (
          <div key={bookmark.id ?? groupKey}>
            <div
              className={styles.row}
              data-drag-over={dragOverIndex === index || undefined}
              data-folder={hasChildren || undefined}
              data-hidden={!isVisible || undefined}
              data-starlit-part="group-row"
              draggable
              onDragEnd={clearDragState}
              onDragLeave={() => setDragOverIndex(null)}
              onDragOver={(event) => handleDragOver(event, index)}
              onDragStart={() => setDragIndex(index)}
              onDrop={() => handleDrop(index)}
              style={{ paddingInlineStart: `${(depth + 1) * 12}px` }}
            >
              {hasChildren ? (
                <IconButton
                  label={isExpanded ? t('tree.collapse') : t('tree.expand')}
                  onClick={() => toggleExpanded(groupKey)}
                  size="compact"
                  variant="quiet"
                >
                  <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                </IconButton>
              ) : (
                <span aria-hidden="true" className={styles.placeholder} />
              )}
              <Text
                className={styles.folderName}
                truncate
                variant="label"
                weight={hasChildren ? 'strong' : 'regular'}
              >
                {bookmark.title}
              </Text>
              <div className={styles.rowActions}>
                {depth === 0 ? (
                  <IconButton
                    data-starlit-part="group-visibility"
                    label={isVisible ? t('groups.hide') : t('groups.show')}
                    onClick={() => onToggleVisibility(groupKey)}
                    size="compact"
                    variant="quiet"
                  >
                    <span aria-hidden="true">{isVisible ? '●' : '○'}</span>
                  </IconButton>
                ) : null}
                <IconButton
                  disabled={index === 0}
                  label={`${t('groups.dragToReorder')} ↑`}
                  onClick={() => handleMove(index, -1)}
                  size="compact"
                  variant="quiet"
                >
                  <span aria-hidden="true">↑</span>
                </IconButton>
                <IconButton
                  disabled={index === items.length - 1}
                  label={`${t('groups.dragToReorder')} ↓`}
                  onClick={() => handleMove(index, 1)}
                  size="compact"
                  variant="quiet"
                >
                  <span aria-hidden="true">↓</span>
                </IconButton>
                <span
                  aria-hidden="true"
                  className={styles.dragHandle}
                  title={t('groups.dragToReorder')}
                >
                  ⋮⋮
                </span>
              </div>
            </div>
            {hasChildren && isExpanded && bookmark.children ? (
              <TreeLevel
                depth={depth + 1}
                groupPreferences={groupPreferences}
                items={bookmark.children}
                onSiblingReorder={onSiblingReorder}
                onToggleVisibility={onToggleVisibility}
                parentKey={getGroupKey(bookmark)}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
