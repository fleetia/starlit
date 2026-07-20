import { getOverlayImageLayers } from '../../overlays/model';
import {
  createBookmarkTreePreferences,
  isEqual,
  rollbackSettingsSave,
} from './helpers';
import type {
  BackgroundDraft,
  OptionsSidebarProps,
  SettingsSnapshot,
} from './types';

type SettingsSaveCallbacks = Pick<
  OptionsSidebarProps,
  | 'onBackgroundClear'
  | 'onBackgroundFile'
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

function createSaveAndRollbackError(
  saveError: unknown,
  rollbackError: unknown,
): AggregateError {
  return new AggregateError(
    [saveError, rollbackError],
    'Settings save and rollback both failed',
    { cause: rollbackError },
  );
}

export async function saveSettingsChanges({
  callbacks,
  draft,
  preparedOverlayImageIds,
  snapshot,
}: SaveSettingsChangesOptions): Promise<SaveSettingsChangesResult> {
  const rollbackOperations: Array<() => Promise<void>> = [];
  const nextImageIds = new Set(getOverlayImageIds(draft.overlayScene));
  const mediaIdsToDelete = [
    ...getOverlayImageIds(snapshot.overlayScene),
    ...preparedOverlayImageIds,
  ].filter((id) => !nextImageIds.has(id));
  const mediaIdsToFinalize = preparedOverlayImageIds.filter((id) =>
    nextImageIds.has(id),
  );

  try {
    if (!isEqual(draft.gridSettings, snapshot.gridSettings)) {
      rollbackOperations.push(() =>
        callbacks.onGridSettingsUpdate(snapshot.gridSettings),
      );
      await callbacks.onGridSettingsUpdate(draft.gridSettings);
    }

    if (!isEqual(draft.settings, snapshot.settings)) {
      rollbackOperations.push(() =>
        callbacks.onSettingsUpdate(snapshot.settings),
      );
      await callbacks.onSettingsUpdate(draft.settings);
    }

    if (!isEqual(draft.theme, snapshot.theme)) {
      rollbackOperations.push(() => callbacks.onThemePreset(snapshot.theme));
      await callbacks.onThemePreset(draft.theme);
    }

    if (draft.size !== snapshot.size) {
      rollbackOperations.push(() => callbacks.onSizeChange(snapshot.size));
      await callbacks.onSizeChange(draft.size);
    }

    if (draft.iconSize !== snapshot.iconSize) {
      rollbackOperations.push(() =>
        callbacks.onIconSizeChange(snapshot.iconSize),
      );
      await callbacks.onIconSizeChange(draft.iconSize);
    }

    if (draft.customCSS !== snapshot.customCSS) {
      rollbackOperations.push(() =>
        callbacks.onCustomCSSChange(snapshot.customCSS),
      );
      await callbacks.onCustomCSSChange(draft.customCSS);
    }

    if (draft.locale !== snapshot.locale) {
      rollbackOperations.push(() => callbacks.onLocaleChange(snapshot.locale));
      await callbacks.onLocaleChange(draft.locale);
    }

    if (!isEqual(draft.groupPreferences, snapshot.groupPreferences)) {
      rollbackOperations.push(() =>
        callbacks.onGroupPreferencesUpdate(snapshot.groupPreferences),
      );
      await callbacks.onGroupPreferencesUpdate(draft.groupPreferences);
    }

    if (
      draft.rootId !== snapshot.rootId ||
      !isEqual(draft.rootPath, snapshot.rootPath) ||
      !isEqual(draft.siblingOrder, snapshot.siblingOrder)
    ) {
      rollbackOperations.push(() =>
        callbacks.onBookmarkTreePreferencesUpdate(
          createBookmarkTreePreferences(
            snapshot.rootPath,
            snapshot.siblingOrder,
            snapshot.rootId,
          ),
        ),
      );
      await callbacks.onBookmarkTreePreferencesUpdate(
        createBookmarkTreePreferences(
          draft.rootPath,
          draft.siblingOrder,
          draft.rootId,
        ),
      );
    }

    if (!isEqual(draft.overlayScene, snapshot.overlayScene)) {
      await callbacks.onOverlaySceneUpdate(draft.overlayScene);
      rollbackOperations.push(() =>
        callbacks.onOverlaySceneUpdate(snapshot.overlayScene),
      );
    }

    if (draft.background) {
      switch (draft.background.kind) {
        case 'clear':
          await callbacks.onBackgroundClear();
          break;
        case 'file':
          await callbacks.onBackgroundFile(draft.background.file);
          break;
        case 'url':
          await callbacks.onBackgroundUrl(draft.background.url);
          break;
      }
    }
  } catch (error) {
    try {
      await rollbackSettingsSave(rollbackOperations);
    } catch (rollbackError) {
      throw createSaveAndRollbackError(error, rollbackError);
    }

    throw error;
  }

  return { mediaIdsToDelete, mediaIdsToFinalize };
}
