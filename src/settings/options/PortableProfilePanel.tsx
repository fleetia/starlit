import {
  type ChangeEvent,
  type ReactElement,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Button,
  Checkbox,
  Choice,
  ChoiceGroup,
  Dialog,
  Inline,
  Stack,
  Text,
} from '@fleetia/lagrange';
import { lagrangeThemeClass } from '@fleetia/lagrange/theme';

import { useTranslation } from '../../i18n';
import {
  getPortableProfileCounts,
  getPortableProfilePrivacyWarning,
  type PortableProfileCategories,
  type PortableProfileCounts,
  type PortableProfileV4,
  type SceneConflictChoice,
  type SceneImportDiff,
} from '../portableProfile';
import {
  createPortableProfile,
  DEFAULT_PORTABLE_EXPORT_CATEGORIES,
  importPortableProfile,
  previewPortableProfileImport,
  type PortableExportOptions,
  type PortableImportOptions,
  type PortableImportPreview,
} from '../portableProfileService';
import { SettingsSection } from './controls';
import * as styles from './PortableProfilePanel.css';

export type PortableProfilePanelActions = {
  applyImport: (
    value: unknown,
    options: PortableImportOptions,
  ) => Promise<void>;
  createExport: (options: PortableExportOptions) => Promise<PortableProfileV4>;
  previewImport: (value: unknown) => Promise<PortableImportPreview>;
};

type PortableProfilePanelProps = {
  actions?: PortableProfilePanelActions;
  destinationParentId?: string;
  download?: (profile: PortableProfileV4) => void;
  onImported?: () => Promise<void> | void;
};

const DEFAULT_ACTIONS: PortableProfilePanelActions = {
  applyImport: importPortableProfile,
  createExport: createPortableProfile,
  previewImport: previewPortableProfileImport,
};

type ImportChoiceState = Partial<Record<string, SceneConflictChoice>>;

function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (): void => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Portable profile could not be read.'));
        return;
      }

      try {
        resolve(JSON.parse(reader.result) as unknown);
      } catch {
        reject(new Error('Portable profile JSON is invalid.'));
      }
    };
    reader.onerror = (): void =>
      reject(new Error('Portable profile could not be read.'));
    reader.readAsText(file);
  });
}

