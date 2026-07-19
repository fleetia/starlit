import type { ReactElement } from 'react';
import { Stack, Switch } from '@fleetia/lagrange';

import { useTranslation } from '../../../i18n';
import type { GridSettings } from '../../../layout/types';
import type { StarlitTheme } from '../../../theme/types';
import type { Settings } from '../../types';
import * as styles from '../../OptionsSidebar.css';
import { ColorControl, RangeControl, SettingsSection } from '../controls';
import type { StateSetter, ThemeUpdater } from '../types';

type BookmarkPanelProps = {
  gridSettings: GridSettings;
  iconSize: number;
  onThemeChange: ThemeUpdater;
  setGridSettings: StateSetter<GridSettings>;
  setIconSize: StateSetter<number>;
  setSettings: StateSetter<Settings>;
  setSize: StateSetter<number>;
  settings: Settings;
  size: number;
  theme: StarlitTheme;
};

export function BookmarkPanel({
  gridSettings,
  iconSize,
  onThemeChange,
  setGridSettings,
  setIconSize,
  setSettings,
  setSize,
  settings,
  size,
  theme,
}: BookmarkPanelProps): ReactElement {
  const { t } = useTranslation();
  const isHorizontal = settings.iconLayout === 'horizontal';

  return (
    <Stack gap="lg">
      <SettingsSection title={t('sidebar.appearance.bookmark')}>
        <Switch
          checked={isHorizontal}
          onChange={(event) => {
            const isChecked = event.currentTarget.checked;
            setSettings((currentSettings) => ({
              ...currentSettings,
              iconLayout: isChecked ? 'horizontal' : 'vertical',
            }));
          }}
        >
          {t('sidebar.bookmark.horizontalIcon')}
        </Switch>
        <div className={styles.fieldGrid}>
          <RangeControl
            label={t('sidebar.bookmark.scale')}
            max={50}
            min={10}
            onValueChange={setSize}
            suffix="px"
            value={size}
          />
          {!isHorizontal ? (
            <>
              <RangeControl
                label={t('sidebar.bookmark.horizontalSize')}
                max={10}
                min={2}
                onValueChange={(value) =>
                  setGridSettings((currentGrid) => ({
                    ...currentGrid,
                    icon: { ...currentGrid.icon, width: value },
                  }))
                }
                step={0.5}
                suffix="em"
                value={gridSettings.icon.width ?? 4}
              />
              <RangeControl
                label={t('sidebar.bookmark.verticalSize')}
                max={10}
                min={2}
                onValueChange={(value) =>
                  setGridSettings((currentGrid) => ({
                    ...currentGrid,
                    icon: { ...currentGrid.icon, height: value },
                  }))
                }
                step={0.5}
                suffix="em"
                value={gridSettings.icon.height ?? 4}
              />
            </>
          ) : null}
          <RangeControl
            label={t('sidebar.bookmark.iconSize')}
            max={32}
            min={16}
            onValueChange={setIconSize}
            suffix="px"
            value={iconSize}
          />
          <RangeControl
            label={t('sidebar.bookmark.borderRadius')}
            max={30}
            min={0}
            onValueChange={(value) =>
              setGridSettings((currentGrid) => ({
                ...currentGrid,
                icon: { ...currentGrid.icon, borderRadius: value },
              }))
            }
            suffix="px"
            value={gridSettings.icon.borderRadius ?? 1}
          />
          <RangeControl
            label={t('sidebar.bookmark.iconBorderRadius')}
            max={30}
            min={0}
            onValueChange={(value) =>
              setGridSettings((currentGrid) => ({
                ...currentGrid,
                icon: { ...currentGrid.icon, iconRadius: value },
              }))
            }
            suffix="px"
            value={gridSettings.icon.iconRadius ?? 1}
          />
        </div>
      </SettingsSection>
      <SettingsSection title={t('sidebar.tokens.bookmarkTitle')}>
        <div className={styles.fieldGrid}>
          <ColorControl
            label={t('sidebar.bookmark.boxColor')}
            onValueChange={(value) =>
              setGridSettings((currentGrid) => ({
                ...currentGrid,
                icon: { ...currentGrid.icon, color: value },
              }))
            }
            value={gridSettings.icon.color}
          />
          <ColorControl
            label={t('sidebar.bookmark.text')}
            onValueChange={(value) => onThemeChange('text', value)}
            value={theme.text}
          />
          <ColorControl
            label={t('sidebar.bookmark.hoverBackground')}
            onValueChange={(value) => onThemeChange('hoverBg', value)}
            value={theme.hoverBg}
          />
          <ColorControl
            label={t('sidebar.bookmark.hoverText')}
            onValueChange={(value) => onThemeChange('hoverText', value)}
            value={theme.hoverText}
          />
        </div>
      </SettingsSection>
    </Stack>
  );
}
