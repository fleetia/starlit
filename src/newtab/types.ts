export type BookmarkItem = {
  id: string;
  title: string;
  url: string;
  favicon?: string;
};

export type Placement =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center-center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

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
  position: Placement;
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

export type StarlitTheme = {
  accent: string;
  accentText: string;
  surface: string;
  text: string;
  border: string;
  hoverBg: string;
  hoverText: string;
  muted: string;
};

export type Settings = {
  isFolderEnabled: boolean;
  isVisibleOnce: boolean;
  isOpenInNewTab: boolean;
  isExpandView: boolean;
  iconLayout?: 'vertical' | 'horizontal';
};

export type GroupPreference = {
  key: string;
  visible: boolean;
};

export type OptionsType = {
  bookmarks: Bookmark[];
  colorTheme: StarlitTheme;
  customCSS?: string;
  gridSettings: GridSettings;
  iconSize: number;
  settings: Settings;
  size: number;
};
