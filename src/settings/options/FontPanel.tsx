import type { ReactElement } from 'react';
import { FormField, Select } from '@fleetia/lagrange';

import { useTranslation } from '../../i18n';
import { isFontFamily } from '../normalizeSettings';
import type { Settings } from '../types';
import { SettingsSection } from './controls';
import type { StateSetter } from './types';

type FontPanelProps = {
  setSettings: StateSetter<Settings>;
  settings: Settings;
};

export function FontPanel({
  setSettings,
  settings,
}: FontPanelProps): ReactElement {
  const { t } = useTranslation();

  return (
    <SettingsSection
      description={t('sidebar.general.fontDescription')}
      title={t('sidebar.general.fontFamily')}
    >
      <FormField label={t('sidebar.general.fontFamily')}>
        <Select
          onChange={(event) => {
            const fontFamily = event.currentTarget.value;
            if (isFontFamily(fontFamily)) {
              setSettings((current) => ({ ...current, fontFamily }));
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
  );
}
