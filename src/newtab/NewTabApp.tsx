import type {
  ChangeEvent,
  CSSProperties,
  MouseEvent,
  ReactElement,
} from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ContextMenu,
  ContextMenuItem,
  Icon,
  IconButton,
  Text,
  ThemeRoot,
} from '@fleetia/lagrange';

import { BookmarkGroup } from '../bookmarks/BookmarkGroup';
import {
  applySiblingOrder,
  getBookmarksAtRoot,
} from '../bookmarks/bookmarkTree';
import { getGroupKey } from '../bookmarks/bookmarkRoute';
import { getCurrentFolder } from '../bookmarks/presentation';
import { useBookmarks } from '../bookmarks/useBookmarks';
import { useBookmarkTreePrefs } from '../bookmarks/useBookmarkTreePrefs';
import { useGroupPreferences } from '../bookmarks/useGroupPreferences';
import { useStorageState } from '../hooks/useStorageState';
import { type Locale, useTranslation } from '../i18n';
import { getLayoutStyle, type CssVariableStyle } from '../theme/starlitTheme';
import { fileToDataUrl } from '../platform/files/fileToDataUrl';
import { OptionsSidebar } from '../settings/OptionsSidebar';
import { sanitizeCSS } from '../settings/sanitizeCSS';
import { useBackgroundImage } from '../settings/useBackgroundImage';
import { useGridSettings } from '../settings/useGridSettings';
import { useSettings } from '../settings/useSettings';
import { useTheme } from '../settings/useTheme';
import type { Bookmark, BookmarkItem } from './types';
import { positionToPlaceSelf } from './utils/positionToPlaceSelf';

type ContextTarget = {
  bookmarkId: string;
  folderKey: string;
  isFolder: boolean;
  point: { x: number; y: number };
};

type AppStyle = CssVariableStyle & {
  '--background-image': string;
  '--starlit-background-image': string;
};

type SurfaceStyle = CSSProperties & {
  '--starlit-paged-width': string;
};

type NewTabAppProps = {
  locale: Locale;
  onLocaleChange: (locale: Locale) => Promise<void>;
};

function SettingsIcon(): ReactElement {
  return (
    <Icon size="sm" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="2.25" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" />
    </Icon>
  );
}

