import type { ReactElement } from 'react';
import { Stack, Text } from '@fleetia/lagrange';

import { useTranslation } from '../../i18n';
import * as styles from '../OptionsSidebar.css';

export function SupportPanel(): ReactElement {
  const { t } = useTranslation();

  return (
    <aside
      aria-label={t('sidebar.support.title')}
      className={styles.support}
      data-starlit-part="settings-support"
    >
      <Stack gap="xxs">
        <Text as="p" variant="label" weight="strong">
          {t('sidebar.support.title')}
        </Text>
        <Text as="p" tone="muted" variant="caption">
          {t('sidebar.support.description')}
        </Text>
      </Stack>
      <div className={styles.supportActions}>
        <a
          className={styles.supportLink}
          href="https://fairy.hada.io/@starlit#support"
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('sidebar.support.fairy')}
        </a>
        <a
          className={`${styles.supportLink} ${styles.supportLinkSecondary}`}
          href="https://buymeacoffee.com/starlight.space"
          rel="noopener noreferrer"
          target="_blank"
        >
          Buy Me a Coffee
        </a>
      </div>
    </aside>
  );
}
