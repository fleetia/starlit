import { useState, useEffect, useCallback, useRef } from 'react';

import storage from '../platform/storage/storage';

type StorageArea = 'sync' | 'local';

type SetValueArg<TValue> = TValue | ((prev: TValue) => TValue);

type UseStorageStateReturn<TValue> = {
  value: TValue;
  setValue: (next: SetValueArg<TValue>) => Promise<void>;
  isLoaded: boolean;
};

export function useStorageState<TValue>(
  key: string,
  defaultValue: TValue,
  area: StorageArea = 'sync',
): UseStorageStateReturn<TValue> {
  const [value, setValueState] = useState<TValue>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const valueRef = useRef<TValue>(defaultValue);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const saved = await storage[area].get(key);
        if (saved !== undefined && saved !== null) {
          setValueState(saved as TValue);
          valueRef.current = saved as TValue;
        } else if (area === 'local') {
          const syncData = await storage.sync.get(key);
          if (syncData !== undefined && syncData !== null) {
            setValueState(syncData as TValue);
            valueRef.current = syncData as TValue;
            await storage.local.set({ [key]: syncData });
          }
        }
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, [key, area]);

  const setValue = useCallback(
    async (next: SetValueArg<TValue>): Promise<void> => {
      const resolved =
        typeof next === 'function'
          ? (next as (prev: TValue) => TValue)(valueRef.current)
          : next;
      setValueState(resolved);
      valueRef.current = resolved;
      await storage[area].set({ [key]: resolved });
    },
    [key, area],
  );

  return { value, setValue, isLoaded };
}
