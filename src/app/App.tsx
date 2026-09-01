import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from 'react';
import {
  Button,
  ContextMenu,
  ContextMenuItem,
  Dialog,
  Icon,
  IconButton,
  Inline,
  Rule,
  Text,
  ThemeRoot,
} from '@fleetia/lagrange';
import { lagrangeThemeClass } from '@fleetia/lagrange/theme';

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
import { OverlayImageStacks } from '../overlays/OverlayImageStacks';
import type { OverlayMotionPlaybackOverride } from '../overlays/OverlayImageStacks';
import { OverlayContextMenuListener } from '../overlays/OverlayContextMenuListener';
import { OverlayImageActionMenu } from '../overlays/OverlayImageActionMenu';
import { useOverlayScene } from '../overlays/useOverlayScene';
import type { OverlayScene } from '../overlays/types';
import {
  useOverlayImageActions,
  type OverlayImageMutation,
} from '../overlays/useOverlayImageActions';
import {
  OptionsSidebar,
  type FontPreviewState,
} from '../settings/OptionsSidebar';
import { sanitizeCSS } from '../settings/sanitizeCSS';
import { BookmarkPreview } from '../settings/BookmarkPreview';
import { DEFAULT_ICON_SIZE, DEFAULT_SIZE } from '../settings/defaults';
import { PRIMARY_TAB_GROUPS } from '../settings/options/helpers';
import { useBackgroundImage } from '../settings/useBackgroundImage';
import { useGridSettings } from '../settings/useGridSettings';
import { useSettings } from '../settings/useSettings';
import { useTheme } from '../settings/useTheme';
import { FontStylesheets } from '../theme/FontStylesheets';
import { getFontFamilyStyle } from '../theme/starlitTheme';
import type { CssVariableStyle } from '../theme/types';
import { FirstInstallTutorial } from '../tutorial';
import {
  CommandPalette,
  createPaletteResults,
  type PaletteResult,
} from '../commandPalette';
import {
  mergeCanvasWithOverlay,
  projectOverlaySceneToCanvasScene,
  useScenes,
  type CanvasSceneV2,
  type ScenePresetV1,
  type SceneRuntimeSnapshot,
} from '../scenes';
import type { PrimaryTab } from '../settings/options/types';
import { CanvasWidgets } from '../widgets';

type AppStyle = CssVariableStyle & {
  '--background-image': string;
  '--starlit-bookmark-z-index': number;
  '--starlit-background-image': string;
  '--starlit-canvas-ui-z-index': number;
};

type AppProps = {
  locale: Locale;
  onLocaleChange: (locale: Locale) => Promise<void>;
};

const INTERACTIVE_CONTEXT_TARGET_SELECTOR =
  'button, a, input, select, textarea, [role="button"], [role="link"], [contenteditable="true"]';

function SettingsIcon(): ReactElement {
  return (
    <Icon size="sm" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="2.25" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" />
    </Icon>
  );
}

function decodeFiniteNumber(rawValue: unknown, fallback: number): number {
  return typeof rawValue === 'number' && Number.isFinite(rawValue)
    ? rawValue
    : fallback;
}

function decodeString(rawValue: unknown, fallback: string): string {
  return typeof rawValue === 'string' ? rawValue : fallback;
}

function reportOverlayCleanupError(error: unknown): void {
  if (typeof globalThis.reportError === 'function') {
    globalThis.reportError(error);
  }
}

function getCanvasLayerOrder(
  overlayScene: OverlayScene,
  canvas: CanvasSceneV2 | null,
): { bookmarkZIndex: number; uiZIndex: number } {
  const layers = canvas?.layers ?? overlayScene.layers;
  const bookmarkIndex = layers.findIndex((layer) => layer.kind === 'bookmarks');
  return {
    bookmarkZIndex: Math.max(1, bookmarkIndex + 1),
    uiZIndex: layers.length + 2,
  };
}

type SceneApplyPreview = {
  appearance: string;
  bookmarkFolder: string;
  decorationCount: number;
  widgetTypes: Array<'calendar' | 'clock'>;
};

function createSceneApplyPreview(scene: ScenePresetV1): SceneApplyPreview {
  const widgetTypes = scene.canvas.layers.flatMap((layer) =>
    layer.kind === 'widget' ? [layer.widgetType] : [],
  );

  return {
    appearance: `${scene.appearance.fontFamily} · ${scene.appearance.gridSettings.columns} × ${scene.appearance.gridSettings.rows}`,
    bookmarkFolder: scene.bookmarkCollection.folderPath.join(' / ') || '—',
    decorationCount: scene.canvas.layers.filter(
      (layer) => layer.kind === 'decoration',
    ).length,
    widgetTypes,
  };
}

