import { DEFAULT_SYNC_STORAGE_VALUES } from '../platform/storage/defaults';
import { replaceIndexedRecordSet } from '../platform/storage/indexedDbRecords';
import {
  deleteLegacyMedia,
  deleteMedia,
  deleteMediaByPrefix,
  SCENE_STORE_NAME,
  SHARED_ASSET_STORE_NAME,
} from '../platform/storage/mediaStorage';
import {
  ACTIVE_SCENE_ID_STORAGE_KEY,
  SCENE_INDEX_STORAGE_KEY,
} from '../platform/storage/sceneRepository';
import { STORAGE_SCHEMA_VERSION } from '../platform/storage/schema';
import {
  DISMISSED_LEGACY_SYNC_HYDRATION_STATE,
  LEGACY_SCENE_SETTINGS_SNAPSHOT_KEY,
  LEGACY_SYNC_HYDRATION_STATE_KEY,
  STORAGE_MIGRATION_LOCK_NAME,
} from '../platform/storage/migrateStorage';
import { withExclusiveLock } from '../platform/locks/exclusiveLock';
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
const LEGACY_CALENDAR_LIST_STORAGE_KEY = 'googleCalendar.calendarList.v1';
const LEGACY_SELECTED_CALENDAR_IDS_STORAGE_KEY =
  'googleCalendar.selectedCalendarIds';
const SYNC_KEYS_TO_REMOVE = [
  'backgroundImage',
  'backgroundMeta',
  'bookmarkTreePrefs',
  'bookmarks',
  'colorTheme',
  'customCSS',
  'displaySize',
  'expandedGroupsState',
  'gridSettings',
  'groupPreferences',
  'iconSize',
  LEGACY_SCENE_SETTINGS_SNAPSHOT_KEY,
  'locale',
  OVERLAY_SCENE_STORAGE_KEY,
  'size',
] as const;
const LOCAL_SCENE_KEYS_TO_REMOVE = [
  'backgroundImage',
  'backgroundMeta',
  'bookmarkTreePrefs',
  'colorTheme',
  'customCSS',
  'displaySize',
  'gridSettings',
  'groupPreferences',
  'iconSize',
  OVERLAY_SCENE_STORAGE_KEY,
  'settings',
  'size',
] as const;

export async function resetAllSettings(): Promise<void> {
  await withExclusiveLock(STORAGE_MIGRATION_LOCK_NAME, () =>
    withOverlayMediaMutationLock(async (): Promise<void> => {
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
        ACTIVE_SCENE_ID_STORAGE_KEY,
        'bookmarks',
        'expandedGroupsState',
        'favicons',
        LEGACY_CALENDAR_LIST_STORAGE_KEY,
        LEGACY_SELECTED_CALENDAR_IDS_STORAGE_KEY,
        SCENE_INDEX_STORAGE_KEY,
        'tutorialStatus',
        ...LOCAL_SCENE_KEYS_TO_REMOVE,
        ...overlayLeaseKeys,
      ]);
      await storage.session.clear();
      await Promise.all([
        deleteMedia(BACKGROUND_MEDIA_KEY),
        deleteLegacyMedia(BACKGROUND_MEDIA_KEY),
        deleteMediaByPrefix(OVERLAY_IMAGE_MEDIA_KEY_PREFIX),
        deleteMediaByPrefix(OVERLAY_DRAFT_MEDIA_KEY_PREFIX),
        replaceIndexedRecordSet(SCENE_STORE_NAME, '', []),
        replaceIndexedRecordSet(SHARED_ASSET_STORE_NAME, '', []),
      ]);
      await storage.local.set({
        [LEGACY_SYNC_HYDRATION_STATE_KEY]:
          DISMISSED_LEGACY_SYNC_HYDRATION_STATE,
      });
    }),
  );
}
