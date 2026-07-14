import { defaultOptionValue } from '../newtab/defaultOptionValue';
import { STORAGE_SCHEMA_VERSION } from '../platform/storage/schema';
import { deleteMedia } from '../platform/storage/mediaStorage';
import storage from '../platform/storage/storage';

const BACKGROUND_MEDIA_KEY = 'backgroundMedia';
const SYNC_KEYS_TO_REMOVE = [
  'backgroundImage',
  'backgroundMeta',
  'bookmarkTreePrefs',
  'bookmarks',
  'customCSS',
  'displaySize',
  'groupPreferences',
  'locale',
] as const;

export async function resetAllSettings(): Promise<void> {
  await storage.sync.set({
    colorTheme: defaultOptionValue.colorTheme,
    gridSettings: defaultOptionValue.gridSettings,
    iconSize: defaultOptionValue.iconSize,
    settings: defaultOptionValue.settings,
    size: defaultOptionValue.size,
    storageSchemaVersion: STORAGE_SCHEMA_VERSION,
  });
  await storage.sync.remove([...SYNC_KEYS_TO_REMOVE]);
  await storage.local.remove(['bookmarks', 'favicons']);
  await deleteMedia(BACKGROUND_MEDIA_KEY);
}
