import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  SCENE_STORAGE_SCHEMA_VERSION,
  type SceneCollectionV3,
  type ScenePresetV1,
} from './types';
import {
  sceneRuntime,
  type CreateSceneOptions,
  type DeleteSceneOptions,
  type DuplicateSceneOptions,
  type SceneRelinkInput,
  type SceneRuntime,
  type SceneRuntimeSnapshot,
  type UpdateSceneOptions,
} from './runtime';
import type { SceneReadiness } from './readiness';

const EMPTY_SCENE_COLLECTION: SceneCollectionV3 = {
  activeSceneId: null,
  scenes: [],
  storageSchemaVersion: SCENE_STORAGE_SCHEMA_VERSION,
};

export type UseScenesReturn = {
  activeScene: ScenePresetV1 | null;
  activeSceneId: string | null;
  applyScene: (sceneId: string) => Promise<SceneCollectionV3>;
  createScene: (
    snapshot: SceneRuntimeSnapshot,
    options: CreateSceneOptions,
  ) => Promise<SceneCollectionV3>;
  deleteScene: (
    sceneId: string,
    options?: DeleteSceneOptions,
  ) => Promise<SceneCollectionV3>;
  duplicateScene: (
    sceneId: string,
    options: DuplicateSceneOptions,
  ) => Promise<SceneCollectionV3>;
  error: Error | null;
  getReadiness: (sceneId: string) => Promise<SceneReadiness>;
  isLoaded: boolean;
  isProcessing: boolean;
  relinkScene: (
    sceneId: string,
    input: SceneRelinkInput,
  ) => Promise<SceneCollectionV3>;
  reload: () => Promise<SceneCollectionV3>;
  restoreScene: (sceneId: string) => Promise<SceneCollectionV3>;
  scenes: ScenePresetV1[];
  updateScene: (
    sceneId: string,
    snapshot: SceneRuntimeSnapshot,
    options?: UpdateSceneOptions,
  ) => Promise<SceneCollectionV3>;
};

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export function useScenes(
  runtime: SceneRuntime = sceneRuntime,
): UseScenesReturn {
  const [collection, setCollection] = useState<SceneCollectionV3>(
    EMPTY_SCENE_COLLECTION,
  );
  const [error, setError] = useState<Error | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isMountedRef = useRef(true);
  const pendingCountRef = useRef(0);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const reload = useCallback(async (): Promise<SceneCollectionV3> => {
    try {
      const next = await runtime.load();
      if (isMountedRef.current) {
        setCollection(next);
        setError(null);
        setIsLoaded(true);
      }
      return next;
    } catch (loadError) {
      if (isMountedRef.current) {
        setError(toError(loadError));
        setIsLoaded(true);
      }
      throw loadError;
    }
  }, [runtime]);

  useEffect(() => {
    void reload().catch(() => undefined);
  }, [reload]);

  const runMutation = useCallback(
    (
      operation: () => Promise<SceneCollectionV3>,
    ): Promise<SceneCollectionV3> => {
      pendingCountRef.current += 1;
      if (isMountedRef.current) {
        setIsProcessing(true);
        setError(null);
      }

      const result = mutationQueueRef.current
        .catch(() => undefined)
        .then(operation);
      mutationQueueRef.current = result.then(
        () => undefined,
        () => undefined,
      );

      return result
        .then((next) => {
          if (isMountedRef.current) {
            setCollection(next);
          }
          return next;
        })
        .catch(async (mutationError: unknown) => {
          try {
            const persisted = await runtime.load();
            if (isMountedRef.current) {
              setCollection(persisted);
            }
          } catch {
            // The original mutation failure remains the actionable error.
          }
          if (isMountedRef.current) {
            setError(toError(mutationError));
          }
          throw mutationError;
        })
        .finally(() => {
          pendingCountRef.current -= 1;
          if (isMountedRef.current && pendingCountRef.current === 0) {
            setIsProcessing(false);
          }
        });
    },
    [runtime],
  );

  const createScene = useCallback(
    (
      snapshot: SceneRuntimeSnapshot,
      options: CreateSceneOptions,
    ): Promise<SceneCollectionV3> =>
      runMutation(() => runtime.createScene(snapshot, options)),
    [runMutation, runtime],
  );
  const updateScene = useCallback(
    (
      sceneId: string,
      snapshot: SceneRuntimeSnapshot,
      options?: UpdateSceneOptions,
    ): Promise<SceneCollectionV3> =>
      runMutation(() => runtime.updateScene(sceneId, snapshot, options)),
    [runMutation, runtime],
  );
  const duplicateScene = useCallback(
    (
      sceneId: string,
      options: DuplicateSceneOptions,
    ): Promise<SceneCollectionV3> =>
      runMutation(() => runtime.duplicateScene(sceneId, options)),
    [runMutation, runtime],
  );
  const deleteScene = useCallback(
    (
      sceneId: string,
      options?: DeleteSceneOptions,
    ): Promise<SceneCollectionV3> =>
      runMutation(() => runtime.deleteScene(sceneId, options)),
    [runMutation, runtime],
  );
  const applyScene = useCallback(
    (sceneId: string): Promise<SceneCollectionV3> =>
      runMutation(() => runtime.applyScene(sceneId)),
    [runMutation, runtime],
  );
  const relinkScene = useCallback(
    (sceneId: string, input: SceneRelinkInput): Promise<SceneCollectionV3> =>
      runMutation(() => runtime.relinkScene(sceneId, input)),
    [runMutation, runtime],
  );
  const restoreScene = useCallback(
    (sceneId: string): Promise<SceneCollectionV3> =>
      runMutation(() => runtime.restoreScene(sceneId)),
    [runMutation, runtime],
  );
  const getReadinessForId = useCallback(
    (sceneId: string): Promise<SceneReadiness> => runtime.getReadiness(sceneId),
    [runtime],
  );
  const activeScene = useMemo(
    () =>
      collection.scenes.find(
        (scene) => scene.id === collection.activeSceneId,
      ) ?? null,
    [collection],
  );

  return {
    activeScene,
    activeSceneId: collection.activeSceneId,
    applyScene,
    createScene,
    deleteScene,
    duplicateScene,
    error,
    getReadiness: getReadinessForId,
    isLoaded,
    isProcessing,
    relinkScene,
    reload,
    restoreScene,
    scenes: collection.scenes,
    updateScene,
  };
}
