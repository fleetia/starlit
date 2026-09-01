import type { Bookmark } from '../bookmarks/types';

export type SettingsDestination =
  | 'appearance'
  | 'css'
  | 'general'
  | 'groups'
  | 'layout'
  | 'portable'
  | 'scene'
  | 'widgets';

export type PaletteBookmarkResult = {
  bookmarkId: string;
  category: 'bookmark';
  isCurrentScene: boolean;
  path: readonly string[];
  title: string;
  url: string;
};

export type PaletteGroupResult = {
  category: 'group';
  groupId: string;
  isCurrentScene: boolean;
  path: readonly string[];
  title: string;
};

export type PaletteSceneResult = {
  category: 'scene';
  isCurrentScene: boolean;
  sceneId: string;
  title: string;
};

export type PaletteSettingsResult = {
  category: 'settings';
  destination: SettingsDestination;
  isCurrentScene: false;
  title: string;
};

export type PaletteResult =
  | PaletteBookmarkResult
  | PaletteGroupResult
  | PaletteSceneResult
  | PaletteSettingsResult;

export type PaletteSceneSummary = {
  id: string;
  name: string;
};

export type CreatePaletteResultsOptions = {
  activeSceneId?: string;
  bookmarks: readonly Bookmark[];
  currentSceneRootId?: string;
  scenes: readonly PaletteSceneSummary[];
  settingsLabels: Readonly<Record<SettingsDestination, string>>;
};
