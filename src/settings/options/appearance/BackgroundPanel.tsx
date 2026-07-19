import type { ChangeEvent, ReactElement, RefObject } from 'react';
import {
  Button,
  Choice,
  ChoiceGroup,
  FormField,
  Inline,
  Section,
  SectionHeader,
  Stack,
  Text,
  TextField,
} from '@fleetia/lagrange';

import { useTranslation } from '../../../i18n';
import type { GridSettings } from '../../../layout/types';
import type { StarlitTheme } from '../../../theme/types';
import type { BackgroundMedia } from '../../backgroundMedia';
import * as styles from '../../OptionsSidebar.css';
import { ColorControl, SettingsSection } from '../controls';
import type { BackgroundDraft, StateSetter, ThemeUpdater } from '../types';

type BackgroundPanelProps = {
  backgroundFileRef: RefObject<HTMLInputElement | null>;
  backgroundMeta: BackgroundMedia | null | undefined;
  backgroundSource: BackgroundMedia['source'];
  backgroundUrl: string;
  draftBackground: BackgroundDraft | null;
  gridSettings: GridSettings;
  isBackgroundProcessing: boolean;
  isSaving: boolean;
  onBackgroundClear: () => void;
  onBackgroundFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBackgroundSourceChange: (value: string) => void;
  onBackgroundUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onThemeChange: ThemeUpdater;
  setGridSettings: StateSetter<GridSettings>;
  theme: StarlitTheme;
};

export function BackgroundPanel({
  backgroundFileRef,
  backgroundMeta,
  backgroundSource,
  backgroundUrl,
  draftBackground,
  gridSettings,
  isBackgroundProcessing,
  isSaving,
  onBackgroundClear,
  onBackgroundFileChange,
  onBackgroundSourceChange,
  onBackgroundUrlChange,
  onThemeChange,
  setGridSettings,
  theme,
}: BackgroundPanelProps): ReactElement {
  const { t } = useTranslation();
  const hasBackground =
    (backgroundMeta !== null && backgroundMeta !== undefined) ||
    draftBackground !== null;

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

  const backgroundStatus = getBackgroundStatus();

  return (
    <Stack gap="lg">
      <SettingsSection title={t('sidebar.background.image')}>
        <Stack gap="md">
          <ChoiceGroup
            description={t('sidebar.background.sourceDescription')}
            label={t('sidebar.background.source')}
            onValueChange={onBackgroundSourceChange}
            value={backgroundSource}
          >
            <Choice disabled={isBackgroundProcessing || isSaving} value="url">
              {t('sidebar.background.sourceUrl')}
            </Choice>
            <Choice disabled={isBackgroundProcessing || isSaving} value="file">
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
                  onChange={onBackgroundUrlChange}
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
            onChange={onBackgroundFileChange}
            type="file"
          />
          {hasBackground ? (
            <Inline align="center" gap="sm" justify="between" wrap>
              {backgroundStatus ? (
                <Text
                  className={styles.backgroundStatus}
                  tone="muted"
                  variant="caption"
                >
                  {backgroundStatus}
                </Text>
              ) : null}
              <Button
                disabled={
                  isBackgroundProcessing ||
                  isSaving ||
                  draftBackground?.kind === 'clear'
                }
                onClick={onBackgroundClear}
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
            onValueChange={(value) => onThemeChange('surface', value)}
            value={theme.surface}
          />
          <ColorControl
            label={t('sidebar.tokens.muted')}
            onValueChange={(value) => onThemeChange('muted', value)}
            value={theme.muted}
          />
          <ColorControl
            label={t('sidebar.background.color')}
            onValueChange={(value) =>
              setGridSettings((currentGrid) => ({
                ...currentGrid,
                background: { ...currentGrid.background, color: value },
              }))
            }
            value={gridSettings.background.color}
          />
        </div>
      </SettingsSection>
    </Stack>
  );
}