function downloadPortableProfile(profile: PortableProfileV4): void {
  const blob = new Blob([JSON.stringify(profile, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const exportDate = profile.exportedAt.slice(0, 10);

  anchor.download = `starlit-profile-${exportDate}.json`;
  anchor.href = url;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isSceneConflictChoice(value: string): value is SceneConflictChoice {
  return value === 'add-copy' || value === 'replace' || value === 'skip';
}

function getConflictDiffs(
  diffs: readonly SceneImportDiff[],
): SceneImportDiff[] {
  return diffs.filter((diff) => diff.existingScene !== null);
}

function resolveConflictChoices(
  diffs: readonly SceneImportDiff[],
  choices: ImportChoiceState,
): Record<string, SceneConflictChoice> | null {
  const resolved: Record<string, SceneConflictChoice> = {};

  for (const diff of getConflictDiffs(diffs)) {
    const choice = choices[diff.incomingScene.id];
    if (!choice) return null;
    resolved[diff.incomingScene.id] = choice;
  }

  return resolved;
}

type CountSummaryProps = {
  counts: PortableProfileCounts;
  profile: PortableProfileV4;
};

function CountSummary({ counts, profile }: CountSummaryProps): ReactElement {
  const { locale, t } = useTranslation();
  const format = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const items = [
    [t('portable.scenes'), counts.scenes],
    [
      t('scene.previewCounts'),
      `${format.format(counts.bookmarkFolders)} / ${format.format(counts.bookmarkUrls)}`,
    ],
    [t('portable.media'), counts.assets],
    [t('sidebar.tab.widgets'), counts.widgets],
    [
      t('sidebar.general.language'),
      profile.globalPreferences.locale.toUpperCase(),
    ],
    [
      t('sidebar.general.openInNewTab'),
      t(
        profile.globalPreferences.isOpenInNewTab
          ? 'sidebar.confirm.yes'
          : 'sidebar.confirm.no',
      ),
    ],
  ] as const;

  return (
    <dl className={styles.countList}>
      {items.map(([label, value]) => (
        <div className={styles.countItem} key={label}>
          <dt className={styles.countLabel}>{label}</dt>
          <dd className={styles.countValue}>
            {typeof value === 'number' ? format.format(value) : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SceneDiffCard({
  choice,
  diff,
  onChoiceChange,
}: {
  choice: SceneConflictChoice | undefined;
  diff: SceneImportDiff;
  onChoiceChange: (choice: SceneConflictChoice) => void;
}): ReactElement {
  const { locale, t } = useTranslation();
  const format = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const changedSectionLabels = {
    appearance: t('sidebar.tab.appearance'),
    bookmarks: t('sidebar.tab.groups'),
    canvas: t('sidebar.tab.widgets'),
    identity: t('sidebar.tab.scene'),
  } as const;

  return (
    <li className={styles.sceneCard}>
      <Text className={styles.sceneTitle} variant="label" weight="strong">
        {diff.incomingScene.name}
      </Text>
      <Text as="p" tone="muted" variant="caption">
        {t('scene.previewCounts')}: {format.format(diff.bookmarkFolderCount)} /{' '}
        {format.format(diff.bookmarkUrlCount)} · {t('portable.media')}:{' '}
        {format.format(diff.assetCount)}
      </Text>
      <ul className={styles.sceneMeta}>
        <li>
          <Text tone="muted" variant="caption">
            {t('portable.changedSections')}
          </Text>
        </li>
        {diff.changedSections.map((section) => (
          <li className={styles.sceneMetaItem} key={section}>
            {changedSectionLabels[section]}
          </li>
        ))}
      </ul>
      {diff.existingScene ? (
        <ChoiceGroup
          label={`${diff.incomingScene.name} · ${t('portable.preview')}`}
          onValueChange={(value) => {
            if (isSceneConflictChoice(value)) onChoiceChange(value);
          }}
          orientation="vertical"
          value={choice ?? ''}
        >
          <Choice value="add-copy">{t('portable.addCopy')}</Choice>
          <Choice value="replace">{t('portable.replace')}</Choice>
          <Choice value="skip">{t('portable.skip')}</Choice>
        </ChoiceGroup>
      ) : null}
    </li>
  );
}

export function PortableProfilePanel({
  actions = DEFAULT_ACTIONS,
  destinationParentId,
  download = downloadPortableProfile,
  onImported,
}: PortableProfilePanelProps): ReactElement {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<PortableProfileCategories>({
    ...DEFAULT_PORTABLE_EXPORT_CATEGORIES,
  });
  const [preview, setPreview] = useState<PortableImportPreview | null>(null);
  const [choices, setChoices] = useState<ImportChoiceState>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const privacyWarning = getPortableProfilePrivacyWarning(categories);
  const resolvedChoices = preview
    ? resolveConflictChoices(preview.diffs, choices)
    : null;

  function handleSceneCategoryChange(isChecked: boolean): void {
    setCategories((current) =>
      isChecked
        ? { ...current, scenes: true }
        : { bookmarkUrls: false, media: false, scenes: false },
    );
  }

  function handleDependentCategoryChange(
    category: 'bookmarkUrls' | 'media',
    isChecked: boolean,
  ): void {
    setCategories((current) => ({
      ...current,
      [category]: isChecked,
    }));
  }

  async function handleExport(): Promise<void> {
    setError(null);
    setIsExporting(true);
    try {
      download(await actions.createExport(categories));
    } catch {
      setError(t('portable.error'));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImportFile(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    setError(null);
    setIsPreviewing(true);
    try {
      const nextPreview = await actions.previewImport(await readJsonFile(file));
      setChoices({});
      setPreview(nextPreview);
    } catch {
      setError(t('portable.error'));
    } finally {
      setIsPreviewing(false);
    }
  }

  function closePreview(): void {
    if (isImporting) return;
    setPreview(null);
    setChoices({});
    setError(null);
  }

  async function handleImport(): Promise<void> {
    if (!preview || !resolvedChoices) return;

    setError(null);
    setIsImporting(true);
    try {
      await actions.applyImport(preview.profile, {
        conflictChoices: resolvedChoices,
        ...(destinationParentId ? { destinationParentId } : {}),
      });
      setPreview(null);
      setChoices({});
      await onImported?.();
    } catch {
      setError(t('portable.error'));
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <>
      <SettingsSection title={t('portable.title')}>
        <Stack gap="md">
          <Stack gap="sm">
            <Checkbox
              checked={categories.scenes}
              disabled={isExporting}
              onChange={(event) =>
                handleSceneCategoryChange(event.currentTarget.checked)
              }
            >
              {t('portable.scenes')}
            </Checkbox>
            <Text as="p" tone="muted" variant="caption">
              {t('portable.sceneScopeNote')}
            </Text>
            <Checkbox
              checked={categories.bookmarkUrls}
              disabled={!categories.scenes || isExporting}
              onChange={(event) =>
                handleDependentCategoryChange(
                  'bookmarkUrls',
                  event.currentTarget.checked,
                )
              }
            >
              {t('portable.bookmarks')}
            </Checkbox>
            <Checkbox
              checked={categories.media}
              disabled={!categories.scenes || isExporting}
              onChange={(event) =>
                handleDependentCategoryChange(
                  'media',
                  event.currentTarget.checked,
                )
              }
            >
              {t('portable.media')}
            </Checkbox>
            <Text as="p" tone="muted" variant="caption">
              {t('portable.globalScopeNote')}
            </Text>
          </Stack>
          {privacyWarning ? (
            <Text
              as="p"
              className={styles.warning}
              role="status"
              tone="muted"
              variant="caption"
            >
              {t('portable.sensitiveWarning')}
            </Text>
          ) : null}
          <Inline gap="sm" wrap>
            <Button
              isPending={isExporting}
              onClick={() => void handleExport()}
              variant="secondary"
            >
              {t('sidebar.general.export')}
            </Button>
            <Button
              disabled={isPreviewing || isExporting}
              isPending={isPreviewing}
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
            >
              {t('sidebar.general.import')}
            </Button>
            <input
              ref={fileInputRef}
              accept=".json,application/json"
              className={styles.hiddenInput}
              onChange={(event) => void handleImportFile(event)}
              type="file"
            />
          </Inline>
          {error && !preview ? (
            <Text
              aria-live="polite"
              as="p"
              className={styles.status}
              role="status"
              tone="critical"
              variant="caption"
            >
              {error}
            </Text>
          ) : null}
        </Stack>
      </SettingsSection>

      <Dialog
        className={lagrangeThemeClass}
        closeLabel={t('modal.close')}
        footer={
          <Inline gap="sm" justify="end">
            <Button
              disabled={isImporting}
              onClick={closePreview}
              variant="secondary"
            >
              {t('confirmDialog.cancel')}
            </Button>
            <Button
              disabled={!resolvedChoices}
              isPending={isImporting}
              onClick={() => void handleImport()}
            >
              {t('sidebar.general.import')}
            </Button>
          </Inline>
        }
        isOpen={preview !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) closePreview();
        }}
        size="medium"
        title={t('portable.preview')}
      >
        {preview ? (
          <Stack gap="md">
            <CountSummary
              counts={getPortableProfileCounts(preview.profile)}
              profile={preview.profile}
            />
            {getConflictDiffs(preview.diffs).length > 0 ? (
              <Text as="p" tone="muted" variant="caption">
                {t('portable.skipAllNote')}
              </Text>
            ) : null}
            {error ? (
              <Text
                aria-live="polite"
                as="p"
                className={styles.status}
                role="status"
                tone="critical"
                variant="caption"
              >
                {error}
              </Text>
            ) : null}
            <ul className={styles.sceneList}>
              {preview.diffs.map((diff) => (
                <SceneDiffCard
                  key={diff.incomingScene.id}
                  choice={choices[diff.incomingScene.id]}
                  diff={diff}
                  onChoiceChange={(choice) =>
                    setChoices((current) => ({
                      ...current,
                      [diff.incomingScene.id]: choice,
                    }))
                  }
                />
              ))}
            </ul>
          </Stack>
        ) : null}
      </Dialog>
    </>
  );
}
