const sync = {
  set: async (items: { [key: string]: unknown }): Promise<void> => {
    if (import.meta.env.DEV) {
      Object.keys(items).forEach((key) =>
        localStorage.setItem(key, JSON.stringify(items[key])),
      );
    } else {
      await chrome.storage.sync.set(items);
    }
  },
  get: async (key: string): Promise<unknown> => {
    if (import.meta.env.DEV) {
      const data = localStorage.getItem(key);
      if (data == null) return data;
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } else {
      const result = await chrome.storage.sync.get(key);
      return result[key];
    }
  },
  remove: async (keys: string | string[]): Promise<void> => {
    const keyList = Array.isArray(keys) ? keys : [keys];

    if (import.meta.env.DEV) {
      keyList.forEach((key) => localStorage.removeItem(key));
      return;
    }

    await chrome.storage.sync.remove(keyList);
  },
};

const local = {
  set: async (items: { [key: string]: unknown }): Promise<void> => {
    if (import.meta.env.DEV) {
      Object.keys(items).forEach((key) =>
        localStorage.setItem(`__local__${key}`, JSON.stringify(items[key])),
      );
    } else {
      await chrome.storage.local.set(items);
    }
  },
  get: async (key: string): Promise<unknown> => {
    if (import.meta.env.DEV) {
      const data = localStorage.getItem(`__local__${key}`);
      if (data == null) return data;
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } else {
      const result = await chrome.storage.local.get(key);
      return result[key];
    }
  },
  remove: async (keys: string | string[]): Promise<void> => {
    const keyList = Array.isArray(keys) ? keys : [keys];

    if (import.meta.env.DEV) {
      keyList.forEach((key) => localStorage.removeItem(`__local__${key}`));
      return;
    }

    await chrome.storage.local.remove(keyList);
  },
};

export default { sync, local };
