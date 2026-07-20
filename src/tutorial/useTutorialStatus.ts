import { useCallback, useEffect, useState } from 'react';

import storage from '../platform/storage/storage';

export type TutorialStatus = 'pending' | 'completed';

type UseTutorialStatusReturn = {
  complete: () => Promise<void>;
  isLoaded: boolean;
  status: TutorialStatus | null;
};

const STORAGE_KEY = 'tutorialStatus';

function isTutorialStatus(value: unknown): value is TutorialStatus {
  return value === 'pending' || value === 'completed';
}

export function useTutorialStatus(): UseTutorialStatusReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [status, setStatus] = useState<TutorialStatus | null>(null);

  useEffect(() => {
    let isActive = true;
    let hasStorageChange = false;
    const storageChanges =
      typeof chrome !== 'undefined' ? chrome.storage?.onChanged : undefined;

    function handleStorageChange(
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ): void {
      if (areaName !== 'local' || !(STORAGE_KEY in changes)) {
        return;
      }

      hasStorageChange = true;
      const nextStatus = changes[STORAGE_KEY]?.newValue;
      setStatus(isTutorialStatus(nextStatus) ? nextStatus : null);
      setIsLoaded(true);
    }

    storageChanges?.addListener(handleStorageChange);

    void storage.local
      .get(STORAGE_KEY)
      .then((storedStatus) => {
        if (!isActive || hasStorageChange) {
          return;
        }

        setStatus(isTutorialStatus(storedStatus) ? storedStatus : null);
        setIsLoaded(true);
      })
      .catch(() => {
        if (!isActive || hasStorageChange) {
          return;
        }

        setStatus(null);
        setIsLoaded(true);
      });

    return () => {
      isActive = false;
      storageChanges?.removeListener(handleStorageChange);
    };
  }, []);

  const complete = useCallback(async (): Promise<void> => {
    await storage.local.set({ [STORAGE_KEY]: 'completed' });
    setStatus('completed');
  }, []);

  return { complete, isLoaded, status };
}