export function NewTabApp({
  locale,
  onLocaleChange,
}: NewTabAppProps): ReactElement {
  const { t } = useTranslation();
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(
    null,
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardPages, setCardPages] = useState<Record<string, number>>({});
  const [folderPaths, setFolderPaths] = useState<Record<string, Bookmark[]>>(
    {},
  );
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const faviconTargetRef = useRef<ContextTarget | null>(null);
  const groupRailRef = useRef<HTMLDivElement>(null);

  const {
    isLoaded: isSizeLoaded,
    value: size,
    setValue: setSize,
  } = useStorageState<number>('size', 16);
  const {
    isLoaded: isIconSizeLoaded,
    value: iconSize,
    setValue: setIconSize,
  } = useStorageState<number>('iconSize', 28);
  const {
    isLoaded: isCustomCSSLoaded,
    value: customCSS,
    setValue: setCustomCSS,
  } = useStorageState<string>('customCSS', '');
  const {
    bookmarks,
    handleDeleteBookmark,
    handleResetFavicon,
    handleUpdateFavicon,
    isLoaded: areBookmarksLoaded,
  } = useBookmarks();
  const {
    gridSettings,
    isLoaded: isGridSettingsLoaded,
    updateGridSettings,
  } = useGridSettings();
  const {
    isLoaded: areSettingsLoaded,
    settings,
    updateSettings,
  } = useSettings();
  const {
    backgroundImage,
    blobUrl: backgroundBlobUrl,
    clear: clearBackground,
    isLoaded: isBackgroundLoaded,
    isMediaMissing,
    isProcessing: isBackgroundProcessing,
    meta: backgroundMeta,
    updateFromFile: updateBackgroundFromFile,
    updateFromUrl: updateBackgroundFromUrl,
  } = useBackgroundImage();
  const {
    applyPreset,
    colorTheme,
    isLoaded: isThemeLoaded,
    resetTheme,
    themeStyle,
  } = useTheme();
  const {
    isLoaded: areBookmarkTreePrefsLoaded,
    rootId,
    rootPath,
    siblingOrder,
    updatePreferences,
  } = useBookmarkTreePrefs();

  const orderedTree = useMemo(
    () => applySiblingOrder(bookmarks, siblingOrder),
    [bookmarks, siblingOrder],
  );
  const rootBookmarks = useMemo(
    () => getBookmarksAtRoot(orderedTree, rootPath, rootId, siblingOrder),
    [orderedTree, rootId, rootPath, siblingOrder],
  );
  const {
    groupPreferences,
    isLoaded: areGroupPreferencesLoaded,
    orderedBookmarks,
    updateGroupPreferences,
  } = useGroupPreferences(rootBookmarks, orderedTree);
  const areSettingsSourcesLoaded =
    isSizeLoaded &&
    isIconSizeLoaded &&
    isCustomCSSLoaded &&
    areBookmarksLoaded &&
    isGridSettingsLoaded &&
    areSettingsLoaded &&
    isBackgroundLoaded &&
    isThemeLoaded &&
    areBookmarkTreePrefsLoaded &&
    areGroupPreferencesLoaded;
  const appStyle: AppStyle = {
    ...themeStyle,
    ...getLayoutStyle(gridSettings, size, iconSize),
    '--background-image': backgroundImage,
    '--starlit-background-image': backgroundImage,
  };
  const sanitizedCustomCSS = useMemo(() => sanitizeCSS(customCSS), [customCSS]);
  const resolvedBackgroundUrl =
    backgroundMeta?.source === 'url' ? backgroundMeta.url : backgroundBlobUrl;

  const openBookmark = useCallback(
    (bookmark: BookmarkItem): void => {
      if (settings.isOpenInNewTab) {
        window.open(bookmark.url, '_blank', 'noopener,noreferrer');
        return;
      }

      window.location.assign(bookmark.url);
    },
    [settings.isOpenInNewTab],
  );

  function enterFolder(folderKey: string, folder: Bookmark): void {
    setFolderPaths((previous) => ({
      ...previous,
      [folderKey]: [...(previous[folderKey] ?? []), folder],
    }));
    setCardPages((previous) => ({ ...previous, [folderKey]: 0 }));
  }

  function navigateToLevel(folderKey: string, level: number): void {
    setFolderPaths((previous) => ({
      ...previous,
      [folderKey]: (previous[folderKey] ?? []).slice(0, level + 1),
    }));
    setCardPages((previous) => ({ ...previous, [folderKey]: 0 }));
  }

  function openContextMenu(
    event: MouseEvent<HTMLElement>,
    folderKey: string,
    bookmarkId: string,
    isFolder: boolean,
  ): void {
    event.preventDefault();
    setContextTarget({
      bookmarkId,
      folderKey,
      isFolder,
      point: { x: event.clientX, y: event.clientY },
    });
  }

  function scrollToGroup(index: number): void {
    const count = orderedBookmarks.length;
    if (count === 0) {
      return;
    }

    const nextIndex = (index + count) % count;
    setActiveGroupIndex(nextIndex);
    const group = groupRailRef.current?.children[nextIndex];
    if (group instanceof HTMLElement) {
      group.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }
  }

  async function handleFaviconUpload(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.currentTarget.files?.[0];
    const target = faviconTargetRef.current;
    event.currentTarget.value = '';

    if (!file || !target) {
      return;
    }

    const favicon = await fileToDataUrl(file);
    await handleUpdateFavicon(0, target.bookmarkId, favicon);
    faviconTargetRef.current = null;
  }

  const groups = orderedBookmarks.map((folder) => {
    const folderKey = getGroupKey(folder);
    const path = folderPaths[folderKey] ?? [];
    const currentFolder = getCurrentFolder(folder, path);

    return (
      <BookmarkGroup
        key={folderKey}
        currentFolder={currentFolder}
        folder={folder}
        folderPath={path}
        gridSettings={gridSettings}
        isExpanded={settings.isExpandView}
        onActivateBookmark={openBookmark}
        onActivateFolder={(child) => enterFolder(folderKey, child)}
        onBookmarkContextMenu={(event, bookmark) =>
          openContextMenu(event, folderKey, bookmark.id, false)
        }
        onFolderContextMenu={(event, child) => {
          if (child.id) {
            openContextMenu(event, folderKey, child.id, true);
          }
        }}
        onNavigateToLevel={(level) => navigateToLevel(folderKey, level)}
        onPageChange={(page) =>
          setCardPages((previous) => ({ ...previous, [folderKey]: page }))
        }
        page={cardPages[folderKey] ?? 0}
        settings={settings}
      />
    );
  });

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

  return (
    <ThemeRoot
      className="starlit-root"
      data-starlit-part="root"
      style={appStyle}
    >
      {sanitizedCustomCSS ? (
        <style data-starlit-part="custom-css">{sanitizedCustomCSS}</style>
      ) : null}

      {!isMediaMissing &&
      backgroundMeta?.type === 'video' &&
      resolvedBackgroundUrl ? (
        <video
          aria-hidden="true"
          autoPlay
          className="starlit-background-media"
          data-starlit-part="background-media"
          loop
          muted
          playsInline
          src={resolvedBackgroundUrl}
        />
      ) : backgroundImage !== 'none' ? (
        <div
          aria-hidden="true"
          className="starlit-background-image"
          data-starlit-part="background-media"
        />
      ) : null}

      <main className="starlit-main" data-starlit-part="main">
        {gridSettings.background.gridImage ? (
          <img
            alt=""
            aria-hidden="true"
            className="starlit-grid-texture"
            src={gridSettings.background.gridImage}
          />
        ) : null}

        {groups.length === 0 ? (
          <section className="starlit-empty" style={surfaceStyle}>
            <Text tone="muted">{t('newtab.empty')}</Text>
          </section>
        ) : settings.isExpandView ? (
          <section
            className="starlit-masonry"
            data-position={gridSettings.position}
            data-starlit-part="expanded-groups"
            style={{
              ...surfaceStyle,
              columnCount: gridSettings.masonryColumns ?? 2,
            }}
          >
            {groups}
          </section>
        ) : (
          <section
            className="starlit-paged"
            data-single-group={orderedBookmarks.length === 1 || undefined}
            data-starlit-part="paged-groups"
            style={surfaceStyle}
          >
            {orderedBookmarks.length > 1 ? (
              <IconButton
                label={t('navigation.previous')}
                onClick={() => scrollToGroup(activeGroupIndex - 1)}
                variant="quiet"
              >
                ←
              </IconButton>
            ) : null}
            <div ref={groupRailRef} className="starlit-group-rail">
              {groups}
            </div>
            {orderedBookmarks.length > 1 ? (
              <IconButton
                label={t('navigation.next')}
                onClick={() => scrollToGroup(activeGroupIndex + 1)}
                variant="quiet"
              >
                →
              </IconButton>
            ) : null}
          </section>
        )}
      </main>

      <IconButton
        className="starlit-settings-trigger"
        data-starlit-part="settings-trigger"
        disabled={!areSettingsSourcesLoaded}
        label={t('newtab.options')}
        onClick={() => {
          if (areSettingsSourcesLoaded) {
            setIsSettingsOpen(true);
          }
        }}
        variant="default"
      >
        <SettingsIcon />
      </IconButton>

      {isSettingsOpen && areSettingsSourcesLoaded ? (
        <OptionsSidebar
          backgroundMeta={backgroundMeta}
          colorTheme={colorTheme}
          customCSS={customCSS}
          gridSettings={gridSettings}
          groupPreferences={groupPreferences}
          iconSize={iconSize}
          isBackgroundProcessing={isBackgroundProcessing}
          locale={locale}
          onBackgroundClear={clearBackground}
          onBackgroundFile={updateBackgroundFromFile}
          onBackgroundUrl={updateBackgroundFromUrl}
          onBookmarkTreePreferencesUpdate={updatePreferences}
          onClose={() => setIsSettingsOpen(false)}
          onCustomCSSChange={setCustomCSS}
          onGridSettingsUpdate={updateGridSettings}
          onGroupPreferencesUpdate={updateGroupPreferences}
          onIconSizeChange={setIconSize}
          onLocaleChange={onLocaleChange}
          onSettingsUpdate={updateSettings}
          onSizeChange={setSize}
          onThemePreset={applyPreset}
          onThemeReset={resetTheme}
          orderedTree={orderedTree}
          preview={({ gridSettings: draftGrid, settings: draftSettings }) => {
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
                  ...draftGrid,
                  columns: 2,
                  horizontalColumns: 2,
                  rows: 1,
                }}
                isExpanded
                isPreview
                onActivateBookmark={() => undefined}
                onActivateFolder={() => undefined}
                onBookmarkContextMenu={() => undefined}
                onFolderContextMenu={() => undefined}
                onNavigateToLevel={() => undefined}
                onPageChange={() => undefined}
                page={0}
                settings={draftSettings}
              />
            );
          }}
          rootId={rootId}
          rootPath={rootPath}
          settings={settings}
          siblingOrder={siblingOrder}
          size={size}
        />
      ) : null}

      <ContextMenu
        anchorPoint={contextTarget?.point ?? { x: 0, y: 0 }}
        isOpen={contextTarget !== null}
        label={t('contextMenu.label')}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setContextTarget(null);
          }
        }}
      >
        <ContextMenuItem
          onSelect={() => {
            faviconTargetRef.current = contextTarget;
            faviconInputRef.current?.click();
          }}
        >
          {t('contextMenu.changeIcon')}
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            if (contextTarget) {
              void handleResetFavicon(contextTarget.bookmarkId);
            }
          }}
        >
          {t('contextMenu.resetIcon')}
        </ContextMenuItem>
        {!contextTarget?.isFolder ? (
          <ContextMenuItem
            onSelect={() => {
              if (contextTarget) {
                void handleDeleteBookmark(contextTarget.bookmarkId);
              }
            }}
            tone="critical"
          >
            {t('contextMenu.delete')}
          </ContextMenuItem>
        ) : null}
      </ContextMenu>

      <input
        ref={faviconInputRef}
        accept="image/*"
        className="starlit-visually-hidden"
        onChange={(event) => void handleFaviconUpload(event)}
        tabIndex={-1}
        type="file"
      />
    </ThemeRoot>
  );
}
