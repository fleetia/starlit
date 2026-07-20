const lockQueues = new Map<string, Promise<void>>();

function runInQueue<Result>(
  name: string,
  operation: () => Promise<Result>,
): Promise<Result> {
  const result = (lockQueues.get(name) ?? Promise.resolve()).then(operation);
  const tail = result.then(
    () => undefined,
    () => undefined,
  );
  lockQueues.set(name, tail);
  void tail.then(() => {
    if (lockQueues.get(name) === tail) {
      lockQueues.delete(name);
    }
  });
  return result;
}

export function withExclusiveLock<Result>(
  name: string,
  operation: () => Promise<Result>,
): Promise<Result> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks
      .request<Promise<Result>>(name, { mode: 'exclusive' }, operation)
      .then((result) => result);
  }

  return runInQueue(name, operation);
}
