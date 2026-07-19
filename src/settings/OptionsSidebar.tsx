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
import chromeBookmarks from '../platform/bookmarks/chromeBookmarks';
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
import { SupportPanel } from './options/SupportPanel';
import {
  createBookmarkTreePreferences,
  getErrorMessage,
  isEqual,
  isPrimaryTab,
  rollbackSettingsSave,
} from './options/helpers';
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

function OptionsSidebarSession({
  backgroundMeta,
  colorTheme,
  customCSS,
  gridSettings,
  groupPreferences,
  iconSize,
  isBackgroundProcessing,
  isOpen = true,
  locale,
  onBackgroundClear,
  onBackgroundFile,
  onBackgroundUrl,
  onBookmarkTreePreferencesUpdate,
  onClose,
  onCustomCSSChange,
  onExport,
  onFontPreviewChange,
  onGridSettingsUpdate,
  onGroupPreferencesUpdate,
  onIconSizeChange,
  onImport,
  onLocaleChange,
  onSettingsUpdate,
  onSizeChange,
  onThemePreset,
  onThemeReset,
  orderedTree,
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
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
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
    },
    [onFontPreviewChange],
  );

  const [snapshot] = useState<SettingsSnapshot>(() => ({
    customCSS,
    gridSettings: structuredClone(gridSettings),
    groupPreferences: structuredClone(groupPreferences),
    iconSize,
    locale,
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
      draftBackground !== null,
    [
      draftBackground,
      draftCSS,
      draftGrid,
      draftGroupPreferences,
      draftIconSize,
      draftLocale,
      draftRootId,
      draftRootPath,
      draftSettings,
      draftSiblingOrder,
      draftSize,
      draftTheme,
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
    if (isSaving) {
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
    const rollbackOperations: Array<() => Promise<void>> = [];

    try {
      if (!isEqual(draftGrid, snapshot.gridSettings)) {
        rollbackOperations.push(() =>
          onGridSettingsUpdate(snapshot.gridSettings),
        );
        await onGridSettingsUpdate(draftGrid);
      }

      if (!isEqual(draftSettings, snapshot.settings)) {
        rollbackOperations.push(() => onSettingsUpdate(snapshot.settings));
        await onSettingsUpdate(draftSettings);
      }

      if (!isEqual(draftTheme, snapshot.theme)) {
        rollbackOperations.push(() => onThemePreset(snapshot.theme));
        await onThemePreset(draftTheme);
      }

      if (draftSize !== snapshot.size) {
        rollbackOperations.push(() => onSizeChange(snapshot.size));
        await onSizeChange(draftSize);
      }

      if (draftIconSize !== snapshot.iconSize) {
        rollbackOperations.push(() => onIconSizeChange(snapshot.iconSize));
        await onIconSizeChange(draftIconSize);
      }

      if (draftCSS !== snapshot.customCSS) {
        rollbackOperations.push(() => onCustomCSSChange(snapshot.customCSS));
        await onCustomCSSChange(draftCSS);
      }

      if (draftLocale !== snapshot.locale) {
        rollbackOperations.push(() => onLocaleChange(snapshot.locale));
        await onLocaleChange(draftLocale);
      }

      if (!isEqual(draftGroupPreferences, snapshot.groupPreferences)) {
        rollbackOperations.push(() =>
          onGroupPreferencesUpdate(snapshot.groupPreferences),
        );
        await onGroupPreferencesUpdate(draftGroupPreferences);
      }

      if (
        draftRootId !== snapshot.rootId ||
        !isEqual(draftRootPath, snapshot.rootPath) ||
        !isEqual(draftSiblingOrder, snapshot.siblingOrder)
      ) {
        rollbackOperations.push(() =>
          onBookmarkTreePreferencesUpdate(
            createBookmarkTreePreferences(
              snapshot.rootPath,
              snapshot.siblingOrder,
              snapshot.rootId,
            ),
          ),
        );
        await onBookmarkTreePreferencesUpdate(
          createBookmarkTreePreferences(
            draftRootPath,
            draftSiblingOrder,
            draftRootId,
          ),
        );
      }

      if (draftBackground) {
        switch (draftBackground.kind) {
          case 'clear':
            await onBackgroundClear();
            break;
          case 'file':
            await onBackgroundFile(draftBackground.file);
            break;
          case 'url':
            await onBackgroundUrl(draftBackground.url);
            break;
        }
      }
    } catch (error) {
      try {
        await rollbackSettingsSave(rollbackOperations);
        setActionError(getErrorMessage(error));
      } catch (rollbackError) {
        setActionError(
          getErrorMessage(
            new AggregateError(
              [error, rollbackError],
              'Settings save and rollback both failed',
              { cause: rollbackError },
            ),
          ),
        );
      }
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
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
      <Dialog
        className={lagrangeThemeClass}
        closeLabel={t('modal.close')}
        data-starlit-part="settings-dialog"
        footer={
          <Inline align="center" gap="sm" justify="end" wrap>
            {isBackgroundProcessing ? (
              <Text
                aria-atomic="true"
                aria-live="polite"
                className={styles.processingStatus}
                role="status"
                tone="muted"
                variant="caption"
              >
                <span aria-hidden="true" className={styles.processingSpinner} />
                <span>{t('sidebar.background.processing')}</span>
              </Text>
            ) : null}
            <Button onClick={requestClose} variant="quiet">
              {t('sidebar.cancel')}
            </Button>
            <Button
              disabled={!isDirty || isBackgroundProcessing}
              isPending={isSaving}
              onClick={() => void handleSave()}
            >
              {t('sidebar.save')}
            </Button>
          </Inline>
        }
        isOpen={isOpen}
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
                groupPreferences={draftGroupPreferences}
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
            <Button onClick={onClose} variant="critical">
              {t('sidebar.confirm.yes')}
            </Button>
          </Inline>
        }
        initialFocusRef={discardCancelRef}
        isOpen={isOpen && isDiscardOpen}
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
