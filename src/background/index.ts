import { defaultOptionValue } from '../newtab/defaultOptionValue';
import { runStorageMigration } from '../platform/storage/migrateStorage';
import storage from '../platform/storage/storage';

const INSTALL_DEFAULTS = {
  colorTheme: defaultOptionValue.colorTheme,
  gridSettings: defaultOptionValue.gridSettings,
  iconSize: defaultOptionValue.iconSize,
  settings: defaultOptionValue.settings,
  size: defaultOptionValue.size,
} as const;

export async function initializeInstallDefaults(): Promise<void> {
  const entries = await Promise.all(
    Object.entries(INSTALL_DEFAULTS).map(async ([key, value]) => ({
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
