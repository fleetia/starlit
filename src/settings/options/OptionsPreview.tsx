import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { useTranslation } from '../../i18n';
import * as styles from '../OptionsSidebar.css';
import { SettingsSection } from './controls';
import type { OptionsPreviewState } from './types';

type OptionsPreviewProps = {
  label: ReactNode;
  preview?: ReactNode | ((draft: OptionsPreviewState) => ReactNode);
  state: OptionsPreviewState;
  style: CSSProperties;
};

export function OptionsPreview({
  label,
  preview,
  state,
  style,
}: OptionsPreviewProps): ReactElement | null {
  const { t } = useTranslation();

  if (preview === null || preview === undefined) {
    return null;
  }

  const previewContent =
    typeof preview === 'function' ? preview(state) : preview;

  if (
    previewContent === null ||
    previewContent === undefined ||
    previewContent === false
  ) {
    return null;
  }

  return (
    <SettingsSection description={t('sidebar.preview.note')} title={label}>
      <div
        className={styles.preview}
        data-starlit-part="settings-preview"
        style={style}
      >
        {previewContent}
      </div>
    </SettingsSection>
  );
}
