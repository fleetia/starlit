import { useMemo, useRef, useState, type ReactElement } from 'react';
import { Icon, IconButton, ThemeRoot } from '@fleetia/lagrange';

import { BackgroundLayer } from './BackgroundLayer';
import { BookmarkActionOverlays } from '../bookmarks/BookmarkActionOverlays';
import { BookmarkGroupsView } from '../bookmarks/BookmarkGroupsView';
import { getGroupKey } from '../bookmarks/bookmarkRoute';
import {
  applySiblingOrder,
  getBookmarksAtRoot,
} from '../bookmarks/bookmarkTree';
import { useBookmarkActions } from '../bookmarks/useBookmarkActions';
import { useBookmarks } from '../bookmarks/useBookmarks';
import { useBookmarkTreePrefs } from '../bookmarks/useBookmarkTreePrefs';
import { useGroupPreferences } from '../bookmarks/useGroupPreferences';
import { useStorageState } from '../hooks/useStorageState';
import { type Locale, useTranslation } from '../i18n';
import { getLayoutStyle } from '../layout/layoutStyle';
import { useExpandedGroupsLayout } from '../layout/useExpandedGroupsLayout';
import {
  OptionsSidebar,
  type FontPreviewState,
} from '../settings/OptionsSidebar';
import { sanitizeCSS } from '../settings/sanitizeCSS';
import { BookmarkPreview } from '../settings/BookmarkPreview';
import { DEFAULT_ICON_SIZE, DEFAULT_SIZE } from '../settings/defaults';
import { useBackgroundImage } from '../settings/useBackgroundImage';
import { useGridSettings } from '../settings/useGridSettings';
import { useSettings } from '../settings/useSettings';
import { useTheme } from '../settings/useTheme';
import { FontStylesheets } from '../theme/FontStylesheets';
import { getFontFamilyStyle } from '../theme/starlitTheme';
import type { CssVariableStyle } from '../theme/types';
import { FirstInstallTutorial } from '../tutorial';

type AppStyle = CssVariableStyle & {
  '--background-image': string;
  '--starlit-background-image': string;
};

type AppProps = {
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

export function App({ locale, onLocaleChange }: AppProps): ReactElement {
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fontPreview, setFontPreview] = useState<FontPreviewState | null>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const {
    isLoaded: isSizeLoaded,
    value: size,
    setValue: setSize,
  } = useStorageState<number>('size', DEFAULT_SIZE);
  const {
    isLoaded: isIconSizeLoaded,
    value: iconSize,
    setValue: setIconSize,
  } = useStorageState<number>('iconSize', DEFAULT_ICON_SIZE);
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
    refreshBookmarks,
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
  const groupKeys = useMemo(
    () => orderedBookmarks.map((folder) => getGroupKey(folder)),
    [orderedBookmarks],
  );
  const expandedLayout = useExpandedGroupsLayout({
    cardGap: gridSettings.cardGap,
    groupKeys,
    margin: gridSettings.margin,
    masonryColumns: gridSettings.masonryColumns,
  });
  const bookmarkActions = useBookmarkActions({
    deleteBookmark: handleDeleteBookmark,
    fallbackFocusRef: settingsTriggerRef,
    resetFavicon: handleResetFavicon,
    updateFavicon: handleUpdateFavicon,
  });

  const areSettingsSourcesLoaded =
    isSizeLoaded &&
    isIconSizeLoaded &&
    isCustomCSSLoaded &&
    expandedLayout.isLoaded &&
    areBookmarksLoaded &&
    isGridSettingsLoaded &&
    areSettingsLoaded &&
    isBackgroundLoaded &&
    isThemeLoaded &&
    areBookmarkTreePrefsLoaded &&
    areGroupPreferencesLoaded;
  const persistedFontFamily = areSettingsLoaded
    ? settings.fontFamily
    : 'system';
  const activeFontFamily = fontPreview?.fontFamily ?? persistedFontFamily;
  const activeFontLocale = fontPreview?.locale ?? locale;
  const appStyle: AppStyle = {
    ...themeStyle,
    ...getFontFamilyStyle(activeFontFamily, activeFontLocale),
    ...getLayoutStyle(gridSettings, size, iconSize),
    '--background-image': backgroundImage,
    '--starlit-background-image': backgroundImage,
  };
  const sanitizedCustomCSS = useMemo(() => sanitizeCSS(customCSS), [customCSS]);
  return (
    <ThemeRoot
      className="starlit-root"
      data-starlit-part="root"
      style={appStyle}
    >
      {areSettingsLoaded ? (
        <FontStylesheets
          fontFamily={activeFontFamily}
          locale={activeFontLocale}
        />
      ) : null}
      {sanitizedCustomCSS ? (
        <style data-starlit-part="custom-css">{sanitizedCustomCSS}</style>
      ) : null}

      <BackgroundLayer
        backgroundImage={backgroundImage}
        blobUrl={backgroundBlobUrl}
        isMediaMissing={isMediaMissing}
        media={backgroundMeta ?? null}
      />

      <main className="starlit-main" data-starlit-part="main">
        {gridSettings.background.gridImage ? (
          <img
            alt=""
            aria-hidden="true"
            className="starlit-grid-texture"
            src={gridSettings.background.gridImage}
          />
        ) : null}
        <BookmarkGroupsView
          expandedLayout={expandedLayout}
          gridSettings={gridSettings}
          groups={orderedBookmarks}
          isExpandView={settings.isExpandView}
          isOpenInNewTab={settings.isOpenInNewTab}
          layout={settings.iconLayout}
          onOpenContextMenu={bookmarkActions.openContextMenu}
          size={size}
        />
      </main>

      <IconButton
        ref={settingsTriggerRef}
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
          onBookmarksImported={refreshBookmarks}
          onClose={() => setIsSettingsOpen(false)}
          onCustomCSSChange={setCustomCSS}
          onFontPreviewChange={setFontPreview}
          onGridSettingsUpdate={updateGridSettings}
          onGroupPreferencesUpdate={updateGroupPreferences}
          onIconSizeChange={setIconSize}
          onLocaleChange={onLocaleChange}
          onSettingsUpdate={updateSettings}
          onSizeChange={setSize}
          onThemePreset={applyPreset}
          onThemeReset={resetTheme}
          orderedTree={orderedTree}
          preview={({ gridSettings: draftGrid, settings: draftSettings }) => (
            <BookmarkPreview
              gridSettings={draftGrid}
              layout={draftSettings.iconLayout}
            />
          )}
          rootId={rootId}
          rootPath={rootPath}
          settings={settings}
          siblingOrder={siblingOrder}
          size={size}
        />
      ) : null}

      <BookmarkActionOverlays actions={bookmarkActions} />
      <FirstInstallTutorial
        isAppReady={areSettingsSourcesLoaded}
        locale={locale}
      />
    </ThemeRoot>
  );
}
