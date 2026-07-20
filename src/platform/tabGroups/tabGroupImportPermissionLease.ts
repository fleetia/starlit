export const TAB_GROUP_IMPORT_PERMISSION_PORT_NAME =
  'starlit-tab-group-import-permission';

export type TabGroupImportPermissionReleaseRequest = {
  requestId: number;
  type: 'release';
};

export type TabGroupImportPermissionReleaseResult = {
  released: boolean;
  requestId: number;
  type: 'release-result';
};

export type TabGroupImportPermissionHeartbeat = {
  type: 'heartbeat';
};

export type TabGroupImportPermissionLease = {
  dispose: () => void;
  release: () => Promise<boolean>;
};

export function isTabGroupImportPermissionReleaseRequest(
  value: unknown,
): value is TabGroupImportPermissionReleaseRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const message = value as Record<string, unknown>;
  return message.type === 'release' && typeof message.requestId === 'number';
}

function isTabGroupImportPermissionReleaseResult(
  value: unknown,
): value is TabGroupImportPermissionReleaseResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const message = value as Record<string, unknown>;
  return (
    message.type === 'release-result' &&
    typeof message.requestId === 'number' &&
    typeof message.released === 'boolean'
  );
}

export function createTabGroupImportPermissionLease(): TabGroupImportPermissionLease {
  if (typeof chrome === 'undefined' || !chrome.runtime?.connect) {
    throw new Error('Chrome runtime ports are unavailable');
  }

  const port = chrome.runtime.connect({
    name: TAB_GROUP_IMPORT_PERMISSION_PORT_NAME,
  });
  const pendingRequests = new Map<number, (released: boolean) => void>();
  let isDisposed = false;
  let nextRequestId = 1;
  let releasePromise: Promise<boolean> | null = null;

  function resolvePendingRequests(released: boolean): void {
    pendingRequests.forEach((resolveRequest) => resolveRequest(released));
    pendingRequests.clear();
  }

  function handleMessage(message: unknown): void {
    if (!isTabGroupImportPermissionReleaseResult(message)) {
      return;
    }

    const resolveRequest = pendingRequests.get(message.requestId);
    pendingRequests.delete(message.requestId);
    resolveRequest?.(message.released);
  }

  function handleDisconnect(): void {
    isDisposed = true;
    resolvePendingRequests(false);
  }

  function dispose(): void {
    if (isDisposed) {
      return;
    }

    isDisposed = true;
    port.onMessage.removeListener(handleMessage);
    port.onDisconnect.removeListener(handleDisconnect);
    resolvePendingRequests(false);
    port.disconnect();
  }

  function requestRelease(): Promise<boolean> {
    if (isDisposed) {
      return Promise.resolve(false);
    }

    const requestId = nextRequestId;
    nextRequestId += 1;

    return new Promise<boolean>((resolveRequest) => {
      pendingRequests.set(requestId, resolveRequest);

      try {
        const message: TabGroupImportPermissionReleaseRequest = {
          requestId,
          type: 'release',
        };
        port.postMessage(message);
      } catch {
        pendingRequests.delete(requestId);
        resolveRequest(false);
      }
    });
  }

  async function release(): Promise<boolean> {
    if (releasePromise) {
      return releasePromise;
    }

    releasePromise = requestRelease().then((released) => {
      releasePromise = null;

      if (released) {
        dispose();
      }

      return released;
    });

    return releasePromise;
  }

  port.onMessage.addListener(handleMessage);
  port.onDisconnect.addListener(handleDisconnect);

  return { dispose, release };
}
