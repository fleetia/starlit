import { DEFAULT_SYNC_STORAGE_VALUES } from '../platform/storage/defaults';
import { deleteMedia } from '../platform/storage/mediaStorage';
import { STORAGE_SCHEMA_VERSION } from '../platform/storage/schema';
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
    ...DEFAULT_SYNC_STORAGE_VALUES,
    storageSchemaVersion: STORAGE_SCHEMA_VERSION,
  });
  await storage.sync.remove([...SYNC_KEYS_TO_REMOVE]);
  await storage.local.remove(['bookmarks', 'favicons']);
  await deleteMedia(BACKGROUND_MEDIA_KEY);
}
