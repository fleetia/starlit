import { createCalendarGateway } from './gateway';
import {
  createCalendarMessageListener,
  isCalendarMessageResponse,
  type CalendarMessage,
  type CalendarMessageResponse,
} from './messages';
import {
  GOOGLE_CALENDAR_HOST_PERMISSION,
  type CalendarGateway,
  type CalendarHostPermissionPort,
  type CalendarIdentityPort,
  type CalendarStoragePort,
} from './types';

function createChromeStoragePort(
  storageArea: chrome.storage.StorageArea,
): CalendarStoragePort {
  return {
    get: async (key) => storageArea.get(key),
    remove: async (keys) => storageArea.remove(keys),
    set: async (items) => storageArea.set(items),
  };
}

function createChromeIdentityPort(): CalendarIdentityPort {
  return {
    getAuthToken: async (details) => chrome.identity.getAuthToken(details),
    removeCachedAuthToken: async (details) =>
      chrome.identity.removeCachedAuthToken(details),
  };
}

function createChromeHostPermissionPort(): CalendarHostPermissionPort {
  const permission = { origins: [GOOGLE_CALENDAR_HOST_PERMISSION] };

  return {
    contains: async () => chrome.permissions.contains(permission),
    remove: async () => chrome.permissions.remove(permission),
    request: async () => chrome.permissions.request(permission),
  };
}

function hasChromeCalendarApis(): boolean {
  return Boolean(
    typeof chrome !== 'undefined' &&
    typeof chrome.identity?.getAuthToken === 'function' &&
    typeof chrome.identity?.removeCachedAuthToken === 'function' &&
    typeof chrome.permissions?.contains === 'function' &&
    typeof chrome.permissions?.remove === 'function' &&
    typeof chrome.permissions?.request === 'function' &&
    typeof chrome.runtime?.onMessage?.addListener === 'function' &&
    chrome.storage?.local &&
    chrome.storage?.session,
  );
}

export function createChromeCalendarGateway(): CalendarGateway | null {
  if (!hasChromeCalendarApis()) {
    return null;
  }

  return createCalendarGateway({
    fetch: (url, init) => fetch(url, init),
    hostPermission: createChromeHostPermissionPort(),
    identity: createChromeIdentityPort(),
    localStorage: createChromeStoragePort(chrome.storage.local),
    now: () => new Date(),
    sessionStorage: createChromeStoragePort(chrome.storage.session),
  });
}

export function installChromeCalendarMessageHandler(): boolean {
  const gateway = createChromeCalendarGateway();
  if (!gateway) {
    return false;
  }

  const listener = createCalendarMessageListener(gateway);
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) =>
    listener(message, sender, (response) => sendResponse(response)),
  );
  return true;
}

export async function sendCalendarMessage(
  message: CalendarMessage,
): Promise<CalendarMessageResponse> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return {
      error: {
        code: 'unavailable',
        message: 'Google Calendar APIs are unavailable.',
      },
      ok: false,
      requestType: message.type,
      type: 'calendar.error',
    };
  }

  let response: unknown;

  try {
    response = await chrome.runtime.sendMessage(message);
  } catch {
    return {
      error: {
        code: 'unavailable',
        message: 'Google Calendar APIs are unavailable.',
      },
      ok: false,
      requestType: message.type,
      type: 'calendar.error',
    };
  }

  if (isCalendarMessageResponse(response)) {
    return response;
  }

  return {
    error: {
      code: 'invalid-response',
      message: 'Google Calendar returned an invalid response.',
    },
    ok: false,
    requestType: message.type,
    type: 'calendar.error',
  };
}
