import {
  parseSceneRecoverySnapshotV1,
  type SceneRecoverySnapshotV1,
} from '../../scenes/recovery';
import {
  deleteIndexedRecord,
  getIndexedRecord,
  putIndexedRecord,
} from './indexedDbRecords';
import { SCENE_STORE_NAME } from './mediaStorage';

export const SCENE_RECOVERY_RECORD_KEY_PREFIX = 'scene-recovery-record:';

export type SceneRecoveryRepository = {
  delete: (snapshotId: string) => Promise<void>;
  load: (snapshotId: string) => Promise<SceneRecoverySnapshotV1 | null>;
  save: (snapshot: SceneRecoverySnapshotV1) => Promise<void>;
};

function getRecoveryRecordKey(snapshotId: string): string {
  return `${SCENE_RECOVERY_RECORD_KEY_PREFIX}${snapshotId}`;
}

export const sceneRecoveryRepository: SceneRecoveryRepository = {
  delete: (snapshotId) =>
    deleteIndexedRecord(SCENE_STORE_NAME, getRecoveryRecordKey(snapshotId)),
  load: async (snapshotId): Promise<SceneRecoverySnapshotV1 | null> => {
    const value = await getIndexedRecord(
      SCENE_STORE_NAME,
      getRecoveryRecordKey(snapshotId),
    );
    if (value === undefined || value === null) {
      return null;
    }

    try {
      return parseSceneRecoverySnapshotV1(value);
    } catch {
      return null;
    }
  },
  save: (snapshot) =>
    putIndexedRecord(
      SCENE_STORE_NAME,
      getRecoveryRecordKey(snapshot.id),
      parseSceneRecoverySnapshotV1(snapshot),
    ),
};
