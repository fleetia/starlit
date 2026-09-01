import { useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  FormField,
  Inline,
  Select,
  Stack,
  Text,
  TextField,
} from '@fleetia/lagrange';
import { lagrangeThemeClass } from '@fleetia/lagrange/theme';

import { useTranslation } from '../../i18n';
import type {
  BookmarkCopyPreview,
  ScenePresetV1,
  SceneReadiness,
} from '../../scenes';
import { SettingsSection } from './controls';
import * as styles from './ScenePanel.css';

export type SceneFolderOption = {
  id: string;
  label: string;
  path: string[];
};

export type SceneCreatePreview = {
  defaultDestinationParentId: string | null;
  preview: BookmarkCopyPreview;
};

export type CreateSceneFromSettingsInput = {
  destination: SceneFolderOption;
  name: string;
};

export type RelinkSceneFromSettingsInput = {
  assetFiles: Record<string, File>;
  folder?: SceneFolderOption;
};

type ScenePanelProps = {
  activeSceneId: string | null;
  error: Error | null;
  folderOptions: readonly SceneFolderOption[];
  isProcessing: boolean;
  onApply: (sceneId: string) => Promise<void>;
  onCreate: (input: CreateSceneFromSettingsInput) => Promise<void>;
  onDelete: (
    sceneId: string,
    options: { deleteBookmarkFolder: boolean },
  ) => Promise<void>;
  onGetReadiness: (sceneId: string) => Promise<SceneReadiness>;
  onPrepareCreate: () => Promise<SceneCreatePreview>;
  onRelink: (
    sceneId: string,
    input: RelinkSceneFromSettingsInput,
  ) => Promise<void>;
  onRestore: (sceneId: string) => Promise<void>;
  scenes: readonly ScenePresetV1[];
};

