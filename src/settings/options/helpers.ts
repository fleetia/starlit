import type { BookmarkTreePrefs } from '../../bookmarks/useBookmarkTreePrefs';
import { DEFAULT_GRID_SETTINGS } from '../../layout/defaults';
import type { GridSettings } from '../../layout/types';
import type { StarlitTheme } from '../../theme/types';
import type { Locale } from '../../i18n';
import type { FolderSettings, HeadingSettings, PrimaryTab } from './types';

const PRIMARY_TABS: readonly PrimaryTab[] = [
  'general',
  'appearance',
  'layers',
  'layout',
  'css',
  'groups',
];

export function isEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function parseDimension(
  value: string | undefined,
  fallback: number,
): number {
  const parsedValue = Number.parseFloat(value ?? '');

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown settings error';
}

export function createBookmarkTreePreferences(
  rootPath: string[],
  siblingOrder: Record<string, string[]>,
  rootId?: string,
): BookmarkTreePrefs {
  return rootId
    ? { rootId, rootPath, siblingOrder }
    : { rootPath, siblingOrder };
}

export async function rollbackSettingsSave(
  operations: readonly (() => Promise<void>)[],
): Promise<void> {
  const failures: unknown[] = [];

  for (const operation of [...operations].reverse()) {
    try {
      await operation();
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length > 0) {
    throw new AggregateError(failures, 'Settings rollback failed');
  }
}

export function isLocale(value: string): value is Locale {
  return value === 'en' || value === 'ja' || value === 'ko';
}

export function isPrimaryTab(value: string): value is PrimaryTab {
  return PRIMARY_TABS.some((tab) => tab === value);
}

export function getHeadingSettings(
  gridSettings: GridSettings,
  theme: StarlitTheme,
): HeadingSettings {
  const fallback = {
    borderColor: theme.border,
    borderEnabled: false,
    borderWidth: 1,
    subtitleColor: theme.muted,
    subtitleHoverColor: theme.accent,
    titleBackgroundColor: DEFAULT_GRID_SETTINGS.heading?.titleBackgroundColor,
    titleColor: theme.accent,
  };

  return gridSettings.heading
    ? { ...fallback, ...gridSettings.heading }
    : fallback;
}

export function getFolderSettings(
  gridSettings: GridSettings,
  theme: StarlitTheme,
): FolderSettings {
  return (
    gridSettings.folder ?? {
      accent: theme.accent,
      accentText: theme.accentText,
      border: theme.border,
      color: theme.surface,
      text: theme.text,
    }
  );
}
