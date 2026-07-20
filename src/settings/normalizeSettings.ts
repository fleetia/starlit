import type { FontFamily } from '../theme/types';
import { DEFAULT_SETTINGS } from './defaults';
import type { Settings } from './types';

export function isFontFamily(value: unknown): value is FontFamily {
  return value === 'ibm-plex-sans' || value === 'system';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeSettings(
  value: unknown,
  fallback: Settings = DEFAULT_SETTINGS,
): Settings {
  const stored = isRecord(value) ? value : {};
  const iconLayout =
    stored.iconLayout === 'horizontal' || stored.iconLayout === 'vertical'
      ? stored.iconLayout
      : fallback.iconLayout;

  return {
    fontFamily: isFontFamily(stored.fontFamily)
      ? stored.fontFamily
      : fallback.fontFamily,
    iconLayout,
    isExpandView:
      typeof stored.isExpandView === 'boolean'
        ? stored.isExpandView
        : fallback.isExpandView,
    isFolderEnabled:
      typeof stored.isFolderEnabled === 'boolean'
        ? stored.isFolderEnabled
        : fallback.isFolderEnabled,
    isOpenInNewTab:
      typeof stored.isOpenInNewTab === 'boolean'
        ? stored.isOpenInNewTab
        : fallback.isOpenInNewTab,
    isVisibleOnce:
      typeof stored.isVisibleOnce === 'boolean'
        ? stored.isVisibleOnce
        : fallback.isVisibleOnce,
  };
}
