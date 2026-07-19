import { DEFAULT_FONT_FAMILY } from '../theme/defaults';
import type { Settings } from './types';

export const DEFAULT_ICON_SIZE = 28;
export const DEFAULT_SIZE = 16;

export const DEFAULT_SETTINGS: Settings = {
  fontFamily: DEFAULT_FONT_FAMILY,
  isFolderEnabled: true,
  isVisibleOnce: false,
  isOpenInNewTab: false,
  isExpandView: false,
};
