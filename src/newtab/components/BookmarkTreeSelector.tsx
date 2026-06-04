import React, { useState, useMemo, useEffect } from "react";
import classNames from "classnames/bind";

import { EyeIcon, DragHandleIcon } from "@fleetia/components/icons";
import { useTranslation } from "@fleetia/components/i18n";

import { Bookmark, GroupPreference, getGroupKey } from "../types";

import styles from "./BookmarkTreeSelector.module.scss";

const cx = classNames.bind(styles);

type Props = {
  bookmarks: Bookmark[];
  rootPath: string[];
  groupPreferences: GroupPreference[];
  onSelectRoot: (path: string[]) => void;
  onSiblingReorder: (parentKey: string, titles: string[]) => void;
  onToggleVisibility: (key: string) => void;
};

/** 트리에서 모든 폴더(children이 있는 항목)의 route를 재귀 수집 */
function collectFolders(
  items: Bookmark[],
  result: { title: string; route: string[] }[] = []
): { title: string; route: string[] }[] {
  for (const bm of items) {
    if (bm.children && bm.children.length > 0) {
      result.push({ title: bm.title, route: bm.route ?? [] });
      collectFolders(bm.children, result);
    }
  }
  return result;
}

/** rootPath에 해당하는 폴더의 children을 찾아 반환 */
function getChildrenAtRoot(
  bookmarks: Bookmark[],
  rootPath: string[]
): Bookmark[] {
  if (rootPath.length === 0) return bookmarks;
  for (const bm of bookmarks) {
    const route = bm.route ?? [];
    if (
      route.length === rootPath.length &&
      route.every((s, i) => s === rootPath[i])
    ) {
      return bm.children ?? [];
    }
    if (
      route.length < rootPath.length &&
      route.every((s, i) => s === rootPath[i]) &&
      bm.children
    ) {
      const found = getChildrenAtRoot(bm.children, rootPath);
      if (found.length > 0) return found;
    }
  }
  return bookmarks;
}

export function BookmarkTreeSelector({
  bookmarks,
  rootPath,
  groupPreferences,
  onSelectRoot,
  onSiblingReorder,
  onToggleVisibility
}: Props) {
  const { t } = useTranslation();
  const folders = useMemo(() => collectFolders(bookmarks), [bookmarks]);

  // rootPath가 빈 배열이면 첫 번째 폴더로 자동 선택
  useEffect(() => {
    if (rootPath.length === 0 && folders.length > 0) {
      onSelectRoot(folders[0].route);
    }
  }, [rootPath, folders, onSelectRoot]);

  const rootPathStr = rootPath.join("/");
  const treeItems = getChildrenAtRoot(bookmarks, rootPath);

  return (
    <div className={cx("tree")}>
      <div className={cx("rootSelect")}>
        <label className={cx("rootLabel")}>{t("groups.rootGroup")}</label>
        <select
          className={cx("rootDropdown")}
          value={rootPathStr}
          onChange={e => {
            const val = e.target.value;
            onSelectRoot(val === "" ? [] : val.split("/"));
          }}
        >
          {folders.map(f => {
            const val = f.route.join("/");
            return (
              <option key={val} value={val}>
                {"\u00A0\u00A0".repeat(Math.max(0, f.route.length - 1)) +
                  f.title}
              </option>
            );
          })}
        </select>
      </div>
      <TreeLevel
        items={treeItems}
        parentKey={rootPathStr}
        depth={0}
        groupPreferences={groupPreferences}
        onSiblingReorder={onSiblingReorder}
        onToggleVisibility={onToggleVisibility}
      />
    </div>
  );
}

type TreeLevelProps = {
  items: Bookmark[];
  parentKey: string;
  depth: number;
  groupPreferences: GroupPreference[];
  onSiblingReorder: (parentKey: string, titles: string[]) => void;
  onToggleVisibility: (key: string) => void;
};

function TreeLevel({
  items,
  parentKey,
  depth,
  groupPreferences,
  onSiblingReorder,
  onToggleVisibility
}: TreeLevelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(items.filter(b => b.children?.length).map(b => b.title))
  );

  const toggleExpand = (title: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const { t } = useTranslation();
  const visibilityMap = new Map(groupPreferences.map(p => [p.key, p.visible]));

  const handleDrop = (toIndex: number) => {
    if (dragIndex != null && dragIndex !== toIndex) {
      const titles = items.map(b => b.title);
      const [moved] = titles.splice(dragIndex, 1);
      titles.splice(toIndex, 0, moved);
      onSiblingReorder(parentKey, titles);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div>
      {items.map((bm, index) => {
        const route = bm.route ?? [];
        const groupKey = getGroupKey(bm);
        const hasChildren = bm.children && bm.children.length > 0;
        const isVisible = visibilityMap.get(groupKey) ?? true;

        return (
          <div key={bm.id ?? bm.title}>
            <div
              className={cx("treeRow", {
                treeRowDragOver: dragOverIndex === index,
                treeRowHidden: !isVisible,
                treeRowFolder: hasChildren
              })}
              style={{ paddingLeft: `${(depth + 1) * 16}px` }}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={e => {
                e.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setDragOverIndex(null);
              }}
            >
              {hasChildren ? (
                <button
                  className={cx("expandButton")}
                  onClick={e => {
                    e.stopPropagation();
                    toggleExpand(bm.title);
                  }}
                >
                  {expanded.has(bm.title) ? "▼" : "▶"}
                </button>
              ) : (
                <span className={cx("expandPlaceholder")} />
              )}
              <span className={cx("folderName")}>{bm.title}</span>
              {depth === 0 && (
                <button
                  className={cx("visibilityToggle")}
                  onClick={e => {
                    e.stopPropagation();
                    onToggleVisibility(groupKey);
                  }}
                  title={isVisible ? t("groups.hide") : t("groups.show")}
                >
                  <EyeIcon isVisible={isVisible} />
                </button>
              )}
              <span
                className={cx("dragHandle")}
                title={t("groups.dragToReorder")}
              >
                <DragHandleIcon />
              </span>
            </div>
            {hasChildren && expanded.has(bm.title) && (
              <TreeLevel
                items={bm.children!}
                parentKey={route.join("/")}
                depth={depth + 1}
                groupPreferences={groupPreferences}
                onSiblingReorder={onSiblingReorder}
                onToggleVisibility={onToggleVisibility}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
