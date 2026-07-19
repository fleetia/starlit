import { DEFAULT_GRID_SETTINGS } from '../../layout/defaults';
import {
  DEFAULT_ICON_SIZE,
  DEFAULT_SETTINGS,
  DEFAULT_SIZE,
} from '../../settings/defaults';
import { DEFAULT_STARLIT_THEME } from '../../theme/defaults';

export const DEFAULT_SYNC_STORAGE_VALUES = {
  colorTheme: DEFAULT_STARLIT_THEME,
  gridSettings: DEFAULT_GRID_SETTINGS,
  iconSize: DEFAULT_ICON_SIZE,
  settings: DEFAULT_SETTINGS,
  size: DEFAULT_SIZE,
} as const;
