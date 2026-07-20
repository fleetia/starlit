import { DEFAULT_SYNC_STORAGE_VALUES } from '../platform/storage/defaults';
import {
  deleteMedia,
  deleteMediaByPrefix,
} from '../platform/storage/mediaStorage';
import { STORAGE_SCHEMA_VERSION } from '../platform/storage/schema';
import storage from '../platform/storage/storage';
import { withOverlayMediaMutationLock } from '../overlays/mediaMutationLock';
import {
  OVERLAY_DRAFT_LEASE_KEY_PREFIX,
  OVERLAY_DRAFT_MEDIA_KEY_PREFIX,
  OVERLAY_IMAGE_MEDIA_KEY_PREFIX,
  OVERLAY_MEDIA_MUTATION_LEASE_KEY_PREFIX,
  OVERLAY_SCENE_STORAGE_KEY,
} from '../overlays/model';

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
  await withOverlayMediaMutationLock(async (): Promise<void> => {
    const localValues = await storage.local.getAll();
    const overlayLeaseKeys = Object.keys(localValues).filter(
      (key) =>
        key.startsWith(OVERLAY_DRAFT_LEASE_KEY_PREFIX) ||
        key.startsWith(OVERLAY_MEDIA_MUTATION_LEASE_KEY_PREFIX),
    );

    await storage.sync.set({
      ...DEFAULT_SYNC_STORAGE_VALUES,
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    });
    await storage.sync.remove([...SYNC_KEYS_TO_REMOVE]);
    await storage.local.remove([
      'bookmarks',
      'favicons',
      OVERLAY_SCENE_STORAGE_KEY,
      ...overlayLeaseKeys,
    ]);
    await Promise.all([
      deleteMedia(BACKGROUND_MEDIA_KEY),
      deleteMediaByPrefix(OVERLAY_IMAGE_MEDIA_KEY_PREFIX),
      deleteMediaByPrefix(OVERLAY_DRAFT_MEDIA_KEY_PREFIX),
    ]);
  });
}
