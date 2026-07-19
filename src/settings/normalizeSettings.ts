import {
  DEFAULT_FONT_FAMILY,
  defaultOptionValue,
} from '../newtab/defaultOptionValue';
import type { FontFamily, Settings } from '../newtab/types';

export function isFontFamily(value: unknown): value is FontFamily {
  return value === 'ibm-plex-sans' || value === 'system';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeSettings(value: unknown): Settings {
  const stored = isRecord(value) ? value : {};
  const defaults = defaultOptionValue.settings;
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
