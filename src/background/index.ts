import type { Locale } from '../i18n';
import { DEFAULT_SYNC_STORAGE_VALUES } from '../platform/storage/defaults';
import { runStorageMigration } from '../platform/storage/migrateStorage';
import storage from '../platform/storage/storage';
import { installTabGroupImportPermissionCoordinator } from './tabGroupImportPermissionCoordinator';

const TUTORIAL_STATUS_KEY = 'tutorialStatus';
const LOCALE_KEY = 'locale';

installTabGroupImportPermissionCoordinator();

export function getInstallLocale(uiLanguage: string): Locale {
  const language = uiLanguage.toLowerCase().split(/[-_]/)[0];

  if (language === 'ko' || language === 'ja') {
    return language;
  }

  return 'en';
}

export async function initializeFirstInstallState(): Promise<void> {
  const [storedLocale, storedTutorialStatus] = await Promise.all([
    storage.sync.get(LOCALE_KEY),
    storage.local.get(TUTORIAL_STATUS_KEY),
  ]);
  const updates: Record<string, unknown> = {};

  if (storedLocale === undefined) {
    const uiLanguage = chrome.i18n?.getUILanguage?.() ?? 'en';
    updates[LOCALE_KEY] = getInstallLocale(uiLanguage);
  }

  if (Object.keys(updates).length > 0) {
    await storage.sync.set(updates);
  }

  if (storedTutorialStatus === undefined) {
    await storage.local.set({ [TUTORIAL_STATUS_KEY]: 'pending' });
  }
}

export async function initializeInstallDefaults(): Promise<void> {
  await initializeFirstInstallState();

  const entries = await Promise.all(
    Object.entries(DEFAULT_SYNC_STORAGE_VALUES).map(async ([key, value]) => ({
      key,
      storedValue: await storage.sync.get(key),
      value,
    })),
  );
  const missingEntries = entries.filter(
    ({ storedValue }) => storedValue === undefined,
  );

  if (missingEntries.length > 0) {
    await storage.sync.set(
      Object.fromEntries(missingEntries.map(({ key, value }) => [key, value])),
    );
  }

  await runStorageMigration();
}

chrome.runtime.onInstalled.addListener((details): void => {
  if (details.reason === 'install') {
    void initializeInstallDefaults();
  }
});
