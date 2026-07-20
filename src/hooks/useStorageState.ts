import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { withExclusiveLock } from '../platform/locks/exclusiveLock';
import storage from '../platform/storage/storage';

type StorageArea = 'sync' | 'local';

type SetValueArg<TValue> = TValue | ((prev: TValue) => TValue);

export type StorageDecoder<TValue> = (
  rawValue: unknown,
  fallback: TValue,
) => TValue;

type UseStorageStateReturn<TValue> = {
  value: TValue;
  setValue: (next: SetValueArg<TValue>) => Promise<void>;
  isLoaded: boolean;
};

function withStorageMutationLock<Result>(
  area: StorageArea,
  key: string,
  operation: () => Promise<Result>,
): Promise<Result> {
  return withExclusiveLock(`starlit-storage:${area}:${key}`, operation);
}

function reportStorageError(error: unknown): void {
  if (typeof globalThis.reportError === 'function') {
    globalThis.reportError(error);
  }
}

function decodeStoredValue<TValue>(
  rawValue: unknown,
  fallback: TValue,
  decode: StorageDecoder<TValue>,
): TValue {
  try {
    return decode(rawValue, fallback);
  } catch (error) {
    reportStorageError(error);
    return fallback;
  }
}

export function useStorageState<TValue>(
  key: string,
  defaultValue: TValue,
  decode: StorageDecoder<TValue>,
  area: StorageArea = 'sync',
): UseStorageStateReturn<TValue> {
  const [value, setValueState] = useState<TValue>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const scope = useMemo(() => ({ area, key }), [area, key]);
  const activeScopeRef = useRef(scope);
  const valueRef = useRef<TValue>(defaultValue);
  const defaultValueRef = useRef(defaultValue);
  const decoderRef = useRef(decode);
  const isMountedRef = useRef(false);
  const storageChangeRevisionRef = useRef(0);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    defaultValueRef.current = defaultValue;
    decoderRef.current = decode;
  }, [decode, defaultValue]);

  useEffect(() => {
    activeScopeRef.current = scope;
  }, [scope]);

  useEffect(() => {
    let isActive = true;
    const loadRevision = storageChangeRevisionRef.current;

    const loadStoredValue = async (): Promise<unknown> => {
      if (area !== 'local') {
        return storage[area].get(key);
      }

      return withStorageMutationLock(area, key, async (): Promise<unknown> => {
        const localValue = await storage.local.get(key);
        if (localValue !== undefined && localValue !== null) {
          return localValue;
        }

        const syncValue = await storage.sync.get(key);
        if (syncValue === undefined || syncValue === null) {
          return localValue;
        }

        const migratedValue = decodeStoredValue(
          syncValue,
          defaultValueRef.current,
          decoderRef.current,
        );
        try {
          await storage.local.set({ [key]: migratedValue });
        } catch (error) {
          reportStorageError(error);
        }
        return migratedValue;
      });
    };

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      changedArea: string,
    ): void => {
      if (!isActive || changedArea !== area || !Object.hasOwn(changes, key)) {
        return;
      }

      storageChangeRevisionRef.current += 1;
      const nextValue = decodeStoredValue(
        changes[key]?.newValue,
        defaultValueRef.current,
        decoderRef.current,
      );
      valueRef.current = nextValue;
      setValueState(nextValue);
    };

    const canSubscribe =
      typeof chrome !== 'undefined' && chrome.storage?.onChanged !== undefined;
    if (canSubscribe) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }

    const load = async (): Promise<void> => {
      try {
        const saved = await loadStoredValue();

        if (isActive && storageChangeRevisionRef.current === loadRevision) {
          const nextValue = decodeStoredValue(
            saved,
            defaultValueRef.current,
            decoderRef.current,
          );
          valueRef.current = nextValue;
          setValueState(nextValue);
        }
      } catch (error) {
        reportStorageError(error);
      } finally {
        if (isActive) {
          setIsLoaded(true);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
      if (canSubscribe) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, [area, key]);

  const setValue = useCallback(
    async (next: SetValueArg<TValue>): Promise<void> => {
      const operationDecoder = decoderRef.current;
      const operationFallback = defaultValueRef.current;
      const operation = writeQueueRef.current.then(() =>
        withStorageMutationLock(area, key, async (): Promise<void> => {
          const currentValue =
            typeof next === 'function'
              ? decodeStoredValue(
                  await storage[area].get(key),
                  operationFallback,
                  operationDecoder,
                )
              : valueRef.current;
          const resolved =
            typeof next === 'function'
              ? (next as (prev: TValue) => TValue)(currentValue)
              : next;
          const commitRevision = storageChangeRevisionRef.current;
          await storage[area].set({ [key]: resolved });

          if (
            isMountedRef.current &&
            activeScopeRef.current === scope &&
            storageChangeRevisionRef.current === commitRevision
          ) {
            storageChangeRevisionRef.current += 1;
            valueRef.current = resolved;
            setValueState(resolved);
          }
        }),
      );
      writeQueueRef.current = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
    [area, key, scope],
  );

  return { value, setValue, isLoaded };
}
