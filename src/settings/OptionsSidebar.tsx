import type { ChangeEvent, ReactElement } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  Inline,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
} from '@fleetia/lagrange';
import { lagrangeThemeClass } from '@fleetia/lagrange/theme';

import { applySiblingOrder } from '../bookmarks/bookmarkTree';
import { useTranslation } from '../i18n';
import { getLayoutStyle } from '../layout/layoutStyle';
import { createGuideHref } from '../guide/guideRoute';
import chromeBookmarks from '../platform/bookmarks/chromeBookmarks';
import { OverlayPositionEditor } from '../overlays/OverlayPositionEditor';
import { appendOverlayImages } from '../overlays/model';
import { getFontFamilyStyle, getThemeStyle } from '../theme/starlitTheme';
import type { StarlitTheme } from '../theme/types';
import {
  exportFull,
  exportToJson,
  importFromJson,
  importFull,
} from './exportImport';
import { resetAllSettings } from './resetSettings';
import type { BackgroundMedia } from './backgroundMedia';
import { AppearancePanel } from './options/AppearancePanel';
import { CustomCssPanel } from './options/CustomCssPanel';
import { GeneralPanel } from './options/GeneralPanel';
import { GroupsPanel } from './options/GroupsPanel';
import { LayoutPanel } from './options/LayoutPanel';
import { LayersPanel } from './options/LayersPanel';
import { SupportPanel } from './options/SupportPanel';
import { getErrorMessage, isEqual, isPrimaryTab } from './options/helpers';
import {
  saveSettingsChanges,
  type SaveSettingsChangesResult,
} from './options/saveSettingsChanges';
import type {
  AppearanceTab,
  BackgroundDraft,
  OptionsPreviewState,
  OptionsSidebarProps,
  PrimaryTab,
  SettingsSnapshot,
} from './options/types';
import * as styles from './OptionsSidebar.css';

export type {
  FontPreviewState,
  OptionsPreviewState,
  OptionsSidebarProps,
} from './options/types';

function isBackgroundSource(value: string): value is BackgroundMedia['source'] {
  return value === 'file' || value === 'url';
}

function reportCleanupError(error: unknown): void {
  if (typeof globalThis.reportError === 'function') {
    globalThis.reportError(error);
  }
}

