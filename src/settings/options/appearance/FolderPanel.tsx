import type { ReactElement } from 'react';
import { Stack, Switch } from '@fleetia/lagrange';

import { useTranslation } from '../../../i18n';
import type { GridSettings } from '../../../layout/types';
import type { StarlitTheme } from '../../../theme/types';
import type { Settings } from '../../types';
import * as styles from '../../OptionsSidebar.css';
import { ColorControl, SettingsSection } from '../controls';
import { getFolderSettings } from '../helpers';
import type { FolderSettings, StateSetter } from '../types';

type FolderPanelProps = {
  gridSettings: GridSettings;
  setGridSettings: StateSetter<GridSettings>;
  setSettings: StateSetter<Settings>;
  settings: Settings;
  theme: StarlitTheme;
};

export function FolderPanel({
  gridSettings,
  setGridSettings,
  setSettings,
  settings,
  theme,
}: FolderPanelProps): ReactElement {
  const { t } = useTranslation();
  const folder = getFolderSettings(gridSettings, theme);

  function updateFolder(changes: Partial<FolderSettings>): void {
    setGridSettings((currentGrid) => ({
      ...currentGrid,
      folder: {
        ...getFolderSettings(currentGrid, theme),
        ...changes,
      },
    }));
  }

  return (
    <Stack gap="lg">
      <SettingsSection title={t('sidebar.appearance.folder')}>
        <Switch
          checked={settings.iconLayout === 'horizontal'}
          onChange={(event) => {
            const isChecked = event.currentTarget.checked;
            setSettings((currentSettings) => ({
              ...currentSettings,
              iconLayout: isChecked ? 'horizontal' : 'vertical',
            }));
          }}
        >
          {t('sidebar.folder.horizontalIcon')}
        </Switch>
        <div className={styles.fieldGrid}>
          <ColorControl
            label={t('sidebar.folder.background')}
            onValueChange={(value) => updateFolder({ color: value })}
            value={folder.color}
          />
          <ColorControl
            label={t('sidebar.folder.iconBackground')}
            onValueChange={(value) => updateFolder({ accent: value })}
            value={folder.accent}
          />
          <ColorControl
            label={t('sidebar.folder.iconColor')}
            onValueChange={(value) => updateFolder({ accentText: value })}
            value={folder.accentText}
          />
          <ColorControl
            label={t('sidebar.folder.text')}
            onValueChange={(value) => updateFolder({ text: value })}
            value={folder.text}
          />
          <ColorControl
            label={t('sidebar.folder.border')}
            onValueChange={(value) => updateFolder({ border: value })}
            value={folder.border}
          />
        </div>
      </SettingsSection>
    </Stack>
  );
}
