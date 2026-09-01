import type { ScenePresetV1 } from './types';

export type SceneResourceAvailability = {
  assetIds: ReadonlySet<string>;
  folderIds: ReadonlySet<string>;
  recoverableAssetIds?: ReadonlySet<string>;
  recoverySnapshotIds?: ReadonlySet<string>;
};

export type MissingBookmarkFolderIssue = {
  kind: 'bookmark-folder';
  resourceId: string;
};

export type MissingAssetIssue = {
  kind: 'asset';
  resourceId: string;
  usages: Array<'background' | `decoration:${string}`>;
};

export type SceneReadinessIssue =
  | MissingAssetIssue
  | MissingBookmarkFolderIssue;

export type SceneRecoveryAction = 'relink' | 'restore';

export type SceneReadiness = {
  availableActions: SceneRecoveryAction[];
  canRestore: boolean;
  isReady: boolean;
  issues: SceneReadinessIssue[];
};

function getRequiredAssets(
  scene: ScenePresetV1,
): Map<string, MissingAssetIssue['usages']> {
  const requiredAssets = new Map<string, MissingAssetIssue['usages']>();

  if (scene.appearance.background.source === 'asset') {
    requiredAssets.set(scene.appearance.background.assetId, ['background']);
  }

  scene.canvas.layers.forEach((layer) => {
    if (layer.kind !== 'decoration') {
      return;
    }

    const usages = requiredAssets.get(layer.assetId) ?? [];
    requiredAssets.set(layer.assetId, [...usages, `decoration:${layer.id}`]);
  });

  return requiredAssets;
}

function canRestoreIssue(
  issue: SceneReadinessIssue,
  scene: ScenePresetV1,
  availability: SceneResourceAvailability,
): boolean {
  if (issue.kind === 'asset') {
    return availability.recoverableAssetIds?.has(issue.resourceId) ?? false;
  }

  const snapshotId = scene.bookmarkCollection.recoverySnapshotId;
  return Boolean(
    snapshotId && availability.recoverySnapshotIds?.has(snapshotId),
  );
}

export function getSceneReadiness(
  scene: ScenePresetV1,
  availability: SceneResourceAvailability,
): SceneReadiness {
  const issues: SceneReadinessIssue[] = [];
  const folderId = scene.bookmarkCollection.folderId;

  if (folderId !== null && !availability.folderIds.has(folderId)) {
    issues.push({ kind: 'bookmark-folder', resourceId: folderId });
  }

  for (const [assetId, usages] of getRequiredAssets(scene)) {
    if (!availability.assetIds.has(assetId)) {
      issues.push({ kind: 'asset', resourceId: assetId, usages });
    }
  }

  if (issues.length === 0) {
    return {
      availableActions: [],
      canRestore: false,
      isReady: true,
      issues: [],
    };
  }

  const canRestore = issues.every((issue) =>
    canRestoreIssue(issue, scene, availability),
  );

  return {
    availableActions: canRestore ? ['relink', 'restore'] : ['relink'],
    canRestore,
    isReady: false,
    issues,
  };
}
