import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from "react";
import classNames from "classnames/bind";

import { IconButton } from "@fleetia/components/IconButton";
import {
  Breadcrumb,
  type BreadcrumbItem
} from "@fleetia/components/Breadcrumb";
import { Box } from "@fleetia/components/Box";
import { ContextMenu } from "@fleetia/components/ContextMenu";
import { NavigationButton } from "@fleetia/components/NavigationButton";
import { CardPagination } from "@fleetia/components/CardPagination";
import { GearIcon } from "@fleetia/components/icons";
import { setCSSVariable } from "@fleetia/components";
import { useTranslation, type Locale } from "@fleetia/components/i18n";
import { useStorageState } from "@/hooks/useStorageState";
import { fileToDataUrl } from "@/utils/fileToDataUrl";
import { sanitizeCSS } from "@/utils/sanitizeCSS";

import { Bookmark, GridSettings, Settings, getGroupKey } from "./types";
import { useBookmarks } from "./hooks/useBookmarks";
import { useGridSettings } from "./hooks/useGridSettings";
import { useSettings } from "./hooks/useSettings";
import { useBackgroundImage } from "./hooks/useBackgroundImage";
import { useTheme } from "./hooks/useTheme";
import { useGroupPreferences } from "./hooks/useGroupPreferences";
import { useBookmarkTreePrefs } from "./hooks/useBookmarkTreePrefs";
import { applySiblingOrder, getBookmarksAtRoot } from "./utils/bookmarkTree";
import { positionToPlaceSelf } from "./utils/positionToPlaceSelf";
import { OptionsSidebar } from "./components/OptionsSidebar";

import styles from "./NewTabApp.module.scss";

const cx = classNames.bind(styles);

type NewTabAppProps = {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
};