export function App({ locale, onLocaleChange }: AppProps): ReactElement {
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] =
    useState<PrimaryTab>('general');
  const [settingsInitialOverlayImageId, setSettingsInitialOverlayImageId] =
    useState<string | null>(null);
  const [settingsInitialWidgetId, setSettingsInitialWidgetId] = useState<
    string | null
  >(null);
  const [widgetContextTarget, setWidgetContextTarget] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [settingsContextMenuPoint, setSettingsContextMenuPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [pendingSceneId, setPendingSceneId] = useState<string | null>(null);
  const [sceneActionError, setSceneActionError] = useState<string | null>(null);
  const [overlayActionError, setOverlayActionError] = useState<string | null>(
    null,
  );
  const [paletteActionError, setPaletteActionError] = useState(false);
  const [isApplyingScene, setIsApplyingScene] = useState(false);
  const [fontPreview, setFontPreview] = useState<FontPreviewState | null>(null);
  const [overlayEditPreview, setOverlayEditPreview] =
    useState<OverlayScene | null>(null);
  const [motionPlaybackOverrides, setMotionPlaybackOverrides] = useState<
    Partial<Record<string, OverlayMotionPlaybackOverride>>
  >({});
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsSessionTriggerRef = useRef<HTMLElement | null>(null);
  const sceneController = useScenes();
  const {
    isLoaded: isSizeLoaded,
    value: size,
    setValue: setSize,
  } = useStorageState<number>(
    'size',
    DEFAULT_SIZE,
    decodeFiniteNumber,
    'local',
  );
  const {
    isLoaded: isIconSizeLoaded,
    value: iconSize,
    setValue: setIconSize,
  } = useStorageState<number>(
    'iconSize',
    DEFAULT_ICON_SIZE,
    decodeFiniteNumber,
    'local',
  );
  const {
    isLoaded: isCustomCSSLoaded,
    value: customCSS,
    setValue: setCustomCSS,
  } = useStorageState<string>('customCSS', '', decodeString, 'local');
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
    createSnapshot: createBackgroundSnapshot,
    isLoaded: isBackgroundLoaded,
    isMediaMissing,
    isProcessing: isBackgroundProcessing,
    meta: backgroundMeta,
    restoreSnapshot: restoreBackgroundSnapshot,
    updateFromFile: updateBackgroundFromFile,
    updateFromUrl: updateBackgroundFromUrl,
  } = useBackgroundImage();
  const {
    discardImages: discardOverlayImages,
    finalizeImages: finalizeOverlayImages,
    isLoaded: isOverlaySceneLoaded,
    isProcessing: isOverlayProcessing,
    prepareFiles: prepareOverlayFiles,
    scene: overlayScene,
    updateScene: updateOverlayScene,
  } = useOverlayScene();
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
  const overlayImageActions = useOverlayImageActions({
    isDisabled:
      isSettingsOpen ||
      overlayEditPreview !== null ||
      isOverlayProcessing ||
      sceneController.isProcessing,
    onEditImage: (imageId) =>
      openSettings('widgets', settingsTriggerRef.current, imageId),
    onError: (error) => setOverlayActionError(error?.message ?? null),
    onMotionPlaybackOverrideChange: (imageId, override) =>
      setMotionPlaybackOverrides((current) => ({
        ...current,
        [imageId]: override,
      })),
    onMutation: persistOverlayImageMutation,
    onPreparationRollback: discardOverlayImages,
    prepareFiles: prepareOverlayFiles,
    scene: overlayScene,
  });
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
  const settingsLabels = useMemo<Readonly<Record<PrimaryTab, string>>>(
    () => ({
      general: t('sidebar.tab.general'),
      appearance: t('sidebar.tab.appearance'),
      widgets: t('sidebar.tab.widgets'),
      layout: t('sidebar.tab.layout'),
      css: t('sidebar.tab.css'),
      groups: t('sidebar.tab.groups'),
      scene: t('sidebar.tab.scene'),
      portable: t('portable.title'),
    }),
    [t],
  );
  const paletteResults = useMemo(
    () =>
      createPaletteResults({
        ...(sceneController.activeSceneId
          ? { activeSceneId: sceneController.activeSceneId }
          : {}),
        bookmarks: orderedTree,
        ...(rootId ? { currentSceneRootId: rootId } : {}),
        scenes: sceneController.scenes,
        settingsLabels,
      }),
    [
      orderedTree,
      rootId,
      sceneController.activeSceneId,
      sceneController.scenes,
      settingsLabels,
    ],
  );
  const pendingScene =
    sceneController.scenes.find((scene) => scene.id === pendingSceneId) ?? null;
  const pendingScenePreview = pendingScene
    ? createSceneApplyPreview(pendingScene)
    : null;

  function openSettings(
    tab: PrimaryTab,
    trigger: HTMLElement | null,
    initialOverlayImageId: string | null = null,
    initialWidgetId: string | null = null,
  ): void {
    setSettingsContextMenuPoint(null);
    setWidgetContextTarget(null);
    settingsSessionTriggerRef.current = trigger;
    setSettingsInitialTab(tab);
    setSettingsInitialOverlayImageId(initialOverlayImageId);
    setSettingsInitialWidgetId(initialWidgetId);
    setIsSettingsOpen(true);
  }

  async function activatePaletteResult(result: PaletteResult): Promise<void> {
    setPaletteActionError(false);
    setSceneActionError(null);
    switch (result.category) {
      case 'bookmark':
        if (settings.isOpenInNewTab) {
          window.open(result.url, '_blank', 'noopener,noreferrer');
        } else {
          window.location.assign(result.url);
        }
        return;
      case 'group':
        await updatePreferences({
          rootId: result.groupId,
          rootPath: [...result.path],
          siblingOrder,
        });
        return;
      case 'scene':
        setPendingSceneId(result.sceneId);
        return;
      case 'settings':
        openSettings(result.destination, null);
    }
  }

  async function applyPendingScene(): Promise<void> {
    if (!pendingScene) return;
    setIsApplyingScene(true);
    setSceneActionError(null);
    try {
      const readiness = await sceneController.getReadiness(pendingScene.id);
      if (!readiness.isReady) {
        setPendingSceneId(null);
        openSettings('scene', null);
        return;
      }
      await sceneController.applyScene(pendingScene.id);
      await refreshBookmarks();
      setPendingSceneId(null);
    } catch (error) {
      setSceneActionError(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsApplyingScene(false);
    }
  }

  function createOverlayRuntimeSnapshot(
    nextOverlayScene: OverlayScene,
  ): SceneRuntimeSnapshot {
    const activeCanvas = sceneController.activeScene?.canvas;
    return {
      backgroundMeta: backgroundMeta ?? null,
      bookmarkTreePrefs: {
        ...(rootId ? { rootId } : {}),
        rootPath: [...rootPath],
        siblingOrder: structuredClone(siblingOrder),
      },
      canvas: activeCanvas
        ? mergeCanvasWithOverlay(activeCanvas, nextOverlayScene)
        : projectOverlaySceneToCanvasScene(nextOverlayScene),
      colorTheme,
      customCSS,
      gridSettings,
      groupPreferences,
      iconSize,
      overlayScene: nextOverlayScene,
      settings,
      size,
    };
  }

  async function persistOverlayImageMutation(
    mutation: OverlayImageMutation,
  ): Promise<void> {
    const previousScene = overlayScene;
    await updateOverlayScene(mutation.scene);

    try {
      if (sceneController.activeSceneId) {
        await sceneController.updateScene(
          sceneController.activeSceneId,
          createOverlayRuntimeSnapshot(mutation.scene),
        );
      }
    } catch (error) {
      try {
        await updateOverlayScene(previousScene);
      } catch (rollbackError) {
        const actionMessage =
          error instanceof Error ? error.message : String(error);
        const rollbackMessage =
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError);
        throw new Error(
          `Decorative image action failed (${actionMessage}) and rollback failed (${rollbackMessage}).`,
          { cause: rollbackError },
        );
      }
      throw error;
    }

    if (mutation.removedImageIds.length > 0) {
      setMotionPlaybackOverrides((current) => {
        const next = { ...current };
        mutation.removedImageIds.forEach((id) => delete next[id]);
        return next;
      });
    }

    const cleanupOperations: Promise<void>[] = [];
    if (mutation.preparedImageIds.length > 0) {
      cleanupOperations.push(finalizeOverlayImages(mutation.preparedImageIds));
    }
    if (mutation.removedImageIds.length > 0) {
      cleanupOperations.push(discardOverlayImages(mutation.removedImageIds));
    }
    const cleanupResults = await Promise.allSettled(cleanupOperations);
    const cleanupFailures = cleanupResults.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (cleanupFailures.length > 0) {
      reportOverlayCleanupError(
        new AggregateError(
          cleanupFailures.map((failure) => failure.reason),
          'Decorative image cleanup failed.',
        ),
      );
    }
  }

  const areSettingsSourcesLoaded =
    isSizeLoaded &&
    isIconSizeLoaded &&
    isCustomCSSLoaded &&
    expandedLayout.isLoaded &&
    areBookmarksLoaded &&
    isGridSettingsLoaded &&
    areSettingsLoaded &&
    isBackgroundLoaded &&
    isOverlaySceneLoaded &&
    isThemeLoaded &&
    areBookmarkTreePrefsLoaded &&
    areGroupPreferencesLoaded &&
    sceneController.isLoaded;
  const persistedFontFamily = areSettingsLoaded
    ? settings.fontFamily
    : 'system';
  const activeFontFamily = fontPreview?.fontFamily ?? persistedFontFamily;
  const activeFontLocale = fontPreview?.locale ?? locale;
  const renderedOverlayScene = overlayEditPreview ?? overlayScene;
  const renderedCanvas = overlayEditPreview
    ? null
    : (sceneController.activeScene?.canvas ?? null);
  const canvasLayerOrder = getCanvasLayerOrder(
    renderedOverlayScene,
    renderedCanvas,
  );
  const appStyle: AppStyle = {
    ...themeStyle,
    ...getFontFamilyStyle(activeFontFamily, activeFontLocale),
    ...getLayoutStyle(gridSettings, size, iconSize),
    '--background-image': backgroundImage,
    '--starlit-bookmark-z-index': canvasLayerOrder.bookmarkZIndex,
    '--starlit-background-image': backgroundImage,
    '--starlit-canvas-ui-z-index': canvasLayerOrder.uiZIndex,
  };
  const sanitizedCustomCSS = useMemo(() => sanitizeCSS(customCSS), [customCSS]);
  const isOverlayEditing = overlayEditPreview !== null;
  const isSettingsContextMenuEnabled =
    areSettingsSourcesLoaded &&
    !isSettingsOpen &&
    !isOverlayEditing &&
    !sceneController.isProcessing &&
    !overlayImageActions.isProcessing &&
    pendingScene === null &&
    !isApplyingScene;

  useEffect(() => {
    if (isSettingsOpen) {
      return;
    }

    const sessionTrigger = settingsSessionTriggerRef.current;
    settingsSessionTriggerRef.current = null;
    sessionTrigger?.focus();
  }, [isSettingsOpen]);

  function handleCanvasContextMenu(event: ReactMouseEvent<HTMLElement>): void {
    if (!isSettingsContextMenuEnabled || event.defaultPrevented) {
      return;
    }

    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(INTERACTIVE_CONTEXT_TARGET_SELECTOR)
    ) {
      return;
    }

    event.preventDefault();
    bookmarkActions.closeContextMenu();
    overlayImageActions.closeMenu();
    setWidgetContextTarget(null);
    setSettingsContextMenuPoint({ x: event.clientX, y: event.clientY });
  }

  function handleBookmarkContextMenu(
    event: ReactMouseEvent<HTMLElement>,
    bookmarkId: string,
    isFolder: boolean,
  ): void {
    setSettingsContextMenuPoint(null);
    setWidgetContextTarget(null);
    overlayImageActions.closeMenu();
    bookmarkActions.openContextMenu(event, bookmarkId, isFolder);
  }

  function handleWidgetContextMenu(
    event: ReactMouseEvent<HTMLElement>,
    widgetId: string,
  ): void {
    if (!isSettingsContextMenuEnabled) return;
    event.preventDefault();
    event.stopPropagation();
    setSettingsContextMenuPoint(null);
    bookmarkActions.closeContextMenu();
    overlayImageActions.closeMenu();
    setWidgetContextTarget({
      id: widgetId,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function openSettingsFromContextMenu(tab: PrimaryTab): void {
    setSettingsContextMenuPoint(null);
    openSettings(tab, settingsTriggerRef.current);
  }

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

      <OverlayImageStacks
        canvas={renderedCanvas}
        motionPlaybackOverrides={motionPlaybackOverrides}
        scene={renderedOverlayScene}
      />
      <CanvasWidgets
        calendarCopy={{
          disconnected: t('widgets.configureInSettings'),
          empty: t('widgets.empty'),
          error: t('widgets.error'),
          loading: t('widgets.loading'),
        }}
        canvas={sceneController.activeScene?.canvas ?? null}
        locale={locale}
        onWidgetContextMenu={handleWidgetContextMenu}
      />

      <main
        className="starlit-main"
        data-starlit-part="main"
        inert={isOverlayEditing}
        onContextMenu={handleCanvasContextMenu}
      >
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
          onOpenContextMenu={handleBookmarkContextMenu}
          size={size}
        />
      </main>

      {overlayActionError || paletteActionError ? (
        <Text
          aria-live="polite"
          className="starlit-action-error"
          tone="critical"
          variant="caption"
        >
          {paletteActionError ? t('palette.error') : t('layers.error')}
        </Text>
      ) : null}
      <div className="starlit-scene-toolbar">
        {sceneController.activeScene ? (
          <span className="starlit-scene-name">
            {sceneController.activeScene.name}
          </span>
        ) : null}
        <IconButton
          ref={settingsTriggerRef}
          data-starlit-part="settings-trigger"
          disabled={
            !areSettingsSourcesLoaded ||
            isOverlayEditing ||
            overlayImageActions.isProcessing
          }
          label={t('newtab.options')}
          onClick={() => {
            if (
              areSettingsSourcesLoaded &&
              !isOverlayEditing &&
              !overlayImageActions.isProcessing
            ) {
              openSettings('general', settingsTriggerRef.current);
            }
          }}
          variant="default"
        >
          <SettingsIcon />
        </IconButton>
      </div>

      {isSettingsOpen && areSettingsSourcesLoaded ? (
        <OptionsSidebar
          {...(settingsInitialOverlayImageId
            ? { initialOverlayImageId: settingsInitialOverlayImageId }
            : {})}
          {...(settingsInitialWidgetId
            ? { initialWidgetId: settingsInitialWidgetId }
            : {})}
          initialTab={settingsInitialTab}
          backgroundMeta={backgroundMeta}
          colorTheme={colorTheme}
          customCSS={customCSS}
          gridSettings={gridSettings}
          groupPreferences={groupPreferences}
          iconSize={iconSize}
          isBackgroundProcessing={isBackgroundProcessing}
          isOverlayProcessing={isOverlayProcessing}
          locale={locale}
          onBackgroundClear={clearBackground}
          onBackgroundFile={updateBackgroundFromFile}
          onBackgroundRestore={restoreBackgroundSnapshot}
          onBackgroundSnapshot={createBackgroundSnapshot}
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
          onOverlayEditPreviewChange={setOverlayEditPreview}
          onOverlayFilesPrepare={prepareOverlayFiles}
          onOverlayImagesFinalize={finalizeOverlayImages}
          onOverlayImagesDiscard={discardOverlayImages}
          onOverlayMotionPlaybackOverrideChange={(imageId, override) =>
            setMotionPlaybackOverrides((current) => ({
              ...current,
              [imageId]: override,
            }))
          }
          onOverlaySceneUpdate={updateOverlayScene}
          onSettingsUpdate={updateSettings}
          onSizeChange={setSize}
          onThemePreset={applyPreset}
          onThemeReset={resetTheme}
          orderedTree={orderedTree}
          overlayScene={overlayScene}
          preview={({ gridSettings: draftGrid, settings: draftSettings }) => (
            <BookmarkPreview
              gridSettings={draftGrid}
              layout={draftSettings.iconLayout}
            />
          )}
          rootId={rootId}
          rootPath={rootPath}
          sceneController={sceneController}
          settings={settings}
          siblingOrder={siblingOrder}
          size={size}
        />
      ) : null}

      <BookmarkActionOverlays actions={bookmarkActions} />
      <ContextMenu
        anchorPoint={
          widgetContextTarget
            ? { x: widgetContextTarget.x, y: widgetContextTarget.y }
            : { x: 0, y: 0 }
        }
        isOpen={isSettingsContextMenuEnabled && widgetContextTarget !== null}
        label={t('widgets.configure')}
        onOpenChange={(isOpen) => {
          if (!isOpen) setWidgetContextTarget(null);
        }}
      >
        <ContextMenuItem
          onSelect={() => {
            if (!widgetContextTarget) return;
            openSettings(
              'widgets',
              settingsTriggerRef.current,
              null,
              widgetContextTarget.id,
            );
          }}
        >
          {t('widgets.configure')}
        </ContextMenuItem>
      </ContextMenu>
      <ContextMenu
        anchorPoint={settingsContextMenuPoint ?? { x: 0, y: 0 }}
        isOpen={
          isSettingsContextMenuEnabled && settingsContextMenuPoint !== null
        }
        label={t('newtab.options')}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSettingsContextMenuPoint(null);
          }
        }}
      >
        {PRIMARY_TAB_GROUPS.map((tabs, groupIndex) => (
          <Fragment key={tabs[0]}>
            {groupIndex > 0 ? <Rule variant="boundary" /> : null}
            {tabs.map((tab) => (
              <ContextMenuItem
                key={tab}
                onSelect={() => openSettingsFromContextMenu(tab)}
              >
                {settingsLabels[tab]}
              </ContextMenuItem>
            ))}
          </Fragment>
        ))}
      </ContextMenu>
      <OverlayContextMenuListener
        isEnabled={
          areSettingsSourcesLoaded &&
          !isSettingsOpen &&
          !isOverlayEditing &&
          !sceneController.isProcessing &&
          !overlayImageActions.isProcessing
        }
        onTarget={({ clientX, clientY, imageId }) => {
          setSettingsContextMenuPoint(null);
          setWidgetContextTarget(null);
          bookmarkActions.closeContextMenu();
          overlayImageActions.openMenu({
            imageId,
            point: { x: clientX, y: clientY },
          });
        }}
        scene={overlayScene}
      />
      <OverlayImageActionMenu controller={overlayImageActions} />
      <CommandPalette
        copy={{
          categoryBookmark: t('palette.category.bookmark'),
          categoryGroup: t('palette.category.group'),
          categoryScene: t('palette.category.scene'),
          categorySettings: t('palette.category.settings'),
          close: t('modal.close'),
          empty: t('palette.empty'),
          hint: t('palette.hint'),
          inputLabel: t('palette.inputLabel'),
          placeholder: t('palette.placeholder'),
          title: t('palette.title'),
        }}
        isEnabled={
          areSettingsSourcesLoaded &&
          !isSettingsOpen &&
          !isOverlayEditing &&
          !overlayImageActions.isProcessing &&
          !sceneController.isProcessing &&
          settingsContextMenuPoint === null &&
          widgetContextTarget === null &&
          bookmarkActions.contextTarget === null &&
          overlayImageActions.menuTarget === null &&
          pendingScene === null &&
          !isApplyingScene
        }
        onActivate={activatePaletteResult}
        onActivationError={() => setPaletteActionError(true)}
        results={paletteResults}
      />
      <Dialog
        className={lagrangeThemeClass}
        closeLabel={t('modal.close')}
        footer={
          <Inline gap="sm" justify="end">
            <Button onClick={() => setPendingSceneId(null)} variant="quiet">
              {t('sidebar.cancel')}
            </Button>
            <Button
              isPending={isApplyingScene}
              onClick={() => void applyPendingScene()}
            >
              {t('scene.confirmApply')}
            </Button>
          </Inline>
        }
        isOpen={pendingScene !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPendingSceneId(null);
        }}
        size="small"
        title={t('scene.applyPreviewTitle')}
      >
        <Text as="p">
          {pendingScene?.name} · {t('scene.applyPreviewDescription')}
        </Text>
        {pendingScenePreview ? (
          <dl
            className="starlit-scene-apply-preview"
            data-starlit-part="scene-apply-preview"
          >
            <div>
              <dt>{t('sidebar.tab.appearance')}</dt>
              <dd>{pendingScenePreview.appearance}</dd>
            </div>
            <div>
              <dt>{t('sidebar.tab.groups')}</dt>
              <dd>{pendingScenePreview.bookmarkFolder}</dd>
            </div>
            <div>
              <dt>{t('sidebar.tab.widgets')}</dt>
              <dd>
                {[
                  ...(pendingScenePreview.decorationCount > 0
                    ? [
                        `${t('widgets.image')} × ${pendingScenePreview.decorationCount}`,
                      ]
                    : []),
                  ...pendingScenePreview.widgetTypes.map((widgetType) =>
                    t(
                      widgetType === 'clock'
                        ? 'widgets.clock'
                        : 'widgets.calendar',
                    ),
                  ),
                ].join(' · ') || '—'}
              </dd>
            </div>
          </dl>
        ) : null}
        {sceneActionError ? (
          <Text aria-live="polite" as="p" tone="critical">
            {t('scene.error')}
          </Text>
        ) : null}
      </Dialog>
      <FirstInstallTutorial
        isAppReady={areSettingsSourcesLoaded}
        locale={locale}
      />
    </ThemeRoot>
  );
}
