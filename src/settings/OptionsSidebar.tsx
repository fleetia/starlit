import type { ChangeEvent, ReactElement, ReactNode } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Action,
  Button,
  Choice,
  ChoiceGroup,
  ColorField,
  Dialog,
  FormField,
  Inline,
  PlacementPicker,
  RangeField,
  Section,
  SectionHeader,
  Select,
  Stack,
  Switch,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  TextArea,
  TextField,
} from '@fleetia/lagrange';
import { lagrangeThemeClass } from '@fleetia/lagrange/theme';

import { applySiblingOrder } from '../bookmarks/bookmarkTree';
import { BookmarkTreeSelector } from '../bookmarks/BookmarkTreeSelector';
import type { BookmarkTreePrefs } from '../bookmarks/useBookmarkTreePrefs';
import { useTranslation, type Locale } from '../i18n';
import { DEFAULT_GRID_SETTINGS } from '../newtab/defaultOptionValue';
import chromeBookmarks from '../platform/bookmarks/chromeBookmarks';
import {
  getFontFamilyStyle,
  getLayoutStyle,
  getThemeStyle,
} from '../theme/starlitTheme';
import {
  exportFull,
  exportToJson,
  importFromJson,
  importFull,
} from './exportImport';
import { isFontFamily } from './normalizeSettings';
import { resetAllSettings } from './resetSettings';
import type { BackgroundMedia } from './useBackgroundImage';
import type {
  GridSettings,
  GroupPreference,
  Settings,
  StarlitTheme,
  Bookmark,
} from '../newtab/types';
import * as styles from './OptionsSidebar.css';

type PrimaryTab = 'appearance' | 'css' | 'general' | 'groups' | 'layout';
type AppearanceTab = 'background' | 'bookmark' | 'container' | 'folder';
type HeadingSettings = NonNullable<GridSettings['heading']>;
type FolderSettings = NonNullable<GridSettings['folder']>;
type Margin = NonNullable<GridSettings['margin']>;
type BackgroundDraft =
  | { file: File; kind: 'file' }
  | { kind: 'clear' }
  | { kind: 'url'; url: string };

export type OptionsPreviewState = {
  gridSettings: GridSettings;
  iconSize: number;
  settings: Settings;
  size: number;
  theme: StarlitTheme;
};

export type FontPreviewState = {
  fontFamily: Settings['fontFamily'];
  locale: Locale;
};

const PRIMARY_TABS: readonly PrimaryTab[] = [
  'general',
  'appearance',
  'layout',
  'css',
  'groups',
];
const APPEARANCE_TABS: readonly AppearanceTab[] = [
  'background',
  'container',
  'bookmark',
  'folder',
];

export type OptionsSidebarProps = {
  backgroundMeta: BackgroundMedia | null | undefined;
  colorTheme: StarlitTheme;
  customCSS: string;
  gridSettings: GridSettings;
  groupPreferences: GroupPreference[];
  iconSize: number;
  isBackgroundProcessing: boolean;
  isOpen?: boolean;
  locale: Locale;
  onBackgroundClear: () => Promise<void>;
  onBackgroundFile: (file: File) => Promise<void>;
  onBackgroundUrl: (url: string) => Promise<void>;
  onClose: () => void;
  onCustomCSSChange: (css: string) => Promise<void>;
  onExport?: () => Promise<void>;
  onFontPreviewChange: (preview: FontPreviewState | null) => void;
  onBookmarkTreePreferencesUpdate: (
    preferences: BookmarkTreePrefs,
  ) => Promise<void>;
  onGridSettingsUpdate: (settings: GridSettings) => Promise<void>;
  onGroupPreferencesUpdate: (preferences: GroupPreference[]) => Promise<void>;
  onIconSizeChange: (value: number) => Promise<void>;
  onImport?: (file: File) => Promise<void>;
  onLocaleChange: (locale: Locale) => Promise<void>;
  onSettingsUpdate: (settings: Settings) => Promise<void>;
  onSizeChange: (value: number) => Promise<void>;
  onThemePreset: (preset: StarlitTheme) => Promise<void>;
  onThemeReset: () => Promise<void>;
  orderedTree: Bookmark[];
  preview?: ReactNode | ((draft: OptionsPreviewState) => ReactNode);
  rootId?: string;
  rootPath: string[];
  settings: Settings;
  siblingOrder: Record<string, string[]>;
  size: number;
};

type SettingsSnapshot = {
  customCSS: string;
  gridSettings: GridSettings;
  iconSize: number;
  locale: Locale;
  groupPreferences: GroupPreference[];
  rootId?: string;
  rootPath: string[];
  settings: Settings;
  siblingOrder: Record<string, string[]>;
  size: number;
  theme: StarlitTheme;
};