export function NewTabApp({
  locale,
  onLocaleChange
}: NewTabAppProps): React.ReactElement {
  const { t } = useTranslation();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    bookmarkId: string;
    folderKey: string;
    isFolder?: boolean;
  } | null>(null);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState<boolean>(false);
  const { value: size, setValue: setSizeStorage } = useStorageState<number>(
    "size",
    20
  );
  const { value: iconSize, setValue: setIconSizeStorage } =
    useStorageState<number>("iconSize", 32);
  const { value: customCSS, setValue: setCustomCSS } = useStorageState<string>(
    "customCSS",
    ""
  );
  const [cardPages, setCardPages] = useState<Record<string, number>>({});
  const [folderPaths, setFolderPaths] = useState<Record<string, Bookmark[]>>(
    {}
  );
  const [scrollIndex, setScrollIndex] = useState(0);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const faviconTargetRef = useRef<{
    bookmarkId: string;
    folderKey: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    bookmarks,
    handleDeleteBookmark,
    handleUpdateFavicon,
    handleResetFavicon
  } = useBookmarks();

  const { gridSettings, updateGridSettings } = useGridSettings();
  const { settings, updateSettings } = useSettings();
  const {
    meta: bgMeta,
    blobUrl: bgBlobUrl,
    isProcessing: bgProcessing,
    updateFromUrl: updateBgUrl,
    updateFromFile: updateBgFile,
    clear: clearBg
  } = useBackgroundImage();
  const { colorTheme, updateTheme, applyPreset, resetTheme } = useTheme();
  const { rootPath, siblingOrder, setRootPath, updateSiblingOrder } =
    useBookmarkTreePrefs();

  const orderedTree = useMemo(
    () => applySiblingOrder(bookmarks, siblingOrder),
    [bookmarks, siblingOrder]
  );
  const rootBookmarks = useMemo(
    () => getBookmarksAtRoot(orderedTree, rootPath),
    [orderedTree, rootPath]
  );

  const { groupPreferences, orderedBookmarks, toggleVisibility } =
    useGroupPreferences(rootBookmarks);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const handleItemClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const url = e.currentTarget.dataset.url;
      if (url) {
        if (settingsRef.current.isOpenInNewTab) {
          window.open(url, "_blank");
        } else {
          window.location.href = url;
        }
      }
    },
    []
  );

  const orderedBookmarksRef = useRef(orderedBookmarks);
  useEffect(() => {
    orderedBookmarksRef.current = orderedBookmarks;
  }, [orderedBookmarks]);

  const handleFolderClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const folderKey = e.currentTarget.dataset.folderKey;
      const bookmarkId = e.currentTarget.dataset.bookmarkId;
      if (!folderKey || !bookmarkId) return;

      // Find the child bookmark by id from orderedBookmarks
      const findChild = (
        folders: Bookmark[],
        id: string
      ): Bookmark | undefined => {
        for (const folder of folders) {
          for (const child of folder.children ?? []) {
            if (child.id === id) return child;
            const found = findChild([child], id);
            if (found) return found;
          }
        }
        return undefined;
      };

      const child = findChild(orderedBookmarksRef.current, bookmarkId);
      if (!child) return;

      setFolderPaths(prev => ({
        ...prev,
        [folderKey]: [...(prev[folderKey] ?? []), child]
      }));
      setCardPages(prev => ({ ...prev, [folderKey]: 0 }));
    },
    []
  );

  const handleItemContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const btn = e.currentTarget as HTMLButtonElement;
    const bookmarkId = btn.dataset.bookmarkId;
    const folderKey = btn.dataset.folderKey;
    if (!bookmarkId || !folderKey) return;
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      bookmarkId,
      folderKey
    });
  }, []);

  const handleFolderContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const btn = e.currentTarget as HTMLButtonElement;
    const bookmarkId = btn.dataset.bookmarkId;
    const folderKey = btn.dataset.folderKey;
    if (!bookmarkId || !folderKey) return;
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      bookmarkId,
      folderKey,
      isFolder: true
    });
  }, []);

  useEffect(() => {
    if (!contextMenu) return;

    function handleClickOutside(): void {
      setContextMenu(null);
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu]);

  const handleFaviconUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const target = faviconTargetRef.current;
      if (!file || !target) return;

      const dataUrl = await fileToDataUrl(file);
      await handleUpdateFavicon(0, target.bookmarkId, dataUrl);
      faviconTargetRef.current = null;
      e.target.value = "";
    },
    [handleUpdateFavicon]
  );

  async function handleSizeChange(value: number): Promise<void> {
    await setSizeStorage(value);
  }

  useEffect(() => {
    setCSSVariable("--em", `${size}px`);
  }, [size]);

  useEffect(() => {
    setCSSVariable("--icon-size", `${iconSize}px`);
  }, [iconSize]);

  useEffect(() => {
    const ic = gridSettings.icon;
    if (!ic) return;
    if (ic.width != null)
      setCSSVariable("--icon-width", `calc(${ic.width} * var(--em))`);
    if (ic.height != null)
      setCSSVariable("--icon-height", `calc(${ic.height} * var(--em))`);
    if (ic.borderRadius != null)
      setCSSVariable("--icon-borderRadius", `${ic.borderRadius}px`);
    if (ic.iconRadius != null)
      setCSSVariable("--icon-iconRadius", `${ic.iconRadius}px`);
  }, [gridSettings.icon]);

  useEffect(() => {
    const h = gridSettings.heading;
    if (!h) return;
    setCSSVariable("--heading-title-color", h.titleColor);
    setCSSVariable(
      "--heading-title-size",
      h.titleSize ? `${h.titleSize}px` : ""
    );
    setCSSVariable("--heading-subtitle-color", h.subtitleColor);
    setCSSVariable(
      "--heading-subtitle-size",
      h.subtitleSize ? `${h.subtitleSize}px` : ""
    );
    setCSSVariable("--heading-subtitle-hover-color", h.subtitleHoverColor);
    setCSSVariable(
      "--heading-text-stroke",
      h.borderEnabled ? `${h.borderWidth}px ${h.borderColor}` : "none"
    );
    if (h.borderRadius != null)
      setCSSVariable("--container-border-radius", `${h.borderRadius}px`);
  }, [gridSettings.heading]);

  useEffect(() => {
    const f = gridSettings.folder;
    if (!f) return;
    setCSSVariable("--folder-color", f.color);
    setCSSVariable("--folder-accent", f.accent);
    setCSSVariable("--folder-accent-text", f.accentText);
    setCSSVariable("--folder-text", f.text);
    if (f.border) setCSSVariable("--folder-border", f.border);
  }, [gridSettings.folder]);

  useEffect(() => {
    const m = gridSettings.margin;
    if (!m) return;
    setCSSVariable("--grid-margin-top", `${m.top}px`);
    setCSSVariable("--grid-margin-bottom", `${m.bottom}px`);
    setCSSVariable("--grid-margin-left", `${m.left}px`);
    setCSSVariable("--grid-margin-right", `${m.right}px`);
  }, [gridSettings.margin]);

  async function handleIconSizeChange(value: number): Promise<void> {
    await setIconSizeStorage(value);
  }

  async function handleSettingChange(
    key: keyof Settings,
    value: boolean | string
  ): Promise<void> {
    const newSettings = { ...settings, [key]: value };
    await updateSettings(newSettings);
  }

  function navigateToLevel(folderKey: string, level: number): void {
    setFolderPaths(prev => ({
      ...prev,
      [folderKey]: (prev[folderKey] ?? []).slice(0, level + 1)
    }));
    setCardPages(prev => ({ ...prev, [folderKey]: 0 }));
  }

  function getCurrentFolder(folder: Bookmark, folderKey: string): Bookmark {
    const path = folderPaths[folderKey] ?? [];
    let current = folder;
    for (const seg of path) {
      const found = (current.children ?? []).find(c =>
        seg.id ? c.id === seg.id : c.title === seg.title
      );
      if (!found) break;
      current = found;
    }
    return current;
  }

  async function handleGridSettingChange(
    key: keyof GridSettings,
    value: number | string
  ): Promise<void> {
    const newGridSettings = { ...gridSettings, [key]: value };
    await updateGridSettings(newGridSettings);
  }

  function scrollToGroup(index: number): void {
    const container = scrollRef.current;
    if (!container) return;
    const child = container.children[index] as HTMLElement | undefined;
    if (child) {
      child.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });
    }
  }

  const handleOptionsClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setIsOptionsMenuOpen(prev => !prev);
  };

  function buildBreadcrumbItems(
    folder: Bookmark,
    folderKey: string,
    path: Bookmark[]
  ): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [
      {
        label: folder.title,
        onClick: () => setFolderPaths(prev => ({ ...prev, [folderKey]: [] }))
      }
    ];
    path.forEach((seg, i) => {
      items.push({
        label: seg.title,
        onClick: () => navigateToLevel(folderKey, i)
      });
    });
    return items;
  }

  const iconWidth = gridSettings.icon?.width ?? 4;

  return (
    <div className={cx("container")}>
      {customCSS && (
        <style dangerouslySetInnerHTML={{ __html: sanitizeCSS(customCSS) }} />
      )}
      {bgMeta?.type === "video" ? (
        <video
          className={cx("background-video")}
          src={bgMeta.source === "url" ? bgMeta.url : bgBlobUrl}
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        <div className={cx("background")} />
      )}

      <main className={cx("main")}>
        {gridSettings.background?.gridImage && (
          <img
            src={gridSettings.background.gridImage}
            className={cx("grid-background")}
            alt={"grid background"}
          />
        )}
        {settings.isExpandView ? (
          <section
            className={cx("masonry", {
              "masonry-bottom": (
                gridSettings.position || "center-center"
              ).startsWith("bottom")
            })}
            style={{
              ["--masonry-card-width" as string]: `calc(var(--em) * ${gridSettings.columns} * ${iconWidth} + var(--gap) * ${gridSettings.columns - 1} + var(--gap) * 2)`,
              columnCount: gridSettings.masonryColumns ?? 2,
              placeSelf: positionToPlaceSelf(gridSettings.position)
            }}
          >
            {orderedBookmarks.map(folder => {
              const folderKey = getGroupKey(folder);
              const path = folderPaths[folderKey] ?? [];
              const currentFolder = getCurrentFolder(folder, folderKey);

              return (
                <Box
                  key={folderKey}
                  className={cx("masonry-card")}
                  title={
                    <Breadcrumb
                      items={buildBreadcrumbItems(folder, folderKey, path)}
                    />
                  }
                  subtitle={folder.route?.join(" / ")}
                >
                  <div
                    className={cx("masonry-card-grid")}
                    style={{
                      gridTemplateColumns: `repeat(${settings.iconLayout === "horizontal" ? (gridSettings.horizontalColumns ?? 1) : gridSettings.columns}, 1fr)`
                    }}
                  >
                    {(currentFolder.children ?? []).map(child => (
                      <IconButton
                        key={child.id ?? child.title}
                        type={"folder"}
                        name={child.title}
                        iconUrl={child.favicon}
                        layout={settings.iconLayout}
                        bookmarkId={child.id}
                        folderKey={folderKey}
                        onClick={handleFolderClick}
                        onContextMenu={
                          child.id ? handleFolderContextMenu : undefined
                        }
                      />
                    ))}
                    {(currentFolder.list ?? []).map(
                      ({ url, id, favicon, title }) => (
                        <IconButton
                          key={id}
                          type={"normal"}
                          name={title}
                          iconUrl={favicon}
                          layout={settings.iconLayout}
                          bookmarkId={id}
                          url={url}
                          folderKey={folderKey}
                          onClick={handleItemClick}
                          onContextMenu={handleItemContextMenu}
                        />
                      )
                    )}
                  </div>
                </Box>
              );
            })}
          </section>
        ) : (
          <section
            className={cx("bookmarksSection")}
            style={{
              placeSelf: positionToPlaceSelf(gridSettings.position)
            }}
          >
            {orderedBookmarks.length > 1 && (
              <NavigationButton
                direction="left"
                onClick={() => {
                  const prev =
                    scrollIndex === 0
                      ? orderedBookmarks.length - 1
                      : scrollIndex - 1;
                  setScrollIndex(prev);
                  scrollToGroup(prev);
                }}
              />
            )}

            <div
              ref={scrollRef}
              className={cx("scroll-container")}
              style={{
                width: `calc(var(--em) * ${gridSettings.columns} * ${iconWidth} + var(--gap) * ${gridSettings.columns - 1} + var(--gap)*2 + 2px)`,
                gridAutoColumns:
                  settings.iconLayout === "horizontal" ? "100%" : undefined
              }}
            >
              {orderedBookmarks.map(folder => {
                const folderKey = getGroupKey(folder);
                const currentFolder = getCurrentFolder(folder, folderKey);
                const path = folderPaths[folderKey] ?? [];
                const { columns, rows } = gridSettings;
                const isHorizontal = settings.iconLayout === "horizontal";
                const hCols = gridSettings.horizontalColumns ?? 1;
                const max = isHorizontal ? hCols * rows : columns * rows;
                const bookmarkItems = currentFolder.list ?? [];
                const childFolders = currentFolder.children ?? [];
                const totalItems = bookmarkItems.length + childFolders.length;
                const totalPages = Math.ceil(totalItems / max);
                const pageIndex = cardPages[folderKey] ?? 0;
                const start = pageIndex * max;
                const end = (pageIndex + 1) * max;

                const allEntries: Array<
                  | { type: "item"; data: (typeof bookmarkItems)[number] }
                  | { type: "folder"; data: Bookmark }
                > = [
                  ...childFolders.map(child => ({
                    type: "folder" as const,
                    data: child
                  })),
                  ...bookmarkItems.map(item => ({
                    type: "item" as const,
                    data: item
                  }))
                ];
                const visibleEntries = allEntries.slice(start, end);
                const placeholderCount = max - visibleEntries.length;

                return (
                  <div
                    key={folderKey}
                    className={cx("grid-wrapper")}
                    style={isHorizontal ? { width: "100%" } : undefined}
                  >
                    <div
                      className={cx("grid")}
                      style={{
                        gridTemplateColumns: `repeat(${isHorizontal ? hCols : gridSettings.columns}, 1fr)`,
                        gridTemplateRows: `repeat(${gridSettings.rows}, 1fr)`
                      }}
                    >
                      <div className={cx("breadcrumb", "outline")}>
                        <Breadcrumb
                          items={buildBreadcrumbItems(folder, folderKey, path)}
                        />
                      </div>
                      <div className={cx("route", "outline")}>
                        {folder.route?.join("/")}
                      </div>
                      {visibleEntries.map(entry =>
                        entry.type === "item" ? (
                          <IconButton
                            key={entry.data.id}
                            type={"normal"}
                            name={entry.data.title}
                            iconUrl={
                              (entry.data as (typeof bookmarkItems)[number])
                                .favicon
                            }
                            layout={settings.iconLayout}
                            bookmarkId={entry.data.id}
                            url={
                              (entry.data as (typeof bookmarkItems)[number]).url
                            }
                            folderKey={folderKey}
                            onClick={handleItemClick}
                            onContextMenu={handleItemContextMenu}
                          />
                        ) : (
                          <IconButton
                            key={
                              (entry.data as Bookmark).id ??
                              (entry.data as Bookmark).title
                            }
                            type={"folder"}
                            name={(entry.data as Bookmark).title}
                            iconUrl={(entry.data as Bookmark).favicon}
                            layout={settings.iconLayout}
                            bookmarkId={(entry.data as Bookmark).id}
                            folderKey={folderKey}
                            onClick={handleFolderClick}
                            onContextMenu={
                              (entry.data as Bookmark).id
                                ? handleFolderContextMenu
                                : undefined
                            }
                          />
                        )
                      )}
                      {Array.from({ length: placeholderCount }, (_, i) => (
                        <div
                          key={`placeholder-${i}`}
                          className={cx("placeholder")}
                        />
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <CardPagination
                        currentPage={pageIndex}
                        totalPages={totalPages}
                        onPrev={() =>
                          setCardPages(prev => ({
                            ...prev,
                            [folderKey]:
                              pageIndex === 0 ? totalPages - 1 : pageIndex - 1
                          }))
                        }
                        onNext={() =>
                          setCardPages(prev => ({
                            ...prev,
                            [folderKey]:
                              pageIndex === totalPages - 1 ? 0 : pageIndex + 1
                          }))
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {orderedBookmarks.length > 1 && (
              <NavigationButton
                direction="right"
                onClick={() => {
                  const next =
                    scrollIndex === orderedBookmarks.length - 1
                      ? 0
                      : scrollIndex + 1;
                  setScrollIndex(next);
                  scrollToGroup(next);
                }}
              />
            )}
          </section>
        )}
      </main>

      <button
        className={cx("optionsButton")}
        onClick={handleOptionsClick}
        title={t("newtab.options")}
      >
        <GearIcon />
      </button>

      {isOptionsMenuOpen && (
        <OptionsSidebar
          onClose={() => setIsOptionsMenuOpen(false)}
          gridSettings={gridSettings}
          settings={settings}
          size={size}
          iconSize={iconSize}
          onGridSettingChange={handleGridSettingChange}
          onGridSettingsUpdate={updateGridSettings}
          onSettingChange={handleSettingChange}
          onSizeChange={handleSizeChange}
          onIconSizeChange={handleIconSizeChange}
          onBackgroundUrl={updateBgUrl}
          onBackgroundFile={updateBgFile}
          isBackgroundProcessing={bgProcessing}
          onBackgroundClear={clearBg}
          backgroundMeta={bgMeta}
          colorTheme={colorTheme}
          onThemeChange={updateTheme}
          onThemeReset={resetTheme}
          onThemePreset={applyPreset}
          orderedTree={orderedTree}
          rootPath={rootPath}
          groupPreferences={groupPreferences}
          onSelectRoot={setRootPath}
          onSiblingReorder={updateSiblingOrder}
          onToggleVisibility={toggleVisibility}
          customCSS={customCSS}
          onCustomCSSChange={setCustomCSS}
          locale={locale}
          onLocaleChange={onLocaleChange}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            {
              label: t("contextMenu.changeIcon"),
              onClick: () => {
                faviconTargetRef.current = {
                  bookmarkId: contextMenu.bookmarkId,
                  folderKey: contextMenu.folderKey
                };
                faviconInputRef.current?.click();
              }
            },
            {
              label: t("contextMenu.resetIcon"),
              onClick: () => handleResetFavicon(contextMenu.bookmarkId)
            },
            ...(!contextMenu.isFolder
              ? [
                  {
                    label: t("contextMenu.delete"),
                    onClick: () => handleDeleteBookmark(contextMenu.bookmarkId),
                    variant: "danger" as const
                  }
                ]
              : [])
          ]}
        />
      )}

      <input
        ref={faviconInputRef}
        type="file"
        accept="image/*"
        className={cx("hiddenInput")}
        onChange={handleFaviconUpload}
      />
    </div>
  );
}
