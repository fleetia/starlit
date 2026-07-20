import {
  isTabGroupImportPermissionReleaseRequest,
  TAB_GROUP_IMPORT_PERMISSION_PORT_NAME,
  type TabGroupImportPermissionHeartbeat,
  type TabGroupImportPermissionReleaseResult,
} from '../platform/tabGroups/tabGroupImportPermissionLease';

type CoordinatorEvent<Listener> = {
  addListener: (listener: Listener) => void;
};

export type TabGroupImportCoordinatorPort = {
  name: string;
  onDisconnect: CoordinatorEvent<() => void>;
  onMessage: CoordinatorEvent<(message: unknown) => void>;
  postMessage: (
    message:
      | TabGroupImportPermissionHeartbeat
      | TabGroupImportPermissionReleaseResult,
  ) => void;
};

type CoordinatorOptions = {
  containsTabsPermission: () => Promise<boolean>;
  deferRelease: () => Promise<void>;
  onPermissionAdded: (
    listener: (permissions: chrome.permissions.Permissions) => void,
  ) => void;
  onPortConnected: (
    listener: (port: TabGroupImportCoordinatorPort) => void,
  ) => void;
  removeTabsPermission: () => Promise<boolean>;
  startHeartbeat: (sendHeartbeat: () => void) => () => void;
};

export function attachTabGroupImportPermissionCoordinator({
  containsTabsPermission,
  deferRelease,
  onPermissionAdded,
  onPortConnected,
  removeTabsPermission,
  startHeartbeat,
}: CoordinatorOptions): void {
  const activePorts = new Set<TabGroupImportCoordinatorPort>();
  let leaseGeneration = 0;
  let releaseQueue = Promise.resolve(true);
  let stopHeartbeat: (() => void) | null = null;

  function hasActiveImport(): boolean {
    return activePorts.size > 0;
  }

  function syncHeartbeat(): void {
    if (hasActiveImport() && !stopHeartbeat) {
      stopHeartbeat = startHeartbeat(() => {
        let removedPort = false;

        activePorts.forEach((port) => {
          try {
            port.postMessage({ type: 'heartbeat' });
          } catch {
            removedPort = activePorts.delete(port) || removedPort;
          }
        });

        if (removedPort) {
          leaseGeneration += 1;
          syncHeartbeat();
          void releaseTabsPermissionWhenIdle();
        }
      });
      return;
    }

    if (!hasActiveImport() && stopHeartbeat) {
      stopHeartbeat();
      stopHeartbeat = null;
    }
  }

  function releaseTabsPermissionWhenIdle(): Promise<boolean> {
    const release = releaseQueue.then(async () => {
      const releaseGeneration = leaseGeneration;
      await deferRelease();

      if (hasActiveImport() || releaseGeneration !== leaseGeneration) {
        return true;
      }

      try {
        const hasPermission = await containsTabsPermission();

        if (
          !hasPermission ||
          hasActiveImport() ||
          releaseGeneration !== leaseGeneration
        ) {
          return true;
        }

        await deferRelease();

        if (hasActiveImport() || releaseGeneration !== leaseGeneration) {
          return true;
        }

        return await removeTabsPermission();
      } catch {
        return false;
      }
    });

    releaseQueue = release.catch(() => false);
    return release;
  }

  onPortConnected((port) => {
    if (port.name !== TAB_GROUP_IMPORT_PERMISSION_PORT_NAME) {
      return;
    }

    activePorts.add(port);
    leaseGeneration += 1;
    syncHeartbeat();

    port.onMessage.addListener((message) => {
      if (!isTabGroupImportPermissionReleaseRequest(message)) {
        return;
      }

      if (activePorts.delete(port)) {
        leaseGeneration += 1;
        syncHeartbeat();
      }

      void releaseTabsPermissionWhenIdle().then((released) => {
        try {
          port.postMessage({
            released,
            requestId: message.requestId,
            type: 'release-result',
          });
        } catch {
          // The page disconnected while cleanup was finishing.
        }
      });
    });

    port.onDisconnect.addListener(() => {
      if (activePorts.delete(port)) {
        leaseGeneration += 1;
        syncHeartbeat();
      }
      void releaseTabsPermissionWhenIdle();
    });
  });

  onPermissionAdded((permissions) => {
    if (permissions.permissions?.includes('tabs') && !hasActiveImport()) {
      void releaseTabsPermissionWhenIdle();
    }
  });

  void releaseTabsPermissionWhenIdle();
}

export function installTabGroupImportPermissionCoordinator(): void {
  if (
    typeof chrome === 'undefined' ||
    !chrome.runtime?.onConnect?.addListener ||
    !chrome.permissions?.contains ||
    !chrome.permissions?.onAdded?.addListener ||
    !chrome.permissions?.remove
  ) {
    return;
  }

  attachTabGroupImportPermissionCoordinator({
    containsTabsPermission: () =>
      chrome.permissions.contains({ permissions: ['tabs'] }),
    deferRelease: () =>
      new Promise((resolveRelease) => setTimeout(resolveRelease, 0)),
    onPermissionAdded: (listener) =>
      chrome.permissions.onAdded.addListener(listener),
    onPortConnected: (listener) =>
      chrome.runtime.onConnect.addListener(listener),
    removeTabsPermission: async () => {
      await chrome.permissions.remove({ permissions: ['tabs'] });
      return !(await chrome.permissions.contains({ permissions: ['tabs'] }));
    },
    startHeartbeat: (sendHeartbeat) => {
      const heartbeatId = setInterval(sendHeartbeat, 20_000);
      return () => clearInterval(heartbeatId);
    },
  });
}
