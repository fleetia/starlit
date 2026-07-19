import { DEFAULT_FONT_FAMILY } from '../theme/defaults';
import type { FontFamily } from '../theme/types';
import { DEFAULT_SETTINGS } from './defaults';
import type { Settings } from './types';

export function isFontFamily(value: unknown): value is FontFamily {
  return value === 'ibm-plex-sans' || value === 'system';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeSettings(value: unknown): Settings {
  const stored = isRecord(value) ? value : {};
  const defaults = DEFAULT_SETTINGS;
  const iconLayout =
    stored.iconLayout === 'horizontal' || stored.iconLayout === 'vertical'
      ? stored.iconLayout
      : defaults.iconLayout;

  return {
    fontFamily: isFontFamily(stored.fontFamily)
      ? stored.fontFamily
      : DEFAULT_FONT_FAMILY,
    iconLayout,
    isExpandView:
      typeof stored.isExpandView === 'boolean'
        ? stored.isExpandView
        : defaults.isExpandView,
    isFolderEnabled:
      typeof stored.isFolderEnabled === 'boolean'
        ? stored.isFolderEnabled
        : defaults.isFolderEnabled,
    isOpenInNewTab:
      typeof stored.isOpenInNewTab === 'boolean'
        ? stored.isOpenInNewTab
        : defaults.isOpenInNewTab,
    isVisibleOnce:
      typeof stored.isVisibleOnce === 'boolean'
        ? stored.isVisibleOnce
        : defaults.isVisibleOnce,
  };
}
