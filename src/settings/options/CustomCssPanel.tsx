import type { ReactElement } from 'react';
import { FormField, TextArea } from '@fleetia/lagrange';

import { useTranslation } from '../../i18n';
import { SettingsSection } from './controls';

type CustomCssPanelProps = {
  css: string;
  onChange: (css: string) => void;
};

export function CustomCssPanel({
  css,
  onChange,
}: CustomCssPanelProps): ReactElement {
  const { t } = useTranslation();

  return (
    <SettingsSection title={t('sidebar.css.title')}>
      <FormField
        description={t('sidebar.css.help')}
        label={t('sidebar.css.title')}
      >
        <TextArea
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={t('sidebar.css.placeholder')}
          resize="vertical"
          rows={14}
          spellCheck={false}
          value={css}
        />
      </FormField>
    </SettingsSection>
  );
}
