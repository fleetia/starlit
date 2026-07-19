import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { PlacementPicker, Stack, Switch } from '@fleetia/lagrange';

import { useTranslation } from '../../i18n';
import type { GridSettings } from '../../layout/types';
import type { Settings } from '../types';
import * as styles from '../OptionsSidebar.css';
import { RangeControl, SettingsSection } from './controls';
import { parseDimension } from './helpers';
import { OptionsPreview } from './OptionsPreview';
import type { OptionsPreviewState, StateSetter } from './types';

type LayoutPanelProps = {
  gridSettings: GridSettings;
  preview?: ReactNode | ((draft: OptionsPreviewState) => ReactNode);
  previewState: OptionsPreviewState;
  previewStyle: CSSProperties;
  setGridSettings: StateSetter<GridSettings>;
  setSettings: StateSetter<Settings>;
  settings: Settings;
};

type Margin = NonNullable<GridSettings['margin']>;

export function LayoutPanel({
  gridSettings,
  preview,
  previewState,
  previewStyle,
  setGridSettings,
  setSettings,
  settings,
}: LayoutPanelProps): ReactElement {
  const { t } = useTranslation();
  const isHorizontal = settings.iconLayout === 'horizontal';
  const isExpanded = settings.isExpandView;
  const margin = gridSettings.margin ?? {
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  };
  let columnLabel = t('sidebar.layout.columnCount');

  if (isHorizontal) {
    columnLabel = t('sidebar.layout.horizontalSize');
  } else if (isExpanded) {
    columnLabel = t('sidebar.layout.cardInnerColumns');
  }

  function updateMargin(changes: Partial<Margin>): void {
    setGridSettings((currentGrid) => ({
      ...currentGrid,
      margin: {
        bottom: currentGrid.margin?.bottom ?? 0,
        left: currentGrid.margin?.left ?? 0,
        right: currentGrid.margin?.right ?? 0,
        top: currentGrid.margin?.top ?? 0,
        ...changes,
      },
    }));
  }

  return (
    <Stack gap="lg">
      <OptionsPreview
        label={t('sidebar.layout.preview')}
        preview={preview}
        state={previewState}
        style={previewStyle}
      />
      <SettingsSection title={t('sidebar.tab.layout')}>
        <Stack gap="sm">
          <Switch
            checked={isExpanded}
            onChange={(event) => {
              const isChecked = event.currentTarget.checked;
              setSettings((currentSettings) => ({
                ...currentSettings,
                isExpandView: isChecked,
              }));
            }}
          >
            {t('sidebar.layout.expandBookmarks')}
          </Switch>
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
            {t('sidebar.layout.horizontalIcon')}
          </Switch>
        </Stack>
      </SettingsSection>
      <SettingsSection
        title={
          isExpanded
            ? t('sidebar.layout.expandLayout')
            : t('sidebar.layout.scrollLayout')
        }
      >
        <div className={styles.fieldGrid}>
          {isExpanded ? (
            <RangeControl
              label={t('sidebar.layout.cardColumns')}
              max={5}
              min={1}
              onValueChange={(value) =>
                setGridSettings((currentGrid) => ({
                  ...currentGrid,
                  masonryColumns: value,
                }))
              }
              value={gridSettings.masonryColumns ?? 2}
            />
          ) : null}
          <RangeControl
            label={columnLabel}
            max={10}
            min={3}
            onValueChange={(value) =>
              setGridSettings((currentGrid) => ({
                ...currentGrid,
                columns: value,
              }))
            }
            value={gridSettings.columns}
          />
          {isHorizontal ? (
            <RangeControl
              label={t('sidebar.layout.horizontalColumnCount')}
              max={5}
              min={1}
              onValueChange={(value) =>
                setGridSettings((currentGrid) => ({
                  ...currentGrid,
                  horizontalColumns: value,
                }))
              }
              value={gridSettings.horizontalColumns ?? 1}
            />
          ) : null}
          {!isExpanded ? (
            <RangeControl
              label={t('sidebar.layout.rowCount')}
              max={5}
              min={1}
              onValueChange={(value) =>
                setGridSettings((currentGrid) => ({
                  ...currentGrid,
                  rows: value,
                }))
              }
              value={gridSettings.rows}
            />
          ) : null}
          {isExpanded ? (
            <RangeControl
              label={t('sidebar.layout.cardGap')}
              max={5}
              min={0}
              onValueChange={(value) =>
                setGridSettings((currentGrid) => ({
                  ...currentGrid,
                  cardGap: `${value}em`,
                }))
              }
              step={0.1}
              suffix="em"
              value={parseDimension(gridSettings.cardGap, 1.5)}
            />
          ) : null}
          <RangeControl
            label={
              isExpanded
                ? t('sidebar.layout.bookmarkGap')
                : t('sidebar.layout.gap')
            }
            max={3}
            min={0}
            onValueChange={(value) =>
              setGridSettings((currentGrid) => ({
                ...currentGrid,
                gap: `${value}em`,
              }))
            }
            step={0.1}
            suffix="em"
            value={parseDimension(gridSettings.gap, 1)}
          />
        </div>
      </SettingsSection>
      <SettingsSection title={t('sidebar.layout.positionMargin')}>
        <PlacementPicker
          label={t('positionGrid.group')}
          onValueChange={(value) =>
            setGridSettings((currentGrid) => ({
              ...currentGrid,
              position: value,
            }))
          }
          value={gridSettings.position}
        />
        <div className={styles.marginGrid}>
          <RangeControl
            label={t('positionGrid.margin.top')}
            max={100}
            min={0}
            onValueChange={(value) => updateMargin({ top: value })}
            suffix="px"
            value={margin.top}
          />
          <RangeControl
            label={t('positionGrid.margin.right')}
            max={100}
            min={0}
            onValueChange={(value) => updateMargin({ right: value })}
            suffix="px"
            value={margin.right}
          />
          <RangeControl
            label={t('positionGrid.margin.bottom')}
            max={100}
            min={0}
            onValueChange={(value) => updateMargin({ bottom: value })}
            suffix="px"
            value={margin.bottom}
          />
          <RangeControl
            label={t('positionGrid.margin.left')}
            max={100}
            min={0}
            onValueChange={(value) => updateMargin({ left: value })}
            suffix="px"
            value={margin.left}
          />
        </div>
      </SettingsSection>
    </Stack>
  );
}
