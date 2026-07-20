import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  attachTabGroupImportPermissionCoordinator,
  type TabGroupImportCoordinatorPort,
} from './tabGroupImportPermissionCoordinator';

type MessageListener = (message: unknown) => void;
type DisconnectListener = () => void;

function createPort(): {
  disconnect: () => void;
  messages: unknown[];
  port: TabGroupImportCoordinatorPort;
  send: (message: unknown) => void;
} {
  const disconnectListeners = new Set<DisconnectListener>();
  const messageListeners = new Set<MessageListener>();
  const messages: unknown[] = [];
  const port: TabGroupImportCoordinatorPort = {
    name: 'starlit-tab-group-import-permission',
    onDisconnect: {
      addListener: (listener) => disconnectListeners.add(listener),
    },
    onMessage: {
      addListener: (listener) => messageListeners.add(listener),
    },
    postMessage: (message) => messages.push(message),
  };

  return {
    disconnect: () => disconnectListeners.forEach((listener) => listener()),
    messages,
    port,
    send: (message) =>
      messageListeners.forEach((listener) => listener(message)),
  };
}

function createCoordinator(): {
  connect: (port: TabGroupImportCoordinatorPort) => void;
  containsTabsPermission: ReturnType<typeof vi.fn>;
  heartbeat: () => void;
  permissionAdded: (permissions: chrome.permissions.Permissions) => void;
  removeTabsPermission: ReturnType<typeof vi.fn>;
  setHasTabsPermission: (hasPermission: boolean) => void;
} {
  let connect = (_port: TabGroupImportCoordinatorPort): void => undefined;
  let hasTabsPermission = false;
  let heartbeat = (): void => undefined;
  let permissionAdded = (_permissions: chrome.permissions.Permissions): void =>
    undefined;
  const containsTabsPermission = vi.fn(async () => hasTabsPermission);
  const removeTabsPermission = vi.fn(async () => {
    hasTabsPermission = false;
    return true;
  });

  attachTabGroupImportPermissionCoordinator({
    containsTabsPermission,
    deferRelease: async () => undefined,
    onPermissionAdded: (listener) => {
      permissionAdded = listener;
    },
    onPortConnected: (listener) => {
      connect = listener;
    },
    removeTabsPermission,
    startHeartbeat: (sendHeartbeat) => {
      heartbeat = sendHeartbeat;
      return () => {
        heartbeat = (): void => undefined;
      };
    },
  });

  return {
    connect: (port) => connect(port),
    containsTabsPermission,
    heartbeat: () => heartbeat(),
    permissionAdded: (permissions) => permissionAdded(permissions),
    removeTabsPermission,
    setHasTabsPermission: (hasPermission) => {
      hasTabsPermission = hasPermission;
    },
  };
}

beforeEach((): void => {
  vi.clearAllMocks();
});

describe('tab group import permission coordinator', () => {
  it('keeps tabs access until the last active import disconnects', async () => {
    const coordinator = createCoordinator();
    await vi.waitFor(() =>
      expect(coordinator.containsTabsPermission).toHaveBeenCalledOnce(),
    );
    coordinator.containsTabsPermission.mockClear();
    coordinator.setHasTabsPermission(true);
    const first = createPort();
    const second = createPort();
    coordinator.connect(first.port);
    coordinator.connect(second.port);

    first.send({ requestId: 1, type: 'release' });
    await vi.waitFor(() => expect(first.messages).toHaveLength(1));

    expect(coordinator.removeTabsPermission).not.toHaveBeenCalled();
    first.disconnect();
    expect(coordinator.removeTabsPermission).not.toHaveBeenCalled();

    second.disconnect();
    await vi.waitFor(() =>
      expect(coordinator.removeTabsPermission).toHaveBeenCalledOnce(),
    );
  });

  it('sends keepalive messages from the service worker while imports are active', async () => {
    const coordinator = createCoordinator();
    await vi.waitFor(() =>
      expect(coordinator.containsTabsPermission).toHaveBeenCalledOnce(),
    );
    const session = createPort();
    coordinator.connect(session.port);

    coordinator.heartbeat();
    expect(session.messages).toEqual([{ type: 'heartbeat' }]);

    session.disconnect();
    coordinator.heartbeat();
    expect(session.messages).toHaveLength(1);
  });

  it.each(['disconnect-first', 'permission-first'] as const)(
    'removes an orphaned grant when events arrive %s',
    async (order) => {
      const coordinator = createCoordinator();
      await vi.waitFor(() =>
        expect(coordinator.containsTabsPermission).toHaveBeenCalledOnce(),
      );
      coordinator.containsTabsPermission.mockClear();
      const session = createPort();
      coordinator.connect(session.port);

      if (order === 'disconnect-first') {
        session.disconnect();
        coordinator.setHasTabsPermission(true);
        coordinator.permissionAdded({ permissions: ['tabs', 'tabGroups'] });
      } else {
        coordinator.setHasTabsPermission(true);
        coordinator.permissionAdded({ permissions: ['tabs', 'tabGroups'] });
        session.disconnect();
      }

      await vi.waitFor(() =>
        expect(coordinator.removeTabsPermission).toHaveBeenCalledOnce(),
      );
    },
  );

  it('does not remove access when a new import connects during cleanup', async () => {
    let resolveContains: (hasPermission: boolean) => void = () => undefined;
    const coordinator = createCoordinator();
    await vi.waitFor(() =>
      expect(coordinator.containsTabsPermission).toHaveBeenCalledOnce(),
    );
    coordinator.containsTabsPermission.mockClear();
    coordinator.containsTabsPermission.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolvePermission) => {
          resolveContains = resolvePermission;
        }),
    );
    coordinator.setHasTabsPermission(true);
    const first = createPort();
    const second = createPort();
    coordinator.connect(first.port);
    first.send({ requestId: 1, type: 'release' });
    await vi.waitFor(() =>
      expect(coordinator.containsTabsPermission).toHaveBeenCalledOnce(),
    );

    coordinator.connect(second.port);
    resolveContains(true);
    await vi.waitFor(() => expect(first.messages).toHaveLength(1));

    expect(coordinator.removeTabsPermission).not.toHaveBeenCalled();
    second.disconnect();
    await vi.waitFor(() =>
      expect(coordinator.removeTabsPermission).toHaveBeenCalledOnce(),
    );
  });

  it('reports removal failure and retries on the same released port', async () => {
    const coordinator = createCoordinator();
    await vi.waitFor(() =>
      expect(coordinator.containsTabsPermission).toHaveBeenCalledOnce(),
    );
    coordinator.containsTabsPermission.mockClear();
    coordinator.setHasTabsPermission(true);
    coordinator.removeTabsPermission
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const session = createPort();
    coordinator.connect(session.port);

    session.send({ requestId: 1, type: 'release' });
    await vi.waitFor(() => expect(session.messages).toHaveLength(1));
    expect(session.messages[0]).toEqual({
      released: false,
      requestId: 1,
      type: 'release-result',
    });

    session.send({ requestId: 2, type: 'release' });
    await vi.waitFor(() => expect(session.messages).toHaveLength(2));
    expect(session.messages[1]).toEqual({
      released: true,
      requestId: 2,
      type: 'release-result',
    });
  });
});
