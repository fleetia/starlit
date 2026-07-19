import type { BookmarkLayout } from '../bookmarks/types';
import type { FontFamily } from '../theme/types';

export type Settings = {
  fontFamily: FontFamily;
  isFolderEnabled: boolean;
  isVisibleOnce: boolean;
  isOpenInNewTab: boolean;
  isExpandView: boolean;
  iconLayout?: BookmarkLayout;
};

export type PersistedSettings = Omit<Settings, 'fontFamily'> & {
  fontFamily?: FontFamily;
};
