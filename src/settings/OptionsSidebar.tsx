import type { ChangeEvent, ReactElement, SetStateAction } from 'react';
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
import type { Bookmark } from '../bookmarks/types';
import { useTranslation } from '../i18n';
import { getLayoutStyle } from '../layout/layoutStyle';
import { createGuideHref } from '../guide/guideRoute';
import chromeBookmarks, {
  collectWritableBookmarkFolders,
} from '../platform/bookmarks/chromeBookmarks';
import { createChromeSceneBookmarkGateway } from '../platform/bookmarks/sceneBookmarkGateway';
import { OverlayPositionEditor } from '../overlays/OverlayPositionEditor';
import { appendOverlayImages } from '../overlays/model';
import type { OverlayScene } from '../overlays/types';
import type { OverlayImageMutation } from '../overlays/useOverlayImageActions';
import { getFontFamilyStyle, getThemeStyle } from '../theme/starlitTheme';
import type { StarlitTheme } from '../theme/types';
import {
  copyBookmarkFolderToScene,
  DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE,
  findDefaultSceneBookmarkParent,
  mergeCanvasWithOverlay,
  previewBookmarkCopy,
  projectCanvasSceneToStableOverlayScene,
  projectOverlaySceneToCanvasScene,
  remapBookmarkPreferences,
  type CanvasSceneV2,
  type SceneRuntimeSnapshot,
} from '../scenes';
import { resetAllSettings } from './resetSettings';
import type { BackgroundMedia } from './backgroundMedia';
import { AppearancePanel } from './options/AppearancePanel';
import { CustomCssPanel } from './options/CustomCssPanel';
import { GeneralPanel } from './options/GeneralPanel';
import { GroupsPanel } from './options/GroupsPanel';
import { LayoutPanel } from './options/LayoutPanel';
import { LayersPanel } from './options/LayersPanel';
import { PortableProfilePanel } from './options/PortableProfilePanel';
import {
  ScenePanel,
  type CreateSceneFromSettingsInput,
  type RelinkSceneFromSettingsInput,
  type SceneCreatePreview,
  type SceneFolderOption,
} from './options/ScenePanel';
import { SupportPanel } from './options/SupportPanel';
import { WidgetsPanel } from './options/WidgetsPanel';
import {
  createBookmarkTreePreferences,
  getErrorMessage,
  isEqual,
  isPrimaryTab,
} from './options/helpers';
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
import { relinkSceneResources } from './relinkSceneResources';
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

const sceneBookmarkGateway = createChromeSceneBookmarkGateway();

function collectSceneFolderOptions(
  bookmarks: readonly Bookmark[],
  parentPath: readonly string[] = [],
): SceneFolderOption[] {
  return bookmarks.flatMap((bookmark) => {
    const path = bookmark.route?.length
      ? [...bookmark.route]
      : [...parentPath, bookmark.title];
    const current = bookmark.id
      ? [{ id: bookmark.id, label: path.join(' / '), path }]
      : [];
    return [
      ...current,
      ...collectSceneFolderOptions(bookmark.children ?? [], path),
    ];
  });
}

function resolveDraftBackgroundMeta(
  current: BackgroundMedia | null | undefined,
  draft: BackgroundDraft | null,
): BackgroundMedia | null {
  if (!draft) return current ?? null;
  if (draft.kind === 'clear') return null;
  if (draft.kind === 'url') {
    return {
      source: 'url',
      type: /\.(mp4|webm|mov)(\?|$)/i.test(draft.url) ? 'video' : 'image',
      url: draft.url,
    };
  }
  return {
    source: 'file',
    type:
      draft.file.type === 'image/gif' || draft.file.type.startsWith('video/')
        ? 'video'
        : 'image',
    url: '',
  };
}

