import { useId, useRef, useState, type ReactElement } from 'react';
import {
  Button,
  Choice,
  ChoiceGroup,
  Dialog,
  Inline,
  Stack,
  Switch,
  Text,
} from '@fleetia/lagrange';
import { lagrangeThemeClass } from '@fleetia/lagrange/theme';

import { version } from '../../../manifest.json';
import type { Locale } from '../../i18n';
import { createLicensesHref } from '../../licenses/licensesRoute';
import { useTranslation } from '../../i18n';
import type { Settings } from '../types';
import * as styles from '../OptionsSidebar.css';
import { SettingsSection } from './controls';
import { FontPanel } from './FontPanel';
import { isLocale } from './helpers';
import type { StateSetter } from './types';

type GeneralPanelProps = {
  guideHref: string;
  locale: Locale;
  onResetAll: () => Promise<void>;
  onResetTheme: () => Promise<void>;
  setLocale: StateSetter<Locale>;
  setSettings: StateSetter<Settings>;
  settings: Settings;
};

export function GeneralPanel({
  guideHref,
  locale,
  onResetAll,
  onResetTheme,
  setLocale,
  setSettings,
  settings,
}: GeneralPanelProps): ReactElement {
  const { t } = useTranslation();
  const resetDescriptionId = useId();
  const resetCancelRef = useRef<HTMLButtonElement>(null);
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function confirmResetAll(): Promise<void> {
    setIsResetting(true);
    try {
      const didReset = await onResetAll().then(
        () => true,
        () => false,
      );
      if (didReset) setIsResetConfirmationOpen(false);
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <>
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
        <FontPanel setSettings={setSettings} settings={settings} />
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
        <SettingsSection
          description={t('sidebar.general.guideDescription')}
          title={t('sidebar.general.guide')}
        >
          <a
            className={styles.link}
            href={guideHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t('sidebar.general.openGuide')}
          </a>
        </SettingsSection>
        <SettingsSection title={t('sidebar.general.reset')}>
          <Inline gap="sm">
            <Button onClick={() => void onResetTheme()} variant="critical">
              {t('sidebar.general.resetTheme')}
            </Button>
            <Button
              onClick={() => setIsResetConfirmationOpen(true)}
              variant="critical"
            >
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
        <SettingsSection title={t('sidebar.general.about')}>
          <Stack gap="sm">
            <Text as="p" tone="muted" variant="caption">
              Starlit {version}
            </Text>
            <a
              className={styles.link}
              href={createLicensesHref(locale)}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t('sidebar.general.licenses')}
            </a>
          </Stack>
        </SettingsSection>
      </Stack>
      <Dialog
        aria-describedby={resetDescriptionId}
        className={lagrangeThemeClass}
        footer={
          <Inline gap="sm" justify="end">
            <Button
              disabled={isResetting}
              ref={resetCancelRef}
              onClick={() => setIsResetConfirmationOpen(false)}
              variant="secondary"
            >
              {t('confirmDialog.cancel')}
            </Button>
            <Button
              isPending={isResetting}
              onClick={() => void confirmResetAll()}
              variant="critical"
            >
              {t('sidebar.general.resetAllConfirmAction')}
            </Button>
          </Inline>
        }
        initialFocusRef={resetCancelRef}
        isOpen={isResetConfirmationOpen}
        onOpenChange={(nextIsOpen) => {
          if (!isResetting) setIsResetConfirmationOpen(nextIsOpen);
        }}
        role="alertdialog"
        size="small"
        title={t('sidebar.general.resetAllConfirmTitle')}
      >
        <Text id={resetDescriptionId}>
          {t('sidebar.general.resetAllConfirmDescription')}
        </Text>
      </Dialog>
    </>
  );
}