type RangeControlProps = {
  label: ReactNode;
  max: number;
  min: number;
  onValueChange: (value: number) => void;
  step?: number;
  suffix?: string;
  value: number;
};

function RangeControl({
  label,
  max,
  min,
  onValueChange,
  step,
  suffix = '',
  value,
}: RangeControlProps): ReactElement {
  return (
    <FormField
      label={label}
      marker={
        <Text variant="data">
          {value}
          {suffix}
        </Text>
      }
    >
      <RangeField
        max={max}
        min={min}
        onValueChange={onValueChange}
        step={step}
        value={value}
      />
    </FormField>
  );
}

type ColorControlProps = {
  label: string;
  onValueChange: (value: string) => void;
  value: string;
};

function ColorControl({
  label,
  onValueChange,
  value,
}: ColorControlProps): ReactElement {
  const { t } = useTranslation();

  return (
    <FormField label={label}>
      <ColorField
        alphaLabel={`${label} ${t('sidebar.colorAlpha')}`}
        onValueChange={onValueChange}
        showAlpha
        swatchLabel={`${label} ${t('sidebar.colorSwatch')}`}
        value={value}
      />
    </FormField>
  );
}

type SettingsSectionProps = {
  aside?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  title: ReactNode;
};

function SettingsSection({
  aside,
  children,
  description,
  title,
}: SettingsSectionProps): ReactElement {
  return (
    <Section boundary="weak" spacing="compact">
      <SectionHeader
        aside={aside}
        description={description}
        headingLevel={3}
        headingVariant="label"
        rule="none"
        title={title}
      />
      {children}
    </Section>
  );
}

function isEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parseDimension(value: string | undefined, fallback: number): number {
  const parsedValue = Number.parseFloat(value ?? '');

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown settings error';
}

function createBookmarkTreePreferences(
  rootPath: string[],
  siblingOrder: Record<string, string[]>,
  rootId?: string,
): BookmarkTreePrefs {
  return rootId
    ? { rootId, rootPath, siblingOrder }
    : { rootPath, siblingOrder };
}

