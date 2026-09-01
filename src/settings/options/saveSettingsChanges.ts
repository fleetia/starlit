import { getOverlayImageLayers } from '../../overlays/model';
import {
  createSelfRestoringTransactionStep,
  runStorageTransaction,
  type TransactionStep,
} from '../../platform/storage/transactionCoordinator';
import { createBookmarkTreePreferences, isEqual } from './helpers';
import type {
  BackgroundDraft,
  OptionsSidebarProps,
  SettingsSnapshot,
} from './types';

type SettingsSaveCallbacks = Pick<
  OptionsSidebarProps,
  | 'onBackgroundClear'
  | 'onBackgroundFile'
  | 'onBackgroundRestore'
  | 'onBackgroundSnapshot'
  | 'onBackgroundUrl'
  | 'onBookmarkTreePreferencesUpdate'
  | 'onCustomCSSChange'
  | 'onGridSettingsUpdate'
  | 'onGroupPreferencesUpdate'
  | 'onIconSizeChange'
  | 'onLocaleChange'
  | 'onOverlaySceneUpdate'
  | 'onSettingsUpdate'
  | 'onSizeChange'
  | 'onThemePreset'
>;

type SettingsSaveDraft = SettingsSnapshot & {
  background: BackgroundDraft | null;
};

type SaveSettingsChangesOptions = {
  afterSave?: () => Promise<void>;
  callbacks: SettingsSaveCallbacks;
  draft: SettingsSaveDraft;
  preparedOverlayImageIds: readonly string[];
  snapshot: SettingsSnapshot;
};

export type SaveSettingsChangesResult = {
  mediaIdsToDelete: readonly string[];
  mediaIdsToFinalize: readonly string[];
};

function getOverlayImageIds(scene: SettingsSnapshot['overlayScene']): string[] {
  return getOverlayImageLayers(scene).map((layer) => layer.id);
}

function addChangedStep(
  steps: TransactionStep[],
  isChanged: boolean,
  name: string,
  apply: () => Promise<void>,
  rollback: () => Promise<void>,
): void {
  if (!isChanged) return;
  steps.push(createSelfRestoringTransactionStep(name, apply, rollback));
}

async function applyBackgroundDraft(
  callbacks: SettingsSaveCallbacks,
  background: BackgroundDraft,
): Promise<void> {
  switch (background.kind) {
    case 'clear':
      await callbacks.onBackgroundClear();
      break;
    case 'file':
      await callbacks.onBackgroundFile(background.file);
      break;
    case 'url':
      await callbacks.onBackgroundUrl(background.url);
      break;
  }
}

export async function saveSettingsChanges({
  afterSave,
  callbacks,
  draft,
  preparedOverlayImageIds,
  snapshot,
}: SaveSettingsChangesOptions): Promise<SaveSettingsChangesResult> {
  const steps: TransactionStep[] = [];
  const nextImageIds = new Set(getOverlayImageIds(draft.overlayScene));
  const mediaIdsToDelete = [
    ...getOverlayImageIds(snapshot.overlayScene),
    ...preparedOverlayImageIds,
  ].filter((id) => !nextImageIds.has(id));
  const mediaIdsToFinalize = preparedOverlayImageIds.filter((id) =>
    nextImageIds.has(id),
  );
  const previousBookmarkTreePreferences = createBookmarkTreePreferences(
    snapshot.rootPath,
    snapshot.siblingOrder,
    snapshot.rootId,
  );
  const nextBookmarkTreePreferences = createBookmarkTreePreferences(
    draft.rootPath,
    draft.siblingOrder,
    draft.rootId,
  );

  addChangedStep(
    steps,
    !isEqual(draft.gridSettings, snapshot.gridSettings),
    'Grid settings write',
    () => callbacks.onGridSettingsUpdate(draft.gridSettings),
    () => callbacks.onGridSettingsUpdate(snapshot.gridSettings),
  );
  addChangedStep(
    steps,
    !isEqual(draft.settings, snapshot.settings),
    'Settings write',
    () => callbacks.onSettingsUpdate(draft.settings),
    () => callbacks.onSettingsUpdate(snapshot.settings),
  );
  addChangedStep(
    steps,
    !isEqual(draft.theme, snapshot.theme),
    'Theme write',
    () => callbacks.onThemePreset(draft.theme),
    () => callbacks.onThemePreset(snapshot.theme),
  );
  addChangedStep(
    steps,
    draft.size !== snapshot.size,
    'Bookmark size write',
    () => callbacks.onSizeChange(draft.size),
    () => callbacks.onSizeChange(snapshot.size),
  );
  addChangedStep(
    steps,
    draft.iconSize !== snapshot.iconSize,
    'Bookmark icon size write',
    () => callbacks.onIconSizeChange(draft.iconSize),
    () => callbacks.onIconSizeChange(snapshot.iconSize),
  );
  addChangedStep(
    steps,
    draft.customCSS !== snapshot.customCSS,
    'Custom CSS write',
    () => callbacks.onCustomCSSChange(draft.customCSS),
    () => callbacks.onCustomCSSChange(snapshot.customCSS),
  );
  addChangedStep(
    steps,
    draft.locale !== snapshot.locale,
    'Locale write',
    () => callbacks.onLocaleChange(draft.locale),
    () => callbacks.onLocaleChange(snapshot.locale),
  );
  addChangedStep(
    steps,
    !isEqual(draft.groupPreferences, snapshot.groupPreferences),
    'Bookmark group preferences write',
    () => callbacks.onGroupPreferencesUpdate(draft.groupPreferences),
    () => callbacks.onGroupPreferencesUpdate(snapshot.groupPreferences),
  );
  addChangedStep(
    steps,
    !isEqual(nextBookmarkTreePreferences, previousBookmarkTreePreferences),
    'Bookmark tree preferences write',
    () =>
      callbacks.onBookmarkTreePreferencesUpdate(nextBookmarkTreePreferences),
    () =>
      callbacks.onBookmarkTreePreferencesUpdate(
        previousBookmarkTreePreferences,
      ),
  );
  addChangedStep(
    steps,
    !isEqual(draft.overlayScene, snapshot.overlayScene),
    'Decorative image scene write',
    () => callbacks.onOverlaySceneUpdate(draft.overlayScene),
    () => callbacks.onOverlaySceneUpdate(snapshot.overlayScene),
  );

  const background = draft.background;
  if (background) {
    const backgroundSnapshot = await callbacks.onBackgroundSnapshot();
    steps.push(
      createSelfRestoringTransactionStep(
        'Background write',
        () => applyBackgroundDraft(callbacks, background),
        () => callbacks.onBackgroundRestore(backgroundSnapshot),
      ),
    );
  }

  await runStorageTransaction({
    commit: afterSave ?? (() => Promise.resolve()),
    steps,
  });

  return { mediaIdsToDelete, mediaIdsToFinalize };
}
