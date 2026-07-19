import type { ChangeEvent, ReactElement, RefObject } from 'react';
import {
  Button,
  Choice,
  ChoiceGroup,
  FormField,
  Inline,
  Select,
  Stack,
  Switch,
} from '@fleetia/lagrange';

import type { Locale } from '../../i18n';
import { useTranslation } from '../../i18n';
import { isFontFamily } from '../normalizeSettings';
import type { Settings } from '../types';
import * as styles from '../OptionsSidebar.css';
import { SettingsSection } from './controls';
import { isLocale } from './helpers';
import type { StateSetter } from './types';

type GeneralPanelProps = {
  locale: Locale;
  onExport: () => Promise<void>;
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onResetAll: () => Promise<void>;
  onResetTheme: () => Promise<void>;
  setLocale: StateSetter<Locale>;
  setSettings: StateSetter<Settings>;
  settings: Settings;
  settingsFileRef: RefObject<HTMLInputElement | null>;
};

export function GeneralPanel({
  locale,
  onExport,
  onImportFile,
  onResetAll,
  onResetTheme,
  setLocale,
  setSettings,
  settings,
  settingsFileRef,
}: GeneralPanelProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap="lg">
      <SettingsSection title={t('sidebar.general.language')}>
        <ChoiceGroup
          label={t('sidebar.general.language')}
          onValueChange={(value) => {
            if (isLocale(value)) {
              setLocale(value);
            }
          }}
          value={locale}
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
                setSettings((currentSettings) => ({
                  ...currentSettings,
                  fontFamily,
                }));
              }
            }}
            value={settings.fontFamily}
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
          checked={settings.isOpenInNewTab}
          onChange={(event) => {
            const isChecked = event.currentTarget.checked;
            setSettings((currentSettings) => ({
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
          <Button onClick={() => void onExport()} variant="secondary">
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
            onChange={(event) => void onImportFile(event)}
            type="file"
          />
        </Inline>
      </SettingsSection>
      <SettingsSection title={t('sidebar.general.reset')}>
        <Inline gap="sm">
          <Button onClick={() => void onResetTheme()} variant="critical">
            {t('sidebar.general.resetTheme')}
          </Button>
          <Button onClick={() => void onResetAll()} variant="critical">
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
