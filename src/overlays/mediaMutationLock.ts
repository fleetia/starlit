const OVERLAY_MEDIA_MUTATION_LOCK_NAME = 'starlit-overlay-media-mutation';

export function withOverlayMediaMutationLock<Result>(
  operation: () => Promise<Result>,
): Promise<Result> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return operation();
  }

  return navigator.locks
    .request<Promise<Result>>(
      OVERLAY_MEDIA_MUTATION_LOCK_NAME,
      { mode: 'exclusive' },
      operation,
    )
    .then((result) => result);
}
