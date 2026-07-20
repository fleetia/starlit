import { describe, expect, it, vi } from 'vitest';

import {
  createTabGroupImportPermissionLease,
  type TabGroupImportPermissionReleaseRequest,
} from './tabGroupImportPermissionLease';

type MessageListener = (message: unknown) => void;
type DisconnectListener = () => void;

function createPort(options: { releaseResults?: boolean[] } = {}): {
  disconnect: ReturnType<typeof vi.fn>;
  disconnectListeners: Set<DisconnectListener>;
  messageListeners: Set<MessageListener>;
  postMessage: ReturnType<typeof vi.fn>;
  port: chrome.runtime.Port;
} {
  const disconnectListeners = new Set<DisconnectListener>();
  const messageListeners = new Set<MessageListener>();
  const releaseResults = [...(options.releaseResults ?? [true])];
  const disconnect = vi.fn(() => {
    disconnectListeners.forEach((listener) => listener());
  });
  const postMessage = vi.fn((message: unknown) => {
    const request = message as Partial<TabGroupImportPermissionReleaseRequest>;

    if (request.type !== 'release' || request.requestId === undefined) {
      return;
    }

    const released = releaseResults.shift();

    if (released !== undefined) {
      messageListeners.forEach((listener) =>
        listener({
          released,
          requestId: request.requestId,
          type: 'release-result',
        }),
      );
    }
  });
  const port = {
    disconnect,
    name: 'starlit-tab-group-import-permission',
    onDisconnect: {
      addListener: (listener: DisconnectListener) =>
        disconnectListeners.add(listener),
      removeListener: (listener: DisconnectListener) =>
        disconnectListeners.delete(listener),
    },
    onMessage: {
      addListener: (listener: MessageListener) =>
        messageListeners.add(listener),
      removeListener: (listener: MessageListener) =>
        messageListeners.delete(listener),
    },
    postMessage,
  } as unknown as chrome.runtime.Port;

  return {
    disconnect,
    disconnectListeners,
    messageListeners,
    port,
    postMessage,
  };
}

describe('tab group import permission lease', () => {
  it('releases through the background port and disconnects after success', async () => {
    const mockPort = createPort();
    const connect = vi.fn(() => mockPort.port);
    Object.defineProperty(chrome.runtime, 'connect', {
      configurable: true,
      value: connect,
    });

    const lease = createTabGroupImportPermissionLease();

    await expect(lease.release()).resolves.toBe(true);
    expect(connect).toHaveBeenCalledWith({
      name: 'starlit-tab-group-import-permission',
    });
    expect(mockPort.postMessage).toHaveBeenCalledWith({
      requestId: 1,
      type: 'release',
    });
    expect(mockPort.disconnect).toHaveBeenCalledOnce();
  });

  it('keeps the port available after a failed release so the user can retry', async () => {
    const mockPort = createPort({ releaseResults: [false, true] });
    Object.defineProperty(chrome.runtime, 'connect', {
      configurable: true,
      value: vi.fn(() => mockPort.port),
    });
    const lease = createTabGroupImportPermissionLease();

    await expect(lease.release()).resolves.toBe(false);
    expect(mockPort.disconnect).not.toHaveBeenCalled();
    await expect(lease.release()).resolves.toBe(true);
    expect(mockPort.disconnect).toHaveBeenCalledOnce();
  });

  it('resolves an in-flight release as failed when the page port disconnects', async () => {
    const mockPort = createPort({ releaseResults: [] });
    Object.defineProperty(chrome.runtime, 'connect', {
      configurable: true,
      value: vi.fn(() => mockPort.port),
    });
    const lease = createTabGroupImportPermissionLease();
    const release = lease.release();

    mockPort.disconnectListeners.forEach((listener) => listener());

    await expect(release).resolves.toBe(false);
  });
});