function OptionsSidebarSession({
  backgroundMeta,
  colorTheme,
  customCSS,
  gridSettings,
  groupPreferences,
  iconSize,
  isBackgroundProcessing,
  isOverlayProcessing,
  isOpen = true,
  locale,
  onBackgroundClear,
  onBackgroundFile,
  onBackgroundUrl,
  onBookmarkTreePreferencesUpdate,
  onBookmarksImported,
  onClose,
  onCustomCSSChange,
  onExport,
  onFontPreviewChange,
  onGridSettingsUpdate,
  onGroupPreferencesUpdate,
  onIconSizeChange,
  onImport,
  onLocaleChange,
  onOverlayEditPreviewChange,
  onOverlayFilesPrepare,
  onOverlayImagesFinalize,
  onOverlayImagesDiscard,
  onOverlaySceneUpdate,
  onSettingsUpdate,
  onSizeChange,
  onThemePreset,
  onThemeReset,
  orderedTree,
  overlayScene,
  preview,
  rootId,
  rootPath,
  settings,
  siblingOrder,
  size,
}: OptionsSidebarProps): ReactElement {
  const { t } = useTranslation();
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('general');
  const [appearanceTab, setAppearanceTab] =
    useState<AppearanceTab>('background');
  const [backgroundSource, setBackgroundSource] = useState<
    BackgroundMedia['source']
  >(() => backgroundMeta?.source ?? 'url');
  const [backgroundUrl, setBackgroundUrl] = useState(() =>
    backgroundMeta?.source === 'url' ? backgroundMeta.url : '',
  );
  const [draftBackground, setDraftBackground] =
    useState<BackgroundDraft | null>(null);
  const [draftGrid, setDraftGrid] = useState(() =>
    structuredClone(gridSettings),
  );
  const [draftSettings, setDraftSettings] = useState(() =>
    structuredClone(settings),
  );
  const [draftTheme, setDraftTheme] = useState(() =>
    structuredClone(colorTheme),
  );
  const [draftSize, setDraftSize] = useState(size);
  const [draftIconSize, setDraftIconSize] = useState(iconSize);
  const [draftCSS, setDraftCSS] = useState(customCSS);
  const [draftLocale, setDraftLocale] = useState(locale);
  const [draftGroupPreferences, setDraftGroupPreferences] = useState(() =>
    structuredClone(groupPreferences),
  );
  const [draftRootId, setDraftRootId] = useState(rootId);
  const [draftRootPath, setDraftRootPath] = useState(() => [...rootPath]);
  const [draftSiblingOrder, setDraftSiblingOrder] = useState(() =>
    structuredClone(siblingOrder),
  );
  const [draftOverlayScene, setDraftOverlayScene] = useState(() =>
    structuredClone(overlayScene),
  );
  const [preparedOverlayImageIds, setPreparedOverlayImageIds] = useState<
    string[]
  >([]);
  const [isOverlayEditorOpen, setIsOverlayEditorOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const settingsFileRef = useRef<HTMLInputElement | null>(null);
  const backgroundFileRef = useRef<HTMLInputElement | null>(null);
  const discardCancelRef = useRef<HTMLButtonElement | null>(null);
  const discardDescriptionId = `starlit-discard-${useId()}`;

  useEffect(() => {
    onFontPreviewChange({
      fontFamily: draftSettings.fontFamily,
      locale: draftLocale,
    });
  }, [draftLocale, draftSettings.fontFamily, onFontPreviewChange]);

  useEffect(
    () => () => {
      onFontPreviewChange(null);
      onOverlayEditPreviewChange(null);
    },
    [onFontPreviewChange, onOverlayEditPreviewChange],
  );

  useEffect(() => {
    onOverlayEditPreviewChange(isOverlayEditorOpen ? draftOverlayScene : null);
  }, [draftOverlayScene, isOverlayEditorOpen, onOverlayEditPreviewChange]);

  const [snapshot] = useState<SettingsSnapshot>(() => ({
    customCSS,
    gridSettings: structuredClone(gridSettings),
    groupPreferences: structuredClone(groupPreferences),
    iconSize,
    locale,
    overlayScene: structuredClone(overlayScene),
    rootId,
    rootPath: [...rootPath],
    settings: structuredClone(settings),
    siblingOrder: structuredClone(siblingOrder),
    size,
    theme: structuredClone(colorTheme),
  }));
  const isDirty = useMemo(
    () =>
      !isEqual(draftGrid, snapshot.gridSettings) ||
      !isEqual(draftSettings, snapshot.settings) ||
      !isEqual(draftTheme, snapshot.theme) ||
      draftSize !== snapshot.size ||
      draftIconSize !== snapshot.iconSize ||
      draftCSS !== snapshot.customCSS ||
      draftLocale !== snapshot.locale ||
      !isEqual(draftGroupPreferences, snapshot.groupPreferences) ||
      draftRootId !== snapshot.rootId ||
      !isEqual(draftRootPath, snapshot.rootPath) ||
      !isEqual(draftSiblingOrder, snapshot.siblingOrder) ||
      !isEqual(draftOverlayScene, snapshot.overlayScene) ||
      preparedOverlayImageIds.length > 0 ||
      draftBackground !== null,
    [
      draftBackground,
      draftCSS,
      draftGrid,
      draftGroupPreferences,
      draftIconSize,
      draftLocale,
      draftOverlayScene,
      draftRootId,
      draftRootPath,
      draftSettings,
      draftSiblingOrder,
      draftSize,
      draftTheme,
      preparedOverlayImageIds.length,
      snapshot,
    ],
  );
  const fontFamilyStyle = useMemo(
    () => getFontFamilyStyle(draftSettings.fontFamily, draftLocale),
    [draftLocale, draftSettings.fontFamily],
  );
  const previewStyle = useMemo(
    () => ({
      ...fontFamilyStyle,
      ...getThemeStyle(draftTheme),
      ...getLayoutStyle(draftGrid, draftSize, draftIconSize),
    }),
    [draftGrid, draftIconSize, draftSize, draftTheme, fontFamilyStyle],
  );
  const previewState: OptionsPreviewState = {
    gridSettings: draftGrid,
    iconSize: draftIconSize,
    settings: draftSettings,
    size: draftSize,
    theme: draftTheme,
  };
  const draftOrderedTree = useMemo(
    () => applySiblingOrder(orderedTree, draftSiblingOrder),
    [draftSiblingOrder, orderedTree],
  );
  const isMediaProcessing = isBackgroundProcessing || isOverlayProcessing;

  function updateTheme<Key extends keyof StarlitTheme>(
    key: Key,
    value: StarlitTheme[Key],
  ): void {
    setDraftTheme((currentTheme) => ({ ...currentTheme, [key]: value }));
  }

  function toggleDraftVisibility(key: string): void {
    setDraftGroupPreferences((currentPreferences) => {
      const current = currentPreferences.find(
        (preference) => preference.key === key,
      );

      if (!current) {
        return [...currentPreferences, { key, visible: false }];
      }

      return currentPreferences.map((preference) =>
        preference.key === key
          ? { ...preference, visible: !preference.visible }
          : preference,
      );
    });
  }

  function updateDraftSiblingOrder(parentKey: string, titles: string[]): void {
    setDraftSiblingOrder((currentOrder) => ({
      ...currentOrder,
      [parentKey]: titles,
    }));
  }

  async function handleOpenBookmarkManager(): Promise<void> {
    setActionError(null);

    try {
      await chromeBookmarks.openManager();
    } catch {
      setActionError(t('groups.openManagerFailed'));
    }
  }

  function requestClose(): void {
    if (isSaving || isDiscarding || isMediaProcessing) {
      return;
    }

    if (isDirty) {
      setIsDiscardOpen(true);
      return;
    }

    onClose();
  }

  function handleDialogOpenChange(nextIsOpen: boolean): void {
    if (!nextIsOpen) {
      requestClose();
    }
  }

  async function handleSave(): Promise<void> {
    setActionError(null);
    setIsSaving(true);
    let saveResult: SaveSettingsChangesResult;

    try {
      saveResult = await saveSettingsChanges({
        callbacks: {
          onBackgroundClear,
          onBackgroundFile,
          onBackgroundUrl,
          onBookmarkTreePreferencesUpdate,
          onCustomCSSChange,
          onGridSettingsUpdate,
          onGroupPreferencesUpdate,
          onIconSizeChange,
          onLocaleChange,
          onOverlaySceneUpdate,
          onSettingsUpdate,
          onSizeChange,
          onThemePreset,
        },
        draft: {
          background: draftBackground,
          customCSS: draftCSS,
          gridSettings: draftGrid,
          groupPreferences: draftGroupPreferences,
          iconSize: draftIconSize,
          locale: draftLocale,
          overlayScene: draftOverlayScene,
          rootId: draftRootId,
          rootPath: draftRootPath,
          settings: draftSettings,
          siblingOrder: draftSiblingOrder,
          size: draftSize,
          theme: draftTheme,
        },
        preparedOverlayImageIds,
        snapshot,
      });
    } catch (error) {
      setActionError(getErrorMessage(error));
      setIsSaving(false);
      return;
    }

    setPreparedOverlayImageIds([]);
    const cleanupResults = await Promise.allSettled([
      onOverlayImagesDiscard(saveResult.mediaIdsToDelete),
      onOverlayImagesFinalize(saveResult.mediaIdsToFinalize),
    ]);
    const cleanupFailures = cleanupResults.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (cleanupFailures.length > 0) {
      reportCleanupError(
        new AggregateError(
          cleanupFailures.map((failure) => failure.reason),
          'Overlay media cleanup failed',
        ),
      );
    }

    setIsSaving(false);
    onOverlayEditPreviewChange(null);
    onClose();
  }

  function handleBackgroundSourceChange(value: string): void {
    if (!isBackgroundSource(value)) {
      return;
    }

    setBackgroundSource(value);
    setDraftBackground(null);

    if (value === 'url') {
      setBackgroundUrl(
        backgroundMeta?.source === 'url' ? backgroundMeta.url : '',
      );
    }
  }

  function handleBackgroundUrlChange(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const value = event.currentTarget.value;
    const nextUrl = value.trim();
    setBackgroundUrl(value);

    if (
      !nextUrl ||
      (backgroundMeta?.source === 'url' && nextUrl === backgroundMeta.url)
    ) {
      setDraftBackground(null);
      return;
    }

    setDraftBackground({ kind: 'url', url: nextUrl });
  }

  function handleBackgroundFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    setBackgroundSource('file');
    setDraftBackground({ file, kind: 'file' });
    setBackgroundUrl('');
  }

  function handleBackgroundClear(): void {
    setDraftBackground({ kind: 'clear' });
    setBackgroundUrl('');
  }

  async function handleOverlayFilesSelected(files: File[]): Promise<void> {
    setActionError(null);

    try {
      const preparedLayers = await onOverlayFilesPrepare(files);
      const preparedIds = preparedLayers.map((layer) => layer.id);
      setPreparedOverlayImageIds((currentIds) => [
        ...currentIds,
        ...preparedIds,
      ]);
      setDraftOverlayScene((currentScene) =>
        appendOverlayImages(currentScene, preparedLayers),
      );
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function handleDiscardChanges(): Promise<void> {
    setActionError(null);
    setIsDiscarding(true);

    try {
      await onOverlayImagesDiscard(preparedOverlayImageIds);
    } catch (error) {
      reportCleanupError(error);
    }

    setPreparedOverlayImageIds([]);
    setIsDiscarding(false);
    onOverlayEditPreviewChange(null);
    onClose();
  }

  async function handleExport(): Promise<void> {
    setActionError(null);

    try {
      if (onExport) {
        await onExport();
        return;
      }

      const data = await exportFull(
        gridSettings,
        settings,
        colorTheme,
        backgroundMeta,
        customCSS,
      );

      exportToJson(data, 'starlit-settings.json');
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function handleImportFile(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    setActionError(null);

    try {
      if (onImport) {
        await onImport(file);
      } else {
        const data = await importFromJson(file);
        await importFull(data);
      }

      window.location.reload();
    } catch (error) {
      setActionError(getErrorMessage(error));
      event.currentTarget.value = '';
    }
  }

  async function handleResetTheme(): Promise<void> {
    setActionError(null);

    try {
      await onThemeReset();
      window.location.reload();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function handleResetAll(): Promise<void> {
    setActionError(null);

    try {
      await resetAllSettings();
      window.location.reload();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  function handlePrimaryTabChange(value: string): void {
    if (isPrimaryTab(value)) {
      setPrimaryTab(value);
    }
  }

  return (
    <>
      {isOverlayEditorOpen ? (
        <OverlayPositionEditor
          onChange={setDraftOverlayScene}
          onClose={() => setIsOverlayEditorOpen(false)}
          scene={draftOverlayScene}
        />
      ) : null}
      <Dialog
        className={lagrangeThemeClass}
        closeLabel={t('modal.close')}
        data-starlit-part="settings-dialog"
        footer={
          <Inline align="center" gap="sm" justify="end" wrap>
            {isMediaProcessing ? (
              <Text
                aria-atomic="true"
                aria-live="polite"
                className={styles.processingStatus}
                role="status"
                tone="muted"
                variant="caption"
              >
                <span aria-hidden="true" className={styles.processingSpinner} />
                <span>
                  {isOverlayProcessing
                    ? t('layers.processing')
                    : t('sidebar.background.processing')}
                </span>
              </Text>
            ) : null}
            <Button
              disabled={isMediaProcessing}
              onClick={requestClose}
              variant="quiet"
            >
              {t('sidebar.cancel')}
            </Button>
            <Button
              disabled={!isDirty || isMediaProcessing}
              isPending={isSaving}
              onClick={() => void handleSave()}
            >
              {t('sidebar.save')}
            </Button>
          </Inline>
        }
        isOpen={isOpen && !isOverlayEditorOpen}
        onOpenChange={handleDialogOpenChange}
        size="large"
        style={fontFamilyStyle}
        title={t('newtab.options')}
      >
        <div className={styles.content} data-starlit-part="settings-content">
          <SupportPanel />
          {actionError ? (
            <Text aria-live="polite" as="p" tone="critical">
              {actionError}
            </Text>
          ) : null}
          <Tabs
            className={styles.primaryTabs}
            onValueChange={handlePrimaryTabChange}
            value={primaryTab}
          >
            <TabList aria-label={t('newtab.options')}>
              <Tab value="general">{t('sidebar.tab.general')}</Tab>
              <Tab value="appearance">{t('sidebar.tab.appearance')}</Tab>
              <Tab value="layers">{t('sidebar.tab.layers')}</Tab>
              <Tab value="layout">{t('sidebar.tab.layout')}</Tab>
              <Tab value="css">{t('sidebar.tab.css')}</Tab>
              <Tab value="groups">{t('sidebar.tab.groups')}</Tab>
            </TabList>
            <TabPanel
              className={styles.panel}
              data-starlit-part="settings-general"
              value="general"
            >
              <GeneralPanel
                guideHref={createGuideHref(draftLocale, 'getting-started')}
                locale={draftLocale}
                onExport={handleExport}
                onImportFile={handleImportFile}
                onResetAll={handleResetAll}
                onResetTheme={handleResetTheme}
                setLocale={setDraftLocale}
                setSettings={setDraftSettings}
                settings={draftSettings}
                settingsFileRef={settingsFileRef}
              />
            </TabPanel>
            <TabPanel
              className={styles.panel}
              data-starlit-part="settings-layers"
              value="layers"
            >
              <LayersPanel
                copy={{
                  addImages: t('layers.add'),
                  back: t('layers.back'),
                  bookmarks: t('layers.bookmarks'),
                  bookmarksDescription: t('layers.bookmarksDescription'),
                  description: t('layers.description'),
                  dragToReorder: t('layers.dragToReorder'),
                  editPositions: t('layers.editPositions'),
                  empty: t('layers.empty'),
                  fileDescription: t('layers.fileDescription'),
                  front: t('layers.front'),
                  frontToBackDescription: t('layers.frontToBackDescription'),
                  layerList: t('layers.layerList'),
                  moveTowardBack: (name) =>
                    `${t('layers.moveBackward')}: ${name}`,
                  moveTowardFront: (name) =>
                    `${t('layers.moveForward')}: ${name}`,
                  processing: t('layers.processing'),
                  removeImage: (name) => `${t('layers.remove')}: ${name}`,
                  title: t('layers.title'),
                }}
                isProcessing={isOverlayProcessing}
                onEditPositions={() => setIsOverlayEditorOpen(true)}
                onFilesSelected={(files) =>
                  void handleOverlayFilesSelected(files)
                }
                onSceneChange={setDraftOverlayScene}
                scene={draftOverlayScene}
              />
            </TabPanel>
            <TabPanel
              className={styles.panel}
              data-starlit-part="settings-appearance"
              value="appearance"
            >
              <AppearancePanel
                appearanceTab={appearanceTab}
                backgroundFileRef={backgroundFileRef}
                backgroundMeta={backgroundMeta}
                backgroundSource={backgroundSource}
                backgroundUrl={backgroundUrl}
                draftBackground={draftBackground}
                gridSettings={draftGrid}
                iconSize={draftIconSize}
                isBackgroundProcessing={isBackgroundProcessing}
                isSaving={isSaving}
                onBackgroundClear={handleBackgroundClear}
                onBackgroundFileChange={handleBackgroundFileChange}
                onBackgroundSourceChange={handleBackgroundSourceChange}
                onBackgroundUrlChange={handleBackgroundUrlChange}
                onTabChange={setAppearanceTab}
                onThemeChange={updateTheme}
                preview={preview}
                previewState={previewState}
                previewStyle={previewStyle}
                setGridSettings={setDraftGrid}
                setIconSize={setDraftIconSize}
                setSettings={setDraftSettings}
                setSize={setDraftSize}
                settings={draftSettings}
                size={draftSize}
                theme={draftTheme}
              />
            </TabPanel>
            <TabPanel
              className={styles.panel}
              data-starlit-part="settings-layout"
              value="layout"
            >
              <LayoutPanel
                gridSettings={draftGrid}
                preview={preview}
                previewState={previewState}
                previewStyle={previewStyle}
                setGridSettings={setDraftGrid}
                setSettings={setDraftSettings}
                settings={draftSettings}
              />
            </TabPanel>
            <TabPanel
              className={styles.panel}
              data-starlit-part="settings-css"
              value="css"
            >
              <CustomCssPanel css={draftCSS} onChange={setDraftCSS} />
            </TabPanel>
            <TabPanel
              className={styles.panel}
              data-starlit-part="settings-groups"
              value="groups"
            >
              <GroupsPanel
                guideHref={createGuideHref(draftLocale, 'tab-groups')}
                groupPreferences={draftGroupPreferences}
                onBookmarksImported={onBookmarksImported}
                onOpenBookmarkManager={handleOpenBookmarkManager}
                onSelectRoot={(path, nextRootId) => {
                  setDraftRootId(nextRootId);
                  setDraftRootPath(path);
                }}
                onSiblingReorder={updateDraftSiblingOrder}
                onToggleVisibility={toggleDraftVisibility}
                orderedTree={draftOrderedTree}
                rootId={draftRootId}
                rootPath={draftRootPath}
                siblingOrder={draftSiblingOrder}
              />
            </TabPanel>
          </Tabs>
        </div>
      </Dialog>
      <Dialog
        aria-describedby={discardDescriptionId}
        className={lagrangeThemeClass}
        footer={
          <Inline gap="sm" justify="end">
            <Button
              ref={discardCancelRef}
              onClick={() => setIsDiscardOpen(false)}
              variant="secondary"
            >
              {t('sidebar.confirm.no')}
            </Button>
            <Button
              isPending={isDiscarding}
              onClick={() => void handleDiscardChanges()}
              variant="critical"
            >
              {t('sidebar.confirm.yes')}
            </Button>
          </Inline>
        }
        initialFocusRef={discardCancelRef}
        isOpen={isOpen && isDiscardOpen && !isOverlayEditorOpen}
        onOpenChange={setIsDiscardOpen}
        role="alertdialog"
        size="small"
        style={fontFamilyStyle}
        title={t('sidebar.cancel')}
      >
        <Text id={discardDescriptionId}>
          {t('sidebar.confirm.unsavedChanges')}
        </Text>
      </Dialog>
    </>
  );
}

export function OptionsSidebar(
  props: OptionsSidebarProps,
): ReactElement | null {
  if (props.isOpen === false) {
    return null;
  }

  return <OptionsSidebarSession {...props} />;
}