function OptionsSidebarSession({
  initialOverlayImageId,
  initialWidgetId,
  initialTab = 'general',
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
  onBackgroundRestore,
  onBackgroundSnapshot,
  onBackgroundUrl,
  onBookmarkTreePreferencesUpdate,
  onBookmarksImported,
  onCanvasEditPreviewChange,
  onClose,
  onCustomCSSChange,
  onFontPreviewChange,
  onGridSettingsUpdate,
  onGroupPreferencesUpdate,
  onIconSizeChange,
  onLocaleChange,
  onOverlayEditPreviewChange,
  onOverlayFilesPrepare,
  onOverlayImagesFinalize,
  onOverlayImagesDiscard,
  onOverlayMotionPlaybackOverrideChange,
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
  sceneController,
  settings,
  siblingOrder,
  size,
}: OptionsSidebarProps): ReactElement {
  const { t } = useTranslation();
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>(initialTab);
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
  const [draftCanvas, setDraftCanvas] = useState<CanvasSceneV2>(() =>
    structuredClone(
      sceneController.activeScene?.canvas ??
        projectOverlaySceneToCanvasScene(overlayScene),
    ),
  );
  const draftOverlaySceneRef = useRef(draftOverlayScene);
  const [preparedOverlayImageIds, setPreparedOverlayImageIds] = useState<
    string[]
  >([]);
  const [canvasEditorInitialItemId, setCanvasEditorInitialItemId] = useState<
    string | null
  >(initialWidgetId ?? initialOverlayImageId ?? null);
  const [isOverlayEditorOpen, setIsOverlayEditorOpen] = useState(
    initialOverlayImageId !== undefined || initialWidgetId !== undefined,
  );
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOverlayActionProcessing, setIsOverlayActionProcessing] =
    useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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
      onCanvasEditPreviewChange?.(null);
    },
    [
      onCanvasEditPreviewChange,
      onFontPreviewChange,
      onOverlayEditPreviewChange,
    ],
  );

  useEffect(() => {
    onOverlayEditPreviewChange(isOverlayEditorOpen ? draftOverlayScene : null);
  }, [draftOverlayScene, isOverlayEditorOpen, onOverlayEditPreviewChange]);

  useEffect(() => {
    onCanvasEditPreviewChange?.(isOverlayEditorOpen ? draftCanvas : null);
  }, [draftCanvas, isOverlayEditorOpen, onCanvasEditPreviewChange]);

  const [snapshot] = useState<SettingsSnapshot>(() => ({
    canvas: structuredClone(
      sceneController.activeScene?.canvas ??
        projectOverlaySceneToCanvasScene(overlayScene),
    ),
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
      !isEqual(draftCanvas, snapshot.canvas) ||
      preparedOverlayImageIds.length > 0 ||
      draftBackground !== null,
    [
      draftBackground,
      draftCanvas,
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
  const convertedSceneFolderOptions = useMemo(
    () => collectSceneFolderOptions(draftOrderedTree),
    [draftOrderedTree],
  );
  const [rawSceneFolderOptions, setRawSceneFolderOptions] = useState<
    SceneFolderOption[] | null
  >(null);

  useEffect(() => {
    let isActive = true;
    void chromeBookmarks.getTree().then(
      (tree) => {
        if (isActive) {
          setRawSceneFolderOptions(collectWritableBookmarkFolders(tree));
        }
      },
      () => {
        if (isActive) setRawSceneFolderOptions([]);
      },
    );
    return () => {
      isActive = false;
    };
  }, []);

  const sceneFolderOptions =
    rawSceneFolderOptions && rawSceneFolderOptions.length > 0
      ? rawSceneFolderOptions
      : convertedSceneFolderOptions;
  const sceneSourceFolderId =
    draftRootId ??
    sceneFolderOptions.find(
      (option) =>
        option.path.length === draftRootPath.length &&
        option.path.every((segment, index) => segment === draftRootPath[index]),
    )?.id ??
    '0';
  const isMediaProcessing =
    isBackgroundProcessing || isOverlayProcessing || isOverlayActionProcessing;

  function createRuntimeSnapshot(): SceneRuntimeSnapshot {
    return {
      backgroundMeta: resolveDraftBackgroundMeta(
        backgroundMeta,
        draftBackground,
      ),
      bookmarkTreePrefs: createBookmarkTreePreferences(
        draftRootPath,
        draftSiblingOrder,
        draftRootId,
      ),
      canvas: draftCanvas,
      colorTheme: draftTheme,
      customCSS: draftCSS,
      gridSettings: draftGrid,
      groupPreferences: draftGroupPreferences,
      iconSize: draftIconSize,
      overlayScene: draftOverlayScene,
      settings: draftSettings,
      size: draftSize,
    };
  }

  function updateDraftOverlayScene(update: SetStateAction<OverlayScene>): void {
    const current = draftOverlaySceneRef.current;
    const next = typeof update === 'function' ? update(current) : update;
    draftOverlaySceneRef.current = next;
    setDraftOverlayScene(next);
    setDraftCanvas((canvas) => mergeCanvasWithOverlay(canvas, next));
  }

  function updateDraftCanvas(canvas: CanvasSceneV2): void {
    const nextOverlayScene = projectCanvasSceneToStableOverlayScene(
      canvas,
      draftOverlaySceneRef.current,
    );
    draftOverlaySceneRef.current = nextOverlayScene;
    setDraftOverlayScene(nextOverlayScene);
    setDraftCanvas(canvas);
  }

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
    const activeSceneId = sceneController.activeSceneId;

    try {
      saveResult = await saveSettingsChanges({
        afterSave: activeSceneId
          ? () =>
              sceneController
                .updateScene(activeSceneId, createRuntimeSnapshot())
                .then(() => undefined)
          : undefined,
        callbacks: {
          onBackgroundClear,
          onBackgroundFile,
          onBackgroundRestore,
          onBackgroundSnapshot,
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
      updateDraftOverlayScene((currentScene) =>
        appendOverlayImages(currentScene, preparedLayers),
      );
    } catch {
      setActionError(t('layers.error'));
    }
  }

  function handleOverlayImageAction(mutation: OverlayImageMutation): void {
    setActionError(null);
    if (mutation.preparedImageIds.length > 0) {
      setPreparedOverlayImageIds((currentIds) => [
        ...new Set([...currentIds, ...mutation.preparedImageIds]),
      ]);
    }
    updateDraftOverlayScene(mutation.scene);
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

  async function prepareSceneCreate(): Promise<SceneCreatePreview> {
    const [previewResult, defaultDestinationParentId] = await Promise.all([
      previewBookmarkCopy(sceneSourceFolderId, sceneBookmarkGateway),
      findDefaultSceneBookmarkParent(sceneBookmarkGateway),
    ]);
    return { defaultDestinationParentId, preview: previewResult };
  }

  async function createSceneFromSettings({
    destination,
    name,
  }: CreateSceneFromSettingsInput): Promise<void> {
    const previousActiveSceneId = sceneController.activeSceneId;
    const previousSceneIds = new Set(
      sceneController.scenes.map((scene) => scene.id),
    );
    const copied = await copyBookmarkFolderToScene(
      {
        destinationParentId: destination.id,
        sceneName: name,
        sourceFolderId: sceneSourceFolderId,
      },
      sceneBookmarkGateway,
    );
    let createdSceneId: string | null = null;
    let wasSceneApplied = false;

    try {
      const remappedBookmarkPreferences = remapBookmarkPreferences(
        {
          groupPreferences: draftGroupPreferences,
          siblingOrder: draftSiblingOrder,
        },
        copied.identityMap,
      );
      const collection = await sceneController.createScene(
        createRuntimeSnapshot(),
        {
          bookmarkCollection: {
            folderId: copied.sceneFolderId,
            folderOwnership: 'scene',
            folderPath: [
              ...destination.path,
              DEFAULT_SCENE_BOOKMARK_CONTAINER_TITLE,
              name,
            ],
            groupPreferences: remappedBookmarkPreferences.groupPreferences,
            siblingOrder: remappedBookmarkPreferences.siblingOrder,
          },
          makeActive: false,
          name,
        },
      );
      createdSceneId =
        collection.scenes.find((scene) => !previousSceneIds.has(scene.id))
          ?.id ?? null;
      if (!createdSceneId) {
        throw new Error('The new Scene was not saved.');
      }
      if (!previousActiveSceneId) {
        await onBookmarksImported();
      }
      await sceneController.applyScene(createdSceneId);
      wasSceneApplied = true;
      if (previousActiveSceneId) {
        await onBookmarksImported();
      }
    } catch (error) {
      const cleanupFailures: unknown[] = [];
      let canCleanupCreatedResources = true;

      if (createdSceneId && wasSceneApplied) {
        try {
          if (previousActiveSceneId) {
            await sceneController.applyScene(previousActiveSceneId);
          }
        } catch (restoreError) {
          canCleanupCreatedResources = false;
          cleanupFailures.push(restoreError);
        }
      }

      if (canCleanupCreatedResources) {
        if (createdSceneId) {
          try {
            await sceneController.deleteScene(createdSceneId, {
              deleteAssets: true,
            });
          } catch (cleanupError) {
            cleanupFailures.push(cleanupError);
          }
        }
        try {
          await sceneBookmarkGateway.removeTree(copied.sceneFolderId);
          if (copied.wasContainerCreated) {
            await sceneBookmarkGateway.removeTree(copied.containerFolderId);
          }
        } catch (cleanupError) {
          cleanupFailures.push(cleanupError);
        }
      }
      if (cleanupFailures.length > 0) {
        const failure = new AggregateError(
          [error, ...cleanupFailures],
          'Scene creation and cleanup both failed.',
        );
        failure.cause = error;
        throw failure;
      }
      throw error;
    }

    onClose();
  }

  async function applySceneFromSettings(sceneId: string): Promise<void> {
    await sceneController.applyScene(sceneId);
    await onBookmarksImported();
    onClose();
  }

  async function deleteSceneFromSettings(
    sceneId: string,
    options: { deleteBookmarkFolder: boolean },
  ): Promise<void> {
    await sceneController.deleteScene(sceneId, options);
    if (options.deleteBookmarkFolder) await onBookmarksImported();
  }

  async function relinkSceneFromSettings(
    sceneId: string,
    input: RelinkSceneFromSettingsInput,
  ): Promise<void> {
    const scene = sceneController.scenes.find(
      (candidate) => candidate.id === sceneId,
    );
    if (!scene) throw new Error(`Scene does not exist: ${sceneId}`);

    await relinkSceneResources({
      assetFiles: input.assetFiles,
      ...(input.folder
        ? {
            folder: { id: input.folder.id, path: input.folder.path },
          }
        : {}),
      relink: (relinkInput) =>
        sceneController.relinkScene(sceneId, relinkInput).then(() => undefined),
      scene,
    });
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
      throw error;
    }
  }

  function handlePrimaryTabChange(value: string): void {
    if (isPrimaryTab(value)) {
      setPrimaryTab(value);
    }
  }

  function openOverlayEditor(itemId?: string): void {
    setCanvasEditorInitialItemId(itemId ?? null);
    setIsOverlayEditorOpen(true);
  }

  return (
    <>
      {isOverlayEditorOpen ? (
        <OverlayPositionEditor
          {...(canvasEditorInitialItemId
            ? { initialSelectedItemId: canvasEditorInitialItemId }
            : {})}
          canvas={draftCanvas}
          onChange={updateDraftOverlayScene}
          onCanvasChange={updateDraftCanvas}
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
                  {isOverlayProcessing || isOverlayActionProcessing
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
              <Tab value="widgets">{t('sidebar.tab.widgets')}</Tab>
              <Tab value="layout">{t('sidebar.tab.layout')}</Tab>
              <Tab value="css">{t('sidebar.tab.css')}</Tab>
              <Tab value="groups">{t('sidebar.tab.groups')}</Tab>
              <Tab value="scene">{t('sidebar.tab.scene')}</Tab>
              <Tab value="portable">{t('portable.title')}</Tab>
            </TabList>
            <TabPanel
              className={styles.panel}
              data-starlit-part="settings-general"
              value="general"
            >
              <GeneralPanel
                guideHref={createGuideHref(draftLocale, 'getting-started')}
                locale={draftLocale}
                onResetAll={handleResetAll}
                onResetTheme={handleResetTheme}
                setLocale={setDraftLocale}
                setSettings={setDraftSettings}
                settings={draftSettings}
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
              data-starlit-part="settings-widgets"
              value="widgets"
            >
              <WidgetsPanel
                canvas={sceneController.activeScene ? draftCanvas : null}
                isImageProcessing={
                  isOverlayProcessing || isOverlayActionProcessing
                }
                onChange={updateDraftCanvas}
                onImageFilesSelected={(files) =>
                  void handleOverlayFilesSelected(files)
                }
                onWidgetAdded={openOverlayEditor}
              >
                <LayersPanel
                  canvas={draftCanvas}
                  copy={{
                    addImages: t('layers.add'),
                    back: t('layers.back'),
                    bookmarks: t('layers.bookmarks'),
                    bookmarksDescription: t('layers.bookmarksDescription'),
                    calendar: t('widgets.calendar'),
                    clock: t('widgets.clock'),
                    configureWidget: (name) =>
                      `${t('widgets.configure')}: ${name}`,
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
                    moreActions: (name) =>
                      `${t('layers.action.more')}: ${name}`,
                    processing: t('layers.processing'),
                    removeImage: (name) => `${t('layers.remove')}: ${name}`,
                    removeWidget: (name) => `${t('widgets.remove')}: ${name}`,
                    title: t('layers.title'),
                  }}
                  isProcessing={isOverlayProcessing}
                  onCanvasChange={updateDraftCanvas}
                  onConfigureWidget={openOverlayEditor}
                  onEditPositions={openOverlayEditor}
                  onFilesSelected={(files) =>
                    void handleOverlayFilesSelected(files)
                  }
                  onImageAction={handleOverlayImageAction}
                  onImageActionError={(error) =>
                    setActionError(error ? t('layers.error') : null)
                  }
                  onImageActionProcessingChange={setIsOverlayActionProcessing}
                  onImageFilesPrepare={onOverlayFilesPrepare}
                  onImagePreparationRollback={onOverlayImagesDiscard}
                  onMotionPlaybackOverrideChange={
                    onOverlayMotionPlaybackOverrideChange
                  }
                  onSceneChange={updateDraftOverlayScene}
                  scene={draftOverlayScene}
                  showAddAction={false}
                />
              </WidgetsPanel>
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
            <TabPanel
              className={styles.panel}
              data-starlit-part="settings-scene"
              value="scene"
            >
              <ScenePanel
                activeSceneId={sceneController.activeSceneId}
                error={sceneController.error}
                folderOptions={sceneFolderOptions}
                isProcessing={sceneController.isProcessing}
                onApply={applySceneFromSettings}
                onCreate={createSceneFromSettings}
                onDelete={deleteSceneFromSettings}
                onGetReadiness={sceneController.getReadiness}
                onPrepareCreate={prepareSceneCreate}
                onRelink={relinkSceneFromSettings}
                onRestore={async (sceneId) => {
                  await sceneController.restoreScene(sceneId);
                }}
                scenes={sceneController.scenes}
              />
            </TabPanel>
            <TabPanel
              className={styles.panel}
              data-starlit-part="settings-portable"
              value="portable"
            >
              <PortableProfilePanel
                onImported={() => window.location.reload()}
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
