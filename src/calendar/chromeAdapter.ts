import { createCalendarGateway } from './gateway';
import { normalizeCalendarFeedUrl } from './feedUrl';
import {
  createCalendarMessageListener,
  isCalendarMessageResponse,
  type CalendarMessage,
  type CalendarMessageResponse,
} from './messages';
import type {
  CalendarGateway,
  CalendarHostPermissionPort,
  CalendarStoragePort,
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

function createChromeHostPermissionPort(): CalendarHostPermissionPort {
  return {
    contains: async (originPattern) =>
      chrome.permissions.contains({ origins: [originPattern] }),
  };
}

function hasChromeCalendarApis(): boolean {
  return Boolean(
    typeof chrome !== 'undefined' &&
    typeof chrome.permissions?.contains === 'function' &&
    typeof chrome.runtime?.onMessage?.addListener === 'function' &&
    chrome.storage?.session,
  );
}

export async function requestCalendarFeedPermission(
  feedUrl: string,
): Promise<boolean> {
  const location = normalizeCalendarFeedUrl(feedUrl);
  if (
    !location ||
    typeof chrome === 'undefined' ||
    typeof chrome.permissions?.request !== 'function'
  ) {
    return false;
  }

  try {
    return await chrome.permissions.request({
      origins: [location.originPattern],
    });
  } catch {
    return false;
  }
}

export function createChromeCalendarGateway(): CalendarGateway | null {
  if (!hasChromeCalendarApis()) return null;

  return createCalendarGateway({
    fetch: (url, init) => fetch(url, init),
    hostPermission: createChromeHostPermissionPort(),
    now: () => new Date(),
    sessionStorage: createChromeStoragePort(chrome.storage.session),
  });
}

export function installChromeCalendarMessageHandler(): boolean {
  const gateway = createChromeCalendarGateway();
  if (!gateway) return false;

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
        message: 'Calendar feed access is unavailable.',
      },
      ok: false,
      requestType: message.type,
      type: 'calendar.error',
    };
  }

  try {
    const response: unknown = await chrome.runtime.sendMessage(message);
    if (isCalendarMessageResponse(response)) return response;
  } catch {
    // Use the same unavailable result for worker startup and messaging failures.
  }

  return {
    error: {
      code: 'unavailable',
      message: 'Calendar feed access is unavailable.',
    },
    ok: false,
    requestType: message.type,
    type: 'calendar.error',
  };
}
