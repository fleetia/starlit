import { withExclusiveLock } from '../platform/locks/exclusiveLock';

const OVERLAY_MEDIA_MUTATION_LOCK_NAME = 'starlit-overlay-media-mutation';

export function withOverlayMediaMutationLock<Result>(
  operation: () => Promise<Result>,
): Promise<Result> {
  return withExclusiveLock(OVERLAY_MEDIA_MUTATION_LOCK_NAME, operation);
}
