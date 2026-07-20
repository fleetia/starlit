import type { Dispatch, ReactNode, SetStateAction } from 'react';

import type { Bookmark, GroupPreference } from '../../bookmarks/types';
import type { BookmarkTreePrefs } from '../../bookmarks/useBookmarkTreePrefs';
import type { Locale } from '../../i18n';
import type { GridSettings } from '../../layout/types';
import type { OverlayImageLayer, OverlayScene } from '../../overlays/types';
import type { StarlitTheme } from '../../theme/types';
import type { BackgroundMedia } from '../backgroundMedia';
import type { Settings } from '../types';

export type PrimaryTab =
  | 'appearance'
  | 'css'
  | 'general'
  | 'groups'
  | 'layers'
  | 'layout';

export type AppearanceTab = 'background' | 'bookmark' | 'container' | 'folder';

export type HeadingSettings = NonNullable<GridSettings['heading']>;
export type FolderSettings = NonNullable<GridSettings['folder']>;

export type BackgroundDraft =
  | { file: File; kind: 'file' }
  | { kind: 'clear' }
  | { kind: 'url'; url: string };

export type OptionsPreviewState = {
  gridSettings: GridSettings;
  iconSize: number;
  settings: Settings;
  size: number;
  theme: StarlitTheme;
};

export type FontPreviewState = {
  fontFamily: Settings['fontFamily'];
  locale: Locale;
};

export type OptionsSidebarProps = {
  backgroundMeta: BackgroundMedia | null | undefined;
  colorTheme: StarlitTheme;
  customCSS: string;
  gridSettings: GridSettings;
  groupPreferences: GroupPreference[];
  iconSize: number;
  isBackgroundProcessing: boolean;
  isOverlayProcessing: boolean;
  isOpen?: boolean;
  locale: Locale;
  onBackgroundClear: () => Promise<void>;
  onBackgroundFile: (file: File) => Promise<void>;
  onBackgroundUrl: (url: string) => Promise<void>;
  onClose: () => void;
  onCustomCSSChange: (css: string) => Promise<void>;
  onExport?: () => Promise<void>;
  onFontPreviewChange: (preview: FontPreviewState | null) => void;
  onBookmarkTreePreferencesUpdate: (
    preferences: BookmarkTreePrefs,
  ) => Promise<void>;
  onBookmarksImported: () => Promise<void>;
  onGridSettingsUpdate: (settings: GridSettings) => Promise<void>;
  onGroupPreferencesUpdate: (preferences: GroupPreference[]) => Promise<void>;
  onIconSizeChange: (value: number) => Promise<void>;
  onImport?: (file: File) => Promise<void>;
  onLocaleChange: (locale: Locale) => Promise<void>;
  onOverlayEditPreviewChange: (scene: OverlayScene | null) => void;
  onOverlayFilesPrepare: (
    files: readonly File[],
  ) => Promise<OverlayImageLayer[]>;
  onOverlayImagesFinalize: (ids: readonly string[]) => Promise<void>;
  onOverlayImagesDiscard: (ids: readonly string[]) => Promise<void>;
  onOverlaySceneUpdate: (scene: OverlayScene) => Promise<void>;
  onSettingsUpdate: (settings: Settings) => Promise<void>;
  onSizeChange: (value: number) => Promise<void>;
  onThemePreset: (preset: StarlitTheme) => Promise<void>;
  onThemeReset: () => Promise<void>;
  orderedTree: Bookmark[];
  overlayScene: OverlayScene;
  preview?: ReactNode | ((draft: OptionsPreviewState) => ReactNode);
  rootId?: string;
  rootPath: string[];
  settings: Settings;
  siblingOrder: Record<string, string[]>;
  size: number;
};

export type SettingsSnapshot = {
  customCSS: string;
  gridSettings: GridSettings;
  iconSize: number;
  locale: Locale;
  overlayScene: OverlayScene;
  groupPreferences: GroupPreference[];
  rootId?: string;
  rootPath: string[];
  settings: Settings;
  siblingOrder: Record<string, string[]>;
  size: number;
  theme: StarlitTheme;
};

export type StateSetter<Value> = Dispatch<SetStateAction<Value>>;

export type ThemeUpdater = <Key extends keyof StarlitTheme>(
  key: Key,
  value: StarlitTheme[Key],
) => void;
