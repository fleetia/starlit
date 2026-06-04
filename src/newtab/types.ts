export type BookmarkItem = {
  id: string;
  title: string;
  url: string;
  favicon?: string;
};

export type Bookmark = {
  id?: string;
  title: string;
  description?: string;
  url?: string;
  favicon?: string;
  route?: string[];
  list?: BookmarkItem[];
  children?: Bookmark[];
};

export type GridSettings = {
  columns: number;
  horizontalColumns?: number;
  rows: number;
  gap: string;
  cardGap?: string;
  masonryColumns?: number;
  position: string;
  margin?: { top: number; bottom: number; left: number; right: number };
  background: {
    color: string;
    border: string;
    text: string;
    gridImage?: string;
  };
  icon: {
    color: string;
    border: string;
    text: string;
    borderRadius?: number;
    iconRadius?: number;
    width?: number;
    height?: number;
  };
  heading?: {
    titleColor: string;
    titleSize?: number;
    subtitleColor: string;
    subtitleSize?: number;
    borderEnabled: boolean;
    borderWidth: number;
    borderColor: string;
    subtitleHoverColor: string;
    borderRadius?: number;
  };
  folder?: {
    color: string;
    accent: string;
    accentText: string;
    text: string;
    border: string;
  };
};

import type { ColorTheme } from "@fleetia/components/theme";
export type { ColorTheme };

export type Settings = {
  isFolderEnabled: boolean;
  isVisibleOnce: boolean;
  isOpenInNewTab: boolean;
  isExpandView: boolean;
  iconLayout?: "vertical" | "horizontal";
};

export type GroupPreference = {
  key: string;
  visible: boolean;
};

export function getGroupKey(b: Bookmark): string {
  return (b.route ?? [b.title]).join("/");
}

export type OptionsType = {
  bookmarks: Bookmark[];
  gridSettings: GridSettings;
  settings: Settings;
  colorTheme: ColorTheme;
  backgroundImage?: string;
  displaySize: number;
  customCSS?: string;
};
