import type {
  ChangeEvent,
  CSSProperties,
  ReactElement,
  ReactNode,
  RefObject,
} from 'react';
import { Stack, Tab, TabList, TabPanel, Tabs } from '@fleetia/lagrange';

import { useTranslation } from '../../i18n';
import type { GridSettings } from '../../layout/types';
import type { StarlitTheme } from '../../theme/types';
import type { BackgroundMedia } from '../backgroundMedia';
import type { Settings } from '../types';
import * as styles from '../OptionsSidebar.css';
import { OptionsPreview } from './OptionsPreview';
import { BackgroundPanel } from './appearance/BackgroundPanel';
import { BookmarkPanel } from './appearance/BookmarkPanel';
import { ContainerPanel } from './appearance/ContainerPanel';
import { FolderPanel } from './appearance/FolderPanel';
import type {
  AppearanceTab,
  BackgroundDraft,
  OptionsPreviewState,
  StateSetter,
  ThemeUpdater,
} from './types';

const APPEARANCE_TABS: readonly AppearanceTab[] = [
  'background',
  'container',
  'bookmark',
  'folder',
];

type AppearancePanelProps = {
  appearanceTab: AppearanceTab;
  backgroundFileRef: RefObject<HTMLInputElement | null>;
  backgroundMeta: BackgroundMedia | null | undefined;
  backgroundSource: BackgroundMedia['source'];
  backgroundUrl: string;
  draftBackground: BackgroundDraft | null;
  gridSettings: GridSettings;
  iconSize: number;
  isBackgroundProcessing: boolean;
  isSaving: boolean;
  onBackgroundClear: () => void;
  onBackgroundFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBackgroundSourceChange: (value: string) => void;
  onBackgroundUrlChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTabChange: (tab: AppearanceTab) => void;
  onThemeChange: ThemeUpdater;
  preview?: ReactNode | ((draft: OptionsPreviewState) => ReactNode);
  previewState: OptionsPreviewState;
  previewStyle: CSSProperties;
  setGridSettings: StateSetter<GridSettings>;
  setIconSize: StateSetter<number>;
  setSettings: StateSetter<Settings>;
  setSize: StateSetter<number>;
  settings: Settings;
  size: number;
  theme: StarlitTheme;
};

function isAppearanceTab(value: string): value is AppearanceTab {
  return APPEARANCE_TABS.some((tab) => tab === value);
}

export function AppearancePanel({
  appearanceTab,
  backgroundFileRef,
  backgroundMeta,
  backgroundSource,
  backgroundUrl,
  draftBackground,
  gridSettings,
  iconSize,
  isBackgroundProcessing,
  isSaving,
  onBackgroundClear,
  onBackgroundFileChange,
  onBackgroundSourceChange,
  onBackgroundUrlChange,
  onTabChange,
  onThemeChange,
  preview,
  previewState,
  previewStyle,
  setGridSettings,
  setIconSize,
  setSettings,
  setSize,
  settings,
  size,
  theme,
}: AppearancePanelProps): ReactElement {
  const { t } = useTranslation();

  function getPreviewTitle(): string {
    switch (appearanceTab) {
      case 'background':
        return t('sidebar.background.preview');
      case 'bookmark':
        return t('sidebar.bookmark.preview');
      case 'container':
        return t('sidebar.container.preview');
      case 'folder':
        return t('sidebar.folder.preview');
    }
  }

  function handleTabChange(value: string): void {
    if (isAppearanceTab(value)) {
      onTabChange(value);
    }
  }

  return (
    <Stack gap="lg">
      <OptionsPreview
        label={getPreviewTitle()}
        preview={preview}
        state={previewState}
        style={previewStyle}
      />
      <Tabs
        className={styles.appearanceTabs}
        onValueChange={handleTabChange}
        value={appearanceTab}
      >
        <TabList aria-label={t('sidebar.tab.appearance')}>
          <Tab value="background">{t('sidebar.appearance.background')}</Tab>
          <Tab value="container">{t('sidebar.appearance.container')}</Tab>
          <Tab value="bookmark">{t('sidebar.appearance.bookmark')}</Tab>
          <Tab value="folder">{t('sidebar.appearance.folder')}</Tab>
        </TabList>
        <TabPanel data-starlit-part="settings-background" value="background">
          <BackgroundPanel
            backgroundFileRef={backgroundFileRef}
            backgroundMeta={backgroundMeta}
            backgroundSource={backgroundSource}
            backgroundUrl={backgroundUrl}
            draftBackground={draftBackground}
            gridSettings={gridSettings}
            isBackgroundProcessing={isBackgroundProcessing}
            isSaving={isSaving}
            onBackgroundClear={onBackgroundClear}
            onBackgroundFileChange={onBackgroundFileChange}
            onBackgroundSourceChange={onBackgroundSourceChange}
            onBackgroundUrlChange={onBackgroundUrlChange}
            onThemeChange={onThemeChange}
            setGridSettings={setGridSettings}
            theme={theme}
          />
        </TabPanel>
        <TabPanel data-starlit-part="settings-container" value="container">
          <ContainerPanel
            gridSettings={gridSettings}
            onThemeChange={onThemeChange}
            setGridSettings={setGridSettings}
            theme={theme}
          />
        </TabPanel>
        <TabPanel data-starlit-part="settings-bookmark" value="bookmark">
          <BookmarkPanel
            gridSettings={gridSettings}
            iconSize={iconSize}
            onThemeChange={onThemeChange}
            setGridSettings={setGridSettings}
            setIconSize={setIconSize}
            setSettings={setSettings}
            setSize={setSize}
            settings={settings}
            size={size}
            theme={theme}
          />
        </TabPanel>
        <TabPanel data-starlit-part="settings-folder" value="folder">
          <FolderPanel
            gridSettings={gridSettings}
            setGridSettings={setGridSettings}
            setSettings={setSettings}
            settings={settings}
            theme={theme}
          />
        </TabPanel>
      </Tabs>
    </Stack>
  );
}
