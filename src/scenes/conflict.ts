import { parseScenePresetV1 } from './codec';
import type { ScenePresetV1 } from './types';

const MAX_ID_GENERATION_ATTEMPTS = 100;

export type SceneImportAction = 'add-copy' | 'replace' | 'skip';

export type SceneImportDecision = {
  action: SceneImportAction;
  incomingSceneId: string;
  targetSceneId?: string;
};

export type SceneConflictPreview = {
  conflictingSceneId: string | null;
  incomingSceneId: string;
  sameNameSceneIds: string[];
};

export type SceneAdditionPlan = {
  incomingSceneId: string;
  scene: ScenePresetV1;
};

export type SceneReplacementPlan = {
  incomingSceneId: string;
  previousScene: ScenePresetV1;
  scene: ScenePresetV1;
  targetSceneId: string;
};

export type SceneImportPlan = {
  additions: SceneAdditionPlan[];
  replacements: SceneReplacementPlan[];
  skippedSceneIds: string[];
};

export type SceneConflictPlanOptions = {
  createId: () => string;
  now: number;
};

function assertUniqueSceneIds(
  scenes: readonly ScenePresetV1[],
  label: string,
): void {
  const ids = scenes.map((scene) => scene.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label} scene ids must be unique.`);
  }
}

function createUniqueSceneId(
  occupiedIds: Set<string>,
  createId: () => string,
): string {
  for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
    const id = createId();
    if (id.trim() !== '' && !occupiedIds.has(id)) {
      occupiedIds.add(id);
      return id;
    }
  }

  throw new Error('Could not create a unique scene id.');
}

function cloneSceneAsCopy(
  incomingScene: ScenePresetV1,
  id: string,
  now: number,
): ScenePresetV1 {
  return parseScenePresetV1({
    ...structuredClone(incomingScene),
    createdAt: now,
    id,
    updatedAt: now,
  });
}

function createReplacement(
  incomingScene: ScenePresetV1,
  previousScene: ScenePresetV1,
  now: number,
): ScenePresetV1 {
  return parseScenePresetV1({
    ...structuredClone(incomingScene),
    createdAt: previousScene.createdAt,
    id: previousScene.id,
    updatedAt: now,
  });
}

export function createSceneConflictPreviews(
  existingScenes: readonly ScenePresetV1[],
  incomingScenes: readonly ScenePresetV1[],
): SceneConflictPreview[] {
  assertUniqueSceneIds(existingScenes, 'Existing');
  assertUniqueSceneIds(incomingScenes, 'Incoming');

  return incomingScenes.map((incomingScene) => ({
    conflictingSceneId:
      existingScenes.find((scene) => scene.id === incomingScene.id)?.id ?? null,
    incomingSceneId: incomingScene.id,
    sameNameSceneIds: existingScenes
      .filter((scene) => scene.name === incomingScene.name)
      .map((scene) => scene.id),
  }));
}

export function planSceneConflicts(
  existingScenes: readonly ScenePresetV1[],
  incomingScenes: readonly ScenePresetV1[],
  decisions: readonly SceneImportDecision[],
  options: SceneConflictPlanOptions,
): SceneImportPlan {
  assertUniqueSceneIds(existingScenes, 'Existing');
  assertUniqueSceneIds(incomingScenes, 'Incoming');

  const decisionsBySceneId = new Map(
    decisions.map((decision) => [decision.incomingSceneId, decision]),
  );
  if (decisionsBySceneId.size !== decisions.length) {
    throw new Error('Each incoming scene can have only one import decision.');
  }

  const incomingIds = new Set(incomingScenes.map((scene) => scene.id));
  const unknownDecision = decisions.find(
    (decision) => !incomingIds.has(decision.incomingSceneId),
  );
  if (unknownDecision) {
    throw new Error(
      `Import decision references an unknown scene: ${unknownDecision.incomingSceneId}`,
    );
  }

  const existingById = new Map(
    existingScenes.map((scene) => [scene.id, scene]),
  );
  const occupiedIds = new Set([
    ...existingScenes.map((scene) => scene.id),
    ...incomingScenes.map((scene) => scene.id),
  ]);
  const replacedTargetIds = new Set<string>();
  const plan: SceneImportPlan = {
    additions: [],
    replacements: [],
    skippedSceneIds: [],
  };

  for (const incomingScene of incomingScenes) {
    const decision = decisionsBySceneId.get(incomingScene.id);
    if (!decision) {
      throw new Error(
        `Import decision is required for scene: ${incomingScene.id}`,
      );
    }

    switch (decision.action) {
      case 'add-copy': {
        const id = createUniqueSceneId(occupiedIds, options.createId);
        plan.additions.push({
          incomingSceneId: incomingScene.id,
          scene: cloneSceneAsCopy(incomingScene, id, options.now),
        });
        break;
      }
      case 'replace': {
        const targetSceneId = decision.targetSceneId ?? incomingScene.id;
        const previousScene = existingById.get(targetSceneId);
        if (!previousScene) {
          throw new Error(`Replacement scene does not exist: ${targetSceneId}`);
        }
        if (replacedTargetIds.has(targetSceneId)) {
          throw new Error(
            `A scene cannot be replaced more than once: ${targetSceneId}`,
          );
        }

        replacedTargetIds.add(targetSceneId);
        plan.replacements.push({
          incomingSceneId: incomingScene.id,
          previousScene,
          scene: createReplacement(incomingScene, previousScene, options.now),
          targetSceneId,
        });
        break;
      }
      case 'skip':
        plan.skippedSceneIds.push(incomingScene.id);
        break;
    }
  }

  return plan;
}