export function ScenePanel({
  activeSceneId,
  error,
  folderOptions,
  isProcessing,
  onApply,
  onCreate,
  onDelete,
  onGetReadiness,
  onPrepareCreate,
  onRelink,
  onRestore,
  scenes,
}: ScenePanelProps): ReactElement {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [createPreview, setCreatePreview] = useState<SceneCreatePreview | null>(
    null,
  );
  const [destinationId, setDestinationId] = useState('');
  const [deleteScene, setDeleteScene] = useState<ScenePresetV1 | null>(null);
  const [deleteFolder, setDeleteFolder] = useState(false);
  const [readinessById, setReadinessById] = useState<
    Record<string, SceneReadiness>
  >({});
  const [relinkFolderById, setRelinkFolderById] = useState<
    Record<string, string>
  >({});
  const [relinkAssetFilesByScene, setRelinkAssetFilesByScene] = useState<
    Record<string, Record<string, File>>
  >({});
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (scenes.length === 0) return undefined;
    let isActive = true;
    void Promise.all(
      scenes.map(
        async (scene) => [scene.id, await onGetReadiness(scene.id)] as const,
      ),
    ).then(
      (entries) => {
        if (isActive) setReadinessById(Object.fromEntries(entries));
      },
      () => {
        if (isActive) setActionError(t('scene.error'));
      },
    );
    return () => {
      isActive = false;
    };
  }, [onGetReadiness, scenes, t]);

  const selectedDestination = useMemo(
    () =>
      folderOptions.find((folder) => folder.id === destinationId) ??
      (createPreview
        ? (folderOptions.find(
            (folder) => folder.id === createPreview.defaultDestinationParentId,
          ) ?? folderOptions[0])
        : undefined) ??
      null,
    [createPreview, destinationId, folderOptions],
  );

  async function prepareCreate(): Promise<void> {
    if (!name.trim()) {
      setActionError(t('scene.nameRequired'));
      return;
    }
    setActionError(null);
    try {
      const prepared = await onPrepareCreate();
      const fallbackDestination =
        folderOptions.find(
          (folder) => folder.id === prepared.defaultDestinationParentId,
        ) ?? folderOptions[0];
      if (!fallbackDestination) {
        throw new Error('No writable bookmark destination is available.');
      }
      setDestinationId(fallbackDestination.id);
      setCreatePreview(prepared);
    } catch {
      setActionError(t('scene.error'));
    }
  }

  async function confirmCreate(): Promise<void> {
    if (!selectedDestination) return;
    setActionError(null);
    try {
      await onCreate({ destination: selectedDestination, name: name.trim() });
      setCreatePreview(null);
      setName('');
    } catch {
      setActionError(t('scene.error'));
    }
  }

  async function applyScene(sceneId: string): Promise<void> {
    setActionError(null);
    try {
      const readiness = await onGetReadiness(sceneId);
      setReadinessById((current) => ({ ...current, [sceneId]: readiness }));
      if (!readiness.isReady) return;
      await onApply(sceneId);
    } catch {
      setActionError(t('scene.error'));
    }
  }

  async function relinkScene(
    sceneId: string,
    input: RelinkSceneFromSettingsInput,
  ): Promise<void> {
    setActionError(null);
    try {
      await onRelink(sceneId, input);
      const readiness = await onGetReadiness(sceneId);
      setReadinessById((current) => ({ ...current, [sceneId]: readiness }));
      setRelinkFolderById((current) => ({ ...current, [sceneId]: '' }));
      setRelinkAssetFilesByScene((current) => ({
        ...current,
        [sceneId]: {},
      }));
    } catch {
      setActionError(t('scene.error'));
    }
  }

  async function restoreScene(sceneId: string): Promise<void> {
    setActionError(null);
    try {
      await onRestore(sceneId);
      const readiness = await onGetReadiness(sceneId);
      setReadinessById((current) => ({ ...current, [sceneId]: readiness }));
    } catch {
      setActionError(t('scene.error'));
    }
  }

  return (
    <Stack gap="lg">
      <SettingsSection
        description={t('scene.previewDescription')}
        title={activeSceneId ? t('scene.saveAsNew') : t('scene.create')}
      >
        <Stack gap="sm">
          <FormField label={t('scene.name')}>
            <TextField
              onChange={(event) => setName(event.currentTarget.value)}
              value={name}
            />
          </FormField>
          <Button disabled={isProcessing} onClick={() => void prepareCreate()}>
            {activeSceneId ? t('scene.saveAsNew') : t('scene.create')}
          </Button>
        </Stack>
      </SettingsSection>

      <SettingsSection title={t('sidebar.tab.scene')}>
        {scenes.length === 0 ? (
          <Text tone="muted">{t('scene.none')}</Text>
        ) : (
          <ul className={styles.sceneList}>
            {scenes.map((scene) => {
              const readiness = readinessById[scene.id];
              const relinkFolderId = relinkFolderById[scene.id] ?? '';
              const relinkFolder = folderOptions.find(
                (folder) => folder.id === relinkFolderId,
              );
              const folderIssue = readiness?.issues.find(
                (issue) => issue.kind === 'bookmark-folder',
              );
              const assetIssues =
                readiness?.issues.filter((issue) => issue.kind === 'asset') ??
                [];
              const assetFiles = relinkAssetFilesByScene[scene.id] ?? {};
              const canRelink = Boolean(
                readiness &&
                !readiness.isReady &&
                (!folderIssue || relinkFolder) &&
                assetIssues.every((issue) => assetFiles[issue.resourceId]),
              );
              return (
                <li key={scene.id} className={styles.sceneRow}>
                  <span className={styles.sceneIdentity}>
                    <Text truncate weight="strong">
                      {scene.name}
                    </Text>
                    {scene.id === activeSceneId ? (
                      <Text tone="muted" variant="caption">
                        {t('scene.active')}
                      </Text>
                    ) : null}
                  </span>
                  <Inline gap="xs" wrap>
                    <Button
                      disabled={isProcessing || scene.id === activeSceneId}
                      onClick={() => void applyScene(scene.id)}
                      size="compact"
                      variant="secondary"
                    >
                      {t('scene.switch')}
                    </Button>
                    <Button
                      disabled={isProcessing}
                      onClick={() => {
                        setDeleteFolder(false);
                        setDeleteScene(scene);
                      }}
                      size="compact"
                      variant="quiet"
                    >
                      {t('scene.delete')}
                    </Button>
                  </Inline>
                  {readiness && !readiness.isReady ? (
                    <div className={styles.recovery}>
                      <Text tone="critical" variant="caption">
                        {t('scene.missingResources')}
                      </Text>
                      {folderIssue ? (
                        <FormField label={t('scene.relinkFolder')}>
                          <Select
                            onChange={(event) => {
                              const folderId = event.currentTarget.value;
                              setRelinkFolderById((current) => ({
                                ...current,
                                [scene.id]: folderId,
                              }));
                            }}
                            value={relinkFolderId}
                          >
                            <option value="">—</option>
                            {folderOptions.map((folder) => (
                              <option key={folder.id} value={folder.id}>
                                {folder.label}
                              </option>
                            ))}
                          </Select>
                        </FormField>
                      ) : null}
                      {assetIssues.map((issue) => (
                        <FormField
                          key={issue.resourceId}
                          label={`${t('scene.relinkAsset')}: ${issue.resourceId}`}
                        >
                          <input
                            accept="image/*,video/*,.gif"
                            aria-label={`${t('scene.relinkAsset')}: ${issue.resourceId}`}
                            onChange={(event) => {
                              const file = event.currentTarget.files?.[0];
                              if (!file) return;
                              setRelinkAssetFilesByScene((current) => ({
                                ...current,
                                [scene.id]: {
                                  ...(current[scene.id] ?? {}),
                                  [issue.resourceId]: file,
                                },
                              }));
                            }}
                            type="file"
                          />
                        </FormField>
                      ))}
                      <Inline gap="sm" wrap>
                        <Button
                          disabled={!canRelink}
                          onClick={() => {
                            if (!canRelink) return;
                            void relinkScene(scene.id, {
                              assetFiles,
                              ...(relinkFolder ? { folder: relinkFolder } : {}),
                            });
                          }}
                          size="compact"
                          variant="secondary"
                        >
                          {t('scene.relink')}
                        </Button>
                        {readiness.canRestore ? (
                          <Button
                            onClick={() => void restoreScene(scene.id)}
                            size="compact"
                            variant="secondary"
                          >
                            {t('scene.restore')}
                          </Button>
                        ) : null}
                      </Inline>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SettingsSection>

      {error || actionError ? (
        <Text aria-live="polite" tone="critical">
          {actionError ?? t('scene.error')}
        </Text>
      ) : null}

      <Dialog
        className={lagrangeThemeClass}
        closeLabel={t('modal.close')}
        footer={
          <Inline gap="sm" justify="end">
            <Button onClick={() => setCreatePreview(null)} variant="quiet">
              {t('sidebar.cancel')}
            </Button>
            <Button
              disabled={!selectedDestination}
              isPending={isProcessing}
              onClick={() => void confirmCreate()}
            >
              {t('scene.confirmCreate')}
            </Button>
          </Inline>
        }
        isOpen={createPreview !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setCreatePreview(null);
        }}
        size="small"
        title={t('scene.previewTitle')}
      >
        {createPreview ? (
          <Stack gap="md">
            <Text>{t('scene.previewDescription')}</Text>
            <div className={styles.counts}>
              <span className={styles.count}>
                <Text variant="caption">{t('scene.folders')}</Text>
                <Text weight="strong">{createPreview.preview.folderCount}</Text>
              </span>
              <span className={styles.count}>
                <Text variant="caption">{t('scene.urls')}</Text>
                <Text weight="strong">{createPreview.preview.urlCount}</Text>
              </span>
            </div>
            <FormField label={t('scene.destination')}>
              <Select
                onChange={(event) =>
                  setDestinationId(event.currentTarget.value)
                }
                value={selectedDestination?.id ?? ''}
              >
                {folderOptions.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </Stack>
        ) : null}
      </Dialog>

      <Dialog
        className={lagrangeThemeClass}
        closeLabel={t('modal.close')}
        footer={
          <Inline gap="sm" justify="end">
            <Button onClick={() => setDeleteScene(null)} variant="quiet">
              {t('sidebar.confirm.no')}
            </Button>
            <Button
              isPending={isProcessing}
              onClick={() => {
                if (!deleteScene) return;
                void onDelete(deleteScene.id, {
                  deleteBookmarkFolder: deleteFolder,
                }).then(
                  () => setDeleteScene(null),
                  () => setActionError(t('scene.error')),
                );
              }}
              variant="critical"
            >
              {t('scene.delete')}
            </Button>
          </Inline>
        }
        isOpen={deleteScene !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeleteScene(null);
        }}
        size="small"
        title={t('scene.delete')}
      >
        <Stack gap="sm">
          <Text>{deleteScene?.name}</Text>
          {deleteScene?.bookmarkCollection.folderOwnership === 'scene' &&
          deleteScene.bookmarkCollection.folderId !== null ? (
            <Checkbox
              checked={deleteFolder}
              onChange={(event) => setDeleteFolder(event.currentTarget.checked)}
            >
              {t('scene.deleteFolder')}
            </Checkbox>
          ) : null}
          {!deleteFolder ? (
            <Text tone="muted" variant="caption">
              {t('scene.keepFolder')}
            </Text>
          ) : null}
          <Text tone="muted" variant="caption">
            {t('scene.deleteMediaNotice')}
          </Text>
        </Stack>
      </Dialog>
    </Stack>
  );
}
