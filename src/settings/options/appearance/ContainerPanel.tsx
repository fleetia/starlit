import type { ReactElement } from 'react';
import { Stack, Switch } from '@fleetia/lagrange';

import { useTranslation } from '../../../i18n';
import { DEFAULT_GRID_SETTINGS } from '../../../layout/defaults';
import type { GridSettings } from '../../../layout/types';
import type { StarlitTheme } from '../../../theme/types';
import * as styles from '../../OptionsSidebar.css';
import { ColorControl, RangeControl, SettingsSection } from '../controls';
import { getHeadingSettings } from '../helpers';
import type { HeadingSettings, StateSetter, ThemeUpdater } from '../types';

type ContainerPanelProps = {
  gridSettings: GridSettings;
  onThemeChange: ThemeUpdater;
  setGridSettings: StateSetter<GridSettings>;
  theme: StarlitTheme;
};

export function ContainerPanel({
  gridSettings,
  onThemeChange,
  setGridSettings,
  theme,
}: ContainerPanelProps): ReactElement {
  const { t } = useTranslation();
  const heading = getHeadingSettings(gridSettings, theme);

  function updateHeading(changes: Partial<HeadingSettings>): void {
    setGridSettings((currentGrid) => ({
      ...currentGrid,
      heading: {
        ...getHeadingSettings(currentGrid, theme),
        ...changes,
      },
    }));
  }

  return (
    <Stack gap="lg">
      <SettingsSection title={t('sidebar.tokens.chromeTitle')}>
        <div className={styles.fieldGrid}>
          <ColorControl
            label={t('sidebar.tokens.accent')}
            onValueChange={(value) => onThemeChange('accent', value)}
            value={theme.accent}
          />
          <ColorControl
            label={t('sidebar.tokens.accentText')}
            onValueChange={(value) => onThemeChange('accentText', value)}
            value={theme.accentText}
          />
          <ColorControl
            label={t('sidebar.tokens.border')}
            onValueChange={(value) => onThemeChange('border', value)}
            value={theme.border}
          />
        </div>
      </SettingsSection>
      <SettingsSection title={t('sidebar.container.title')}>
        <div className={styles.fieldGrid}>
          <ColorControl
            label={`${t('sidebar.container.title')} ${t('sidebar.container.text')}`}
            onValueChange={(value) => updateHeading({ titleColor: value })}
            value={heading.titleColor}
          />
          <ColorControl
            label={t('sidebar.container.titleBackground')}
            onValueChange={(value) =>
              updateHeading({ titleBackgroundColor: value })
            }
            value={
              heading.titleBackgroundColor ??
              DEFAULT_GRID_SETTINGS.heading?.titleBackgroundColor ??
              'transparent'
            }
          />
          <RangeControl
            label={t('sidebar.container.size')}
            max={30}
            min={8}
            onValueChange={(value) => updateHeading({ titleSize: value })}
            suffix="px"
            value={heading.titleSize ?? 14}
          />
        </div>
        <Switch
          checked={heading.borderEnabled}
          onChange={(event) =>
            updateHeading({ borderEnabled: event.currentTarget.checked })
          }
        >
          {t('sidebar.container.border')}
        </Switch>
        {heading.borderEnabled ? (
          <div className={styles.fieldGrid}>
            <ColorControl
              label={t('sidebar.container.borderColor')}
              onValueChange={(value) => updateHeading({ borderColor: value })}
              value={heading.borderColor}
            />
            <RangeControl
              label={t('sidebar.container.borderWidth')}
              max={5}
              min={1}
              onValueChange={(value) => updateHeading({ borderWidth: value })}
              suffix="px"
              value={heading.borderWidth}
            />
          </div>
        ) : null}
      </SettingsSection>
      <SettingsSection title={t('sidebar.container.subtitle')}>
        <div className={styles.fieldGrid}>
          <ColorControl
            label={`${t('sidebar.container.subtitle')} ${t('sidebar.container.text')}`}
            onValueChange={(value) => updateHeading({ subtitleColor: value })}
            value={heading.subtitleColor}
          />
          <RangeControl
            label={t('sidebar.container.size')}
            max={24}
            min={8}
            onValueChange={(value) => updateHeading({ subtitleSize: value })}
            suffix="px"
            value={heading.subtitleSize ?? 12}
          />
          <ColorControl
            label={t('sidebar.container.hover')}
            onValueChange={(value) =>
              updateHeading({ subtitleHoverColor: value })
            }
            value={heading.subtitleHoverColor}
          />
          <RangeControl
            label={t('sidebar.container.borderRadius')}
            max={30}
            min={0}
            onValueChange={(value) => updateHeading({ borderRadius: value })}
            suffix="px"
            value={heading.borderRadius ?? 0}
          />
        </div>
      </SettingsSection>
    </Stack>
  );
}
