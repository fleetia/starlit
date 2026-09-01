import type { Locale } from '../i18n';
import { installChromeCalendarMessageHandler } from '../calendar';
import { DEFAULT_LOCAL_STORAGE_VALUES } from '../platform/storage/defaults';
import {
  hasLegacySyncHydrationChange,
  runStorageMigration,
} from '../platform/storage/migrateStorage';
import storage from '../platform/storage/storage';
import { installTabGroupImportPermissionCoordinator } from './tabGroupImportPermissionCoordinator';

const TUTORIAL_STATUS_KEY = 'tutorialStatus';
const LOCALE_KEY = 'locale';

installTabGroupImportPermissionCoordinator();
installChromeCalendarMessageHandler();

let storageMigrationQueue = Promise.resolve();

export function installStorageMigrationSyncListener(): void {
  chrome.storage.onChanged.addListener((changes, areaName): void => {
    if (!hasLegacySyncHydrationChange(changes, areaName)) return;

    storageMigrationQueue = storageMigrationQueue
      .catch(() => undefined)
      .then(runStorageMigration);
    void storageMigrationQueue.catch((error: unknown) => {
      if (typeof globalThis.reportError === 'function') {
        globalThis.reportError(error);
      }
    });
  });
}

installStorageMigrationSyncListener();

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
  await runStorageMigration();
  await initializeFirstInstallState();

  const localEntries = await Promise.all(
    Object.entries(DEFAULT_LOCAL_STORAGE_VALUES).map(async ([key, value]) => ({
      key,
      storedValue: await storage.local.get(key),
      value,
    })),
  );
  const missingLocalEntries = localEntries.filter(
    ({ storedValue }) => storedValue === undefined,
  );

  if (missingLocalEntries.length > 0) {
    await storage.local.set(
      Object.fromEntries(
        missingLocalEntries.map(({ key, value }) => [key, value]),
      ),
    );
  }
}

chrome.runtime.onInstalled.addListener((details): void => {
  if (details.reason === 'install') {
    void initializeInstallDefaults();
  }
});