async function rollbackSettingsSave(
  operations: readonly (() => Promise<void>)[],
): Promise<void> {
  const failures: unknown[] = [];

  for (const operation of [...operations].reverse()) {
    try {
      await operation();
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length > 0) {
    throw new AggregateError(failures, 'Settings rollback failed');
  }
}

function isLocale(value: string): value is Locale {
  return value === 'en' || value === 'ja' || value === 'ko';
}

function isPrimaryTab(value: string): value is PrimaryTab {
  return PRIMARY_TABS.some((tab) => tab === value);
}

function isAppearanceTab(value: string): value is AppearanceTab {
  return APPEARANCE_TABS.some((tab) => tab === value);
}

function isBackgroundSource(value: string): value is BackgroundMedia['source'] {
  return value === 'file' || value === 'url';
}

function getHeadingSettings(
  gridSettings: GridSettings,
  theme: StarlitTheme,
): HeadingSettings {
  const fallback = {
    borderColor: theme.border,
    borderEnabled: false,
    borderWidth: 1,
    subtitleColor: theme.muted,
    subtitleHoverColor: theme.accent,
    titleBackgroundColor: DEFAULT_GRID_SETTINGS.heading?.titleBackgroundColor,
    titleColor: theme.accent,
  };

  return gridSettings.heading
    ? { ...fallback, ...gridSettings.heading }
    : fallback;
}

function getFolderSettings(
  gridSettings: GridSettings,
  theme: StarlitTheme,
): FolderSettings {
  return (
    gridSettings.folder ?? {
      accent: theme.accent,
      accentText: theme.accentText,
      border: theme.border,
      color: theme.surface,
      text: theme.text,
    }
  );
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
  const draftOrderedTree = useMemo(
    () => applySiblingOrder(orderedTree, draftSiblingOrder),
    [draftSiblingOrder, orderedTree],
  );
  const heading = getHeadingSettings(draftGrid, draftTheme);
  const folder = getFolderSettings(draftGrid, draftTheme);
  const margin = draftGrid.margin ?? {
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  };

  function updateTheme<Key extends keyof StarlitTheme>(
    key: Key,
    value: StarlitTheme[Key],
  ): void {
    setDraftTheme((currentTheme) => ({ ...currentTheme, [key]: value }));
  }

  function updateHeading(changes: Partial<HeadingSettings>): void {
    setDraftGrid((currentGrid) => ({
      ...currentGrid,
      heading: {
        ...getHeadingSettings(currentGrid, draftTheme),
        ...changes,
      },
    }));
  }

  function updateFolder(changes: Partial<FolderSettings>): void {
    setDraftGrid((currentGrid) => ({
      ...currentGrid,
      folder: {
        ...getFolderSettings(currentGrid, draftTheme),
        ...changes,
      },
    }));
  }

  function updateMargin(changes: Partial<Margin>): void {
    setDraftGrid((currentGrid) => ({
      ...currentGrid,
      margin: {
        bottom: currentGrid.margin?.bottom ?? 0,
        left: currentGrid.margin?.left ?? 0,
        right: currentGrid.margin?.right ?? 0,
        top: currentGrid.margin?.top ?? 0,
        ...changes,
      },
    }));
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

  function getBackgroundStatus(): string | null {
    if (draftBackground) {
      switch (draftBackground.kind) {
        case 'clear':
          return t('sidebar.background.pendingRemoval');
        case 'file':
          return `${t('sidebar.background.selected')}: ${draftBackground.file.name}`;
        case 'url':
          return `${t('sidebar.background.selected')}: ${t('sidebar.background.sourceUrl')} · ${draftBackground.url}`;
      }
    }

    if (backgroundMeta) {
      const mediaType = t(
        backgroundMeta.type === 'video'
          ? 'sidebar.background.video'
          : 'sidebar.background.imageType',
      );
      const source = t(
        backgroundMeta.source === 'url'
          ? 'sidebar.background.sourceUrl'
          : 'sidebar.background.sourceFile',
      );
      const detail =
        backgroundMeta.source === 'url' ? ` · ${backgroundMeta.url}` : '';

      return `${t('sidebar.background.current')}: ${mediaType} · ${source}${detail}`;
    }

    return null;
  }

  function renderBackgroundStatus(): ReactElement | null {
    const status = getBackgroundStatus();

    return status ? (
      <Text className={styles.backgroundStatus} tone="muted" variant="caption">
        {status}
      </Text>
    ) : null;
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

  function renderPreview(label: ReactNode): ReactElement | null {
    if (preview === null || preview === undefined) {
      return null;
    }

    const previewContent =
      typeof preview === 'function'
        ? preview({
            gridSettings: draftGrid,
            iconSize: draftIconSize,
            settings: draftSettings,
            size: draftSize,
            theme: draftTheme,
          })
        : preview;

    if (
      previewContent === null ||
      previewContent === undefined ||
      previewContent === false
    ) {
      return null;
    }

    return (
      <SettingsSection description={t('sidebar.preview.note')} title={label}>
        <div
          className={styles.preview}
          data-starlit-part="settings-preview"
          style={previewStyle}
        >
          {previewContent}
        </div>
      </SettingsSection>
    );
  }

  function getAppearancePreviewTitle(): string {
    switch (appearanceTab) {
      case 'background':
        return t('sidebar.background.preview');
      case 'bookmark':
        return t('sidebar.bookmark.preview');
      case 'container':
        return t('sidebar.container.preview');
      case 'folder':
        return t('sidebar.folder.preview');
    }
  }

  function handleAppearanceTabChange(value: string): void {
    if (isAppearanceTab(value)) {
      setAppearanceTab(value);
    }
  }

  function handlePrimaryTabChange(value: string): void {
    if (isPrimaryTab(value)) {
      setPrimaryTab(value);
    }
  }

  function renderBackgroundSettings(): ReactElement {
    const hasBackground =
      (backgroundMeta !== null && backgroundMeta !== undefined) ||
      draftBackground !== null;

    return (
      <Stack gap="lg">
        <SettingsSection title={t('sidebar.background.image')}>
          <Stack gap="md">
            <ChoiceGroup
              description={t('sidebar.background.sourceDescription')}
              label={t('sidebar.background.source')}
              onValueChange={handleBackgroundSourceChange}
              value={backgroundSource}
            >
              <Choice disabled={isBackgroundProcessing || isSaving} value="url">
                {t('sidebar.background.sourceUrl')}
              </Choice>
              <Choice
                disabled={isBackgroundProcessing || isSaving}
                value="file"
              >
                {t('sidebar.background.fileUpload')}
              </Choice>
            </ChoiceGroup>
            {backgroundSource === 'url' ? (
              <Section boundary="weak" spacing="compact">
                <FormField
                  description={t('sidebar.background.urlDescription')}
                  label={t('sidebar.background.url')}
                >
                  <TextField
                    disabled={isBackgroundProcessing || isSaving}
                    inputMode="url"
                    onChange={handleBackgroundUrlChange}
                    placeholder={t('sidebar.background.urlPlaceholder')}
                    type="url"
                    value={backgroundUrl}
                  />
                </FormField>
              </Section>
            ) : (
              <Section boundary="weak" spacing="compact">
                <SectionHeader
                  description={t('sidebar.background.fileDescription')}
                  headingLevel={4}
                  headingVariant="label"
                  rule="none"
                  title={t('sidebar.background.fileUpload')}
                />
                <Button
                  disabled={isBackgroundProcessing || isSaving}
                  onClick={() => backgroundFileRef.current?.click()}
                  size="compact"
                  variant="secondary"
                >
                  {t('sidebar.background.fileSelect')}
                </Button>
              </Section>
            )}
            <input
              ref={backgroundFileRef}
              accept="image/*,video/*,.gif"
              className={styles.hiddenInput}
              onChange={handleBackgroundFileChange}
              type="file"
            />
            {hasBackground ? (
              <Inline align="center" gap="sm" justify="between" wrap>
                {renderBackgroundStatus()}
                <Button
                  disabled={
                    isBackgroundProcessing ||
                    isSaving ||
                    draftBackground?.kind === 'clear'
                  }
                  onClick={handleBackgroundClear}
                  size="compact"
                  variant="critical"
                >
                  {t('sidebar.background.remove')}
                </Button>
              </Inline>
            ) : null}
          </Stack>
        </SettingsSection>
        <SettingsSection title={t('sidebar.tokens.surfaceTitle')}>
          <div className={styles.fieldGrid}>
            <ColorControl
              label={t('sidebar.tokens.surface')}
              onValueChange={(value) => updateTheme('surface', value)}
              value={draftTheme.surface}
            />
            <ColorControl
              label={t('sidebar.tokens.muted')}
              onValueChange={(value) => updateTheme('muted', value)}
              value={draftTheme.muted}
            />
            <ColorControl
              label={t('sidebar.background.color')}
              onValueChange={(value) =>
                setDraftGrid((currentGrid) => ({
                  ...currentGrid,
                  background: { ...currentGrid.background, color: value },
                }))
              }
              value={draftGrid.background.color}
            />
          </div>
        </SettingsSection>
      </Stack>
    );
  }

  function renderContainerSettings(): ReactElement {
    return (
      <Stack gap="lg">
        <SettingsSection title={t('sidebar.tokens.chromeTitle')}>
          <div className={styles.fieldGrid}>
            <ColorControl
              label={t('sidebar.tokens.accent')}
              onValueChange={(value) => updateTheme('accent', value)}
              value={draftTheme.accent}
            />
            <ColorControl
              label={t('sidebar.tokens.accentText')}
              onValueChange={(value) => updateTheme('accentText', value)}
              value={draftTheme.accentText}
            />
            <ColorControl
              label={t('sidebar.tokens.border')}
              onValueChange={(value) => updateTheme('border', value)}
              value={draftTheme.border}
            />
          </div>
        </SettingsSection>
        <SettingsSection title={t('sidebar.container.title')}>
          <div className={styles.fieldGrid}>
            <ColorControl
              label={`${t('sidebar.container.title')} ${t('sidebar.container.text')}`}
              onValueChange={(value) => updateHeading({ titleColor: value })}
              value={heading.titleColor}
            />
            <ColorControl
              label={t('sidebar.container.titleBackground')}
              onValueChange={(value) =>
                updateHeading({ titleBackgroundColor: value })
              }
              value={
                heading.titleBackgroundColor ??
                DEFAULT_GRID_SETTINGS.heading?.titleBackgroundColor ??
                'transparent'
              }
            />
            <RangeControl
              label={t('sidebar.container.size')}
              max={30}
              min={8}
              onValueChange={(value) => updateHeading({ titleSize: value })}
              suffix="px"
              value={heading.titleSize ?? 14}
            />
          </div>
          <Switch
            checked={heading.borderEnabled}
            onChange={(event) =>
              updateHeading({ borderEnabled: event.currentTarget.checked })
            }
          >
            {t('sidebar.container.border')}
          </Switch>
          {heading.borderEnabled ? (
            <div className={styles.fieldGrid}>
              <ColorControl
                label={t('sidebar.container.borderColor')}
                onValueChange={(value) => updateHeading({ borderColor: value })}
                value={heading.borderColor}
              />
              <RangeControl
                label={t('sidebar.container.borderWidth')}
                max={5}
                min={1}
                onValueChange={(value) => updateHeading({ borderWidth: value })}
                suffix="px"
                value={heading.borderWidth}
              />
            </div>
          ) : null}
        </SettingsSection>
        <SettingsSection title={t('sidebar.container.subtitle')}>
          <div className={styles.fieldGrid}>
            <ColorControl
              label={`${t('sidebar.container.subtitle')} ${t('sidebar.container.text')}`}
              onValueChange={(value) => updateHeading({ subtitleColor: value })}
              value={heading.subtitleColor}
            />
            <RangeControl
              label={t('sidebar.container.size')}
              max={24}
              min={8}
              onValueChange={(value) => updateHeading({ subtitleSize: value })}
              suffix="px"
              value={heading.subtitleSize ?? 12}
            />
            <ColorControl
              label={t('sidebar.container.hover')}
              onValueChange={(value) =>
                updateHeading({ subtitleHoverColor: value })
              }
              value={heading.subtitleHoverColor}
            />
            <RangeControl
              label={t('sidebar.container.borderRadius')}
              max={30}
              min={0}
              onValueChange={(value) => updateHeading({ borderRadius: value })}
              suffix="px"
              value={heading.borderRadius ?? 0}
            />
          </div>
        </SettingsSection>
      </Stack>
    );
  }

  function renderBookmarkSettings(): ReactElement {
    const isHorizontal = draftSettings.iconLayout === 'horizontal';

    return (
      <Stack gap="lg">
        <SettingsSection title={t('sidebar.appearance.bookmark')}>
          <Switch
            checked={isHorizontal}
            onChange={(event) => {
              const isChecked = event.currentTarget.checked;
              setDraftSettings((currentSettings) => ({
                ...currentSettings,
                iconLayout: isChecked ? 'horizontal' : 'vertical',
              }));
            }}
          >
            {t('sidebar.bookmark.horizontalIcon')}
          </Switch>
          <div className={styles.fieldGrid}>
            <RangeControl
              label={t('sidebar.bookmark.scale')}
              max={50}
              min={10}
              onValueChange={setDraftSize}
              suffix="px"
              value={draftSize}
            />
            {!isHorizontal ? (
              <>
                <RangeControl
                  label={t('sidebar.bookmark.horizontalSize')}
                  max={10}
                  min={2}
                  onValueChange={(value) =>
                    setDraftGrid((currentGrid) => ({
                      ...currentGrid,
                      icon: { ...currentGrid.icon, width: value },
                    }))
                  }
                  step={0.5}
                  suffix="em"
                  value={draftGrid.icon.width ?? 4}
                />
                <RangeControl
                  label={t('sidebar.bookmark.verticalSize')}
                  max={10}
                  min={2}
                  onValueChange={(value) =>
                    setDraftGrid((currentGrid) => ({
                      ...currentGrid,
                      icon: { ...currentGrid.icon, height: value },
                    }))
                  }
                  step={0.5}
                  suffix="em"
                  value={draftGrid.icon.height ?? 4}
                />
              </>
            ) : null}
            <RangeControl
              label={t('sidebar.bookmark.iconSize')}
              max={32}
              min={16}
              onValueChange={setDraftIconSize}
              suffix="px"
              value={draftIconSize}
            />
            <RangeControl
              label={t('sidebar.bookmark.borderRadius')}
              max={30}
              min={0}
              onValueChange={(value) =>
                setDraftGrid((currentGrid) => ({
                  ...currentGrid,
                  icon: { ...currentGrid.icon, borderRadius: value },
                }))
              }
              suffix="px"
              value={draftGrid.icon.borderRadius ?? 1}
            />
            <RangeControl
              label={t('sidebar.bookmark.iconBorderRadius')}
              max={30}
              min={0}
              onValueChange={(value) =>
                setDraftGrid((currentGrid) => ({
                  ...currentGrid,
                  icon: { ...currentGrid.icon, iconRadius: value },
                }))
              }
              suffix="px"
              value={draftGrid.icon.iconRadius ?? 1}
            />
          </div>
        </SettingsSection>
        <SettingsSection title={t('sidebar.tokens.bookmarkTitle')}>
          <div className={styles.fieldGrid}>
            <ColorControl
              label={t('sidebar.bookmark.boxColor')}
              onValueChange={(value) =>
                setDraftGrid((currentGrid) => ({
                  ...currentGrid,
                  icon: { ...currentGrid.icon, color: value },
                }))
              }
              value={draftGrid.icon.color}
            />
            <ColorControl
              label={t('sidebar.bookmark.text')}
              onValueChange={(value) => updateTheme('text', value)}
              value={draftTheme.text}
            />
            <ColorControl
              label={t('sidebar.bookmark.hoverBackground')}
              onValueChange={(value) => updateTheme('hoverBg', value)}
              value={draftTheme.hoverBg}
            />
            <ColorControl
              label={t('sidebar.bookmark.hoverText')}
              onValueChange={(value) => updateTheme('hoverText', value)}
              value={draftTheme.hoverText}
            />
          </div>
        </SettingsSection>
      </Stack>
    );
  }

  function renderFolderSettings(): ReactElement {
    return (
      <Stack gap="lg">
        <SettingsSection title={t('sidebar.appearance.folder')}>
          <Switch
            checked={draftSettings.iconLayout === 'horizontal'}
            onChange={(event) => {
              const isChecked = event.currentTarget.checked;
              setDraftSettings((currentSettings) => ({
                ...currentSettings,
                iconLayout: isChecked ? 'horizontal' : 'vertical',
              }));
            }}
          >
            {t('sidebar.folder.horizontalIcon')}
          </Switch>
          <div className={styles.fieldGrid}>
            <ColorControl
              label={t('sidebar.folder.background')}
              onValueChange={(value) => updateFolder({ color: value })}
              value={folder.color}
            />
            <ColorControl
              label={t('sidebar.folder.iconBackground')}
              onValueChange={(value) => updateFolder({ accent: value })}
              value={folder.accent}
            />
            <ColorControl
              label={t('sidebar.folder.iconColor')}
              onValueChange={(value) => updateFolder({ accentText: value })}
              value={folder.accentText}
            />
            <ColorControl
              label={t('sidebar.folder.text')}
              onValueChange={(value) => updateFolder({ text: value })}
              value={folder.text}
            />
            <ColorControl
              label={t('sidebar.folder.border')}
              onValueChange={(value) => updateFolder({ border: value })}
              value={folder.border}
            />
          </div>
        </SettingsSection>
      </Stack>
    );
  }

  function renderAppearanceSettings(): ReactElement {
    return (
      <Stack gap="lg">
        {renderPreview(getAppearancePreviewTitle())}
        <Tabs
          className={styles.appearanceTabs}
          onValueChange={handleAppearanceTabChange}
          value={appearanceTab}
        >
          <TabList aria-label={t('sidebar.tab.appearance')}>
            <Tab value="background">{t('sidebar.appearance.background')}</Tab>
            <Tab value="container">{t('sidebar.appearance.container')}</Tab>
            <Tab value="bookmark">{t('sidebar.appearance.bookmark')}</Tab>
            <Tab value="folder">{t('sidebar.appearance.folder')}</Tab>
          </TabList>
          <TabPanel data-starlit-part="settings-background" value="background">
            {renderBackgroundSettings()}
          </TabPanel>
          <TabPanel data-starlit-part="settings-container" value="container">
            {renderContainerSettings()}
          </TabPanel>
          <TabPanel data-starlit-part="settings-bookmark" value="bookmark">
            {renderBookmarkSettings()}
          </TabPanel>
          <TabPanel data-starlit-part="settings-folder" value="folder">
            {renderFolderSettings()}
          </TabPanel>
        </Tabs>
      </Stack>
    );
  }

  function renderLayoutSettings(): ReactElement {
    const isHorizontal = draftSettings.iconLayout === 'horizontal';
    const isExpanded = draftSettings.isExpandView;
    let columnLabel = t('sidebar.layout.columnCount');

    if (isHorizontal) {
      columnLabel = t('sidebar.layout.horizontalSize');
    } else if (isExpanded) {
      columnLabel = t('sidebar.layout.cardInnerColumns');
    }

    return (
      <Stack gap="lg">
        {renderPreview(t('sidebar.layout.preview'))}
        <SettingsSection title={t('sidebar.tab.layout')}>
          <Stack gap="sm">
            <Switch
              checked={isExpanded}
              onChange={(event) => {
                const isChecked = event.currentTarget.checked;
                setDraftSettings((currentSettings) => ({
                  ...currentSettings,
                  isExpandView: isChecked,
                }));
              }}
            >
              {t('sidebar.layout.expandBookmarks')}
            </Switch>
            <Switch
              checked={isHorizontal}
              onChange={(event) => {
                const isChecked = event.currentTarget.checked;
                setDraftSettings((currentSettings) => ({
                  ...currentSettings,
                  iconLayout: isChecked ? 'horizontal' : 'vertical',
                }));
              }}
            >
              {t('sidebar.layout.horizontalIcon')}
            </Switch>
          </Stack>
        </SettingsSection>
        <SettingsSection
          title={
            isExpanded
              ? t('sidebar.layout.expandLayout')
              : t('sidebar.layout.scrollLayout')
          }
        >
          <div className={styles.fieldGrid}>
            {isExpanded ? (
              <RangeControl
                label={t('sidebar.layout.cardColumns')}
                max={5}
                min={1}
                onValueChange={(value) =>
                  setDraftGrid((currentGrid) => ({
                    ...currentGrid,
                    masonryColumns: value,
                  }))
                }
                value={draftGrid.masonryColumns ?? 2}
              />
            ) : null}
            <RangeControl
              label={columnLabel}
              max={10}
              min={3}
              onValueChange={(value) =>
                setDraftGrid((currentGrid) => ({
                  ...currentGrid,
                  columns: value,
                }))
              }
              value={draftGrid.columns}
            />
            {isHorizontal ? (
              <RangeControl
                label={t('sidebar.layout.horizontalColumnCount')}
                max={5}
                min={1}
                onValueChange={(value) =>
                  setDraftGrid((currentGrid) => ({
                    ...currentGrid,
                    horizontalColumns: value,
                  }))
                }
                value={draftGrid.horizontalColumns ?? 1}
              />
            ) : null}
            {!isExpanded ? (
              <RangeControl
                label={t('sidebar.layout.rowCount')}
                max={5}
                min={1}
                onValueChange={(value) =>
                  setDraftGrid((currentGrid) => ({
                    ...currentGrid,
                    rows: value,
                  }))
                }
                value={draftGrid.rows}
              />
            ) : null}
            {isExpanded ? (
              <RangeControl
                label={t('sidebar.layout.cardGap')}
                max={5}
                min={0}
                onValueChange={(value) =>
                  setDraftGrid((currentGrid) => ({
                    ...currentGrid,
                    cardGap: `${value}em`,
                  }))
                }
                step={0.1}
                suffix="em"
                value={parseDimension(draftGrid.cardGap, 1.5)}
              />
            ) : null}
            <RangeControl
              label={
                isExpanded
                  ? t('sidebar.layout.bookmarkGap')
                  : t('sidebar.layout.gap')
              }
              max={3}
              min={0}
              onValueChange={(value) =>
                setDraftGrid((currentGrid) => ({
                  ...currentGrid,
                  gap: `${value}em`,
                }))
              }
              step={0.1}
              suffix="em"
              value={parseDimension(draftGrid.gap, 1)}
            />
          </div>
        </SettingsSection>
        <SettingsSection title={t('sidebar.layout.positionMargin')}>
          <PlacementPicker
            label={t('positionGrid.group')}
            onValueChange={(value) =>
              setDraftGrid((currentGrid) => ({
                ...currentGrid,
                position: value,
              }))
            }
            value={draftGrid.position}
          />
          <div className={styles.marginGrid}>
            <RangeControl
              label={t('positionGrid.margin.top')}
              max={100}
              min={0}
              onValueChange={(value) => updateMargin({ top: value })}
              suffix="px"
              value={margin.top}
            />
            <RangeControl
              label={t('positionGrid.margin.right')}
              max={100}
              min={0}
              onValueChange={(value) => updateMargin({ right: value })}
              suffix="px"
              value={margin.right}
            />
            <RangeControl
              label={t('positionGrid.margin.bottom')}
              max={100}
              min={0}
              onValueChange={(value) => updateMargin({ bottom: value })}
              suffix="px"
              value={margin.bottom}
            />
            <RangeControl
              label={t('positionGrid.margin.left')}
              max={100}
              min={0}
              onValueChange={(value) => updateMargin({ left: value })}
              suffix="px"
              value={margin.left}
            />
          </div>
        </SettingsSection>
      </Stack>
    );
  }

  function renderGeneralSettings(): ReactElement {
    return (
      <Stack gap="lg">
        <SettingsSection title={t('sidebar.general.language')}>
          <ChoiceGroup
            label={t('sidebar.general.language')}
            onValueChange={(value) => {
              if (isLocale(value)) {
                setDraftLocale(value);
              }
            }}
            value={draftLocale}
          >
            <Choice value="en">English</Choice>
            <Choice value="ko">한국어</Choice>
            <Choice value="ja">日本語</Choice>
          </ChoiceGroup>
        </SettingsSection>
        <SettingsSection
          description={t('sidebar.general.fontDescription')}
          title={t('sidebar.general.fontFamily')}
        >
          <FormField label={t('sidebar.general.fontFamily')}>
            <Select
              onChange={(event) => {
                const fontFamily = event.currentTarget.value;

                if (isFontFamily(fontFamily)) {
                  setDraftSettings((currentSettings) => ({
                    ...currentSettings,
                    fontFamily,
                  }));
                }
              }}
              value={draftSettings.fontFamily}
            >
              <option value="ibm-plex-sans">
                {t('sidebar.general.fontIbmPlexSans')}
              </option>
              <option value="system">{t('sidebar.general.fontSystem')}</option>
            </Select>
          </FormField>
        </SettingsSection>
        <SettingsSection title={t('sidebar.tab.general')}>
          <Switch
            checked={draftSettings.isOpenInNewTab}
            onChange={(event) => {
              const isChecked = event.currentTarget.checked;
              setDraftSettings((currentSettings) => ({
                ...currentSettings,
                isOpenInNewTab: isChecked,
              }));
            }}
          >
            {t('sidebar.general.openInNewTab')}
          </Switch>
        </SettingsSection>
        <SettingsSection title={t('sidebar.general.exportImport')}>
          <Inline gap="sm">
            <Button onClick={() => void handleExport()} variant="secondary">
              {t('sidebar.general.export')}
            </Button>
            <Button
              onClick={() => settingsFileRef.current?.click()}
              variant="secondary"
            >
              {t('sidebar.general.import')}
            </Button>
            <input
              ref={settingsFileRef}
              accept=".json,application/json"
              className={styles.hiddenInput}
              onChange={(event) => void handleImportFile(event)}
              type="file"
            />
          </Inline>
        </SettingsSection>
        <SettingsSection title={t('sidebar.general.reset')}>
          <Inline gap="sm">
            <Button onClick={() => void handleResetTheme()} variant="critical">
              {t('sidebar.general.resetTheme')}
            </Button>
            <Button onClick={() => void handleResetAll()} variant="critical">
              {t('sidebar.general.resetAll')}
            </Button>
          </Inline>
        </SettingsSection>
        <SettingsSection title={t('sidebar.general.credits')}>
          <div className={styles.credits}>
            <a
              className={styles.link}
              href="https://x.com/FlogLammer"
              rel="noopener noreferrer"
              target="_blank"
            >
              @FlogLammer · {t('sidebar.general.credits.dev')}
            </a>
            <a
              className={styles.link}
              href="https://x.com/dn_blanked"
              rel="noopener noreferrer"
              target="_blank"
            >
              @dn_blanked · {t('sidebar.general.credits.planning')}
            </a>
            <a
              className={styles.link}
              href="https://star-light.space"
              rel="noopener noreferrer"
              target="_blank"
            >
              {t('sidebar.general.credits.homepage')}
            </a>
          </div>
        </SettingsSection>
      </Stack>
    );
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
          <aside
            aria-label={t('sidebar.support.title')}
            className={styles.support}
            data-starlit-part="settings-support"
          >
            <Stack gap="xxs">
              <Text as="p" variant="label" weight="strong">
                {t('sidebar.support.title')}
              </Text>
              <Text as="p" tone="muted" variant="caption">
                {t('sidebar.support.description')}
              </Text>
            </Stack>
            <div className={styles.supportActions}>
              <a
                className={styles.supportLink}
                href="https://fairy.hada.io/@starlit#support"
                rel="noopener noreferrer"
                target="_blank"
              >
                {t('sidebar.support.fairy')}
              </a>
              <a
                className={`${styles.supportLink} ${styles.supportLinkSecondary}`}
                href="https://buymeacoffee.com/starlight.space"
                rel="noopener noreferrer"
                target="_blank"
              >
                Buy Me a Coffee
              </a>
            </div>
          </aside>
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
              {renderGeneralSettings()}
            </TabPanel>
            <TabPanel
              className={styles.panel}
              data-starlit-part="settings-appearance"
              value="appearance"
            >
              {renderAppearanceSettings()}
            </TabPanel>
            <TabPanel
              className={styles.panel}
              data-starlit-part="settings-layout"
              value="layout"
            >
              {renderLayoutSettings()}
            </TabPanel>
            <TabPanel
              className={styles.panel}
              data-starlit-part="settings-css"
              value="css"
            >
              <SettingsSection title={t('sidebar.css.title')}>
                <FormField
                  description={t('sidebar.css.help')}
                  label={t('sidebar.css.title')}
                >
                  <TextArea
                    onChange={(event) => setDraftCSS(event.currentTarget.value)}
                    placeholder={t('sidebar.css.placeholder')}
                    resize="vertical"
                    rows={14}
                    spellCheck={false}
                    value={draftCSS}
                  />
                </FormField>
              </SettingsSection>
            </TabPanel>
            <TabPanel
              className={styles.panel}
              data-starlit-part="settings-groups"
              value="groups"
            >
              <Stack gap="lg">
                <SettingsSection
                  aside={
                    <Action
                      onClick={() => void handleOpenBookmarkManager()}
                      size="compact"
                    >
                      {t('groups.openManager')}
                    </Action>
                  }
                  description={
                    <>
                      {t('groups.connectionDescription')}
                      <br />
                      {t('groups.localPreferences')}
                    </>
                  }
                  title={t('groups.connectionTitle')}
                >
                  <details
                    className={styles.bookmarkGuide}
                    data-starlit-part="bookmark-connection-guide"
                  >
                    <summary className={styles.bookmarkGuideSummary}>
                      {t('groups.guideSummary')}
                    </summary>
                    <Stack className={styles.bookmarkGuideContent} gap="xs">
                      <Text as="p" variant="caption">
                        {t('groups.guideChrome')}
                      </Text>
                      <Text as="p" variant="caption">
                        {t('groups.guideStarlit')}
                      </Text>
                      <Text as="p" tone="critical" variant="caption">
                        {t('groups.guideDelete')}
                      </Text>
                    </Stack>
                  </details>
                </SettingsSection>
                <BookmarkTreeSelector
                  bookmarks={draftOrderedTree}
                  groupPreferences={draftGroupPreferences}
                  onSelectRoot={(path, nextRootId) => {
                    setDraftRootId(nextRootId);
                    setDraftRootPath(path);
                  }}
                  onSiblingReorder={updateDraftSiblingOrder}
                  onToggleVisibility={toggleDraftVisibility}
                  rootId={draftRootId}
                  rootPath={draftRootPath}
                  siblingOrder={draftSiblingOrder}
                />
              </Stack>
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
