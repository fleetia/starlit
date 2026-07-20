import { access, cp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  chromium,
  test as base,
  type BrowserContext,
  type Page,
  type TestInfo,
  type Worker,
} from '@playwright/test';

export { expect } from '@playwright/test';

type StorageSeed = {
  local?: Record<string, unknown>;
  sync?: Record<string, unknown>;
};

export type BookmarkSeed = {
  children?: BookmarkSeed[];
  title: string;
  url?: string;
};

export type IndexedDbSeed = {
  base64: string;
  databaseName: string;
  key: string;
  mimeType: string;
  storeName: string;
};

export type ProfileSeed = StorageSeed & {
  bookmarkRoots?: BookmarkSeed[][];
  indexedDb?: IndexedDbSeed[];
};

type ExtensionHarness = {
  backgroundVideo: Buffer;
  context: BrowserContext;
  extensionId: string;
  getFontStylesheetRequestCount: () => number;
  openNewTab: () => Promise<Page>;
  readIndexedDbBlobBase64: (
    databaseName: string,
    storeName: string,
    key: string,
  ) => Promise<string | null>;
  readIndexedDbBlobText: (
    databaseName: string,
    storeName: string,
    key: string,
  ) => Promise<string | null>;
  readStorage: (area: 'local' | 'sync') => Promise<Record<string, unknown>>;
  seedProfile: (seed?: ProfileSeed) => Promise<void>;
  serviceWorker: Worker;
};

type ExtensionFixtures = {
  extension: ExtensionHarness;
};

type ExtensionOptions = {
  pregrantTabGroupPermissions: boolean;
};

type ExtensionManifest = {
  optional_permissions?: string[];
  permissions?: string[];
};

const EXTENSION_PATH = resolve(process.cwd(), 'dist');
const TEST_FONT_ROMAN_PATH = resolve(
  process.cwd(),
  'node_modules/@ibm/plex-sans-variable/fonts/complete/woff2/IBM Plex Sans Var-Roman.woff2',
);
const TEST_FONT_ITALIC_PATH = resolve(
  process.cwd(),
  'node_modules/@ibm/plex-sans-variable/fonts/complete/woff2/IBM Plex Sans Var-Italic.woff2',
);
const TEST_FONT_ROMAN_URL =
  'https://fonts.gstatic.com/starlit/ibm-plex-sans-variable-roman-0.2.0.woff2';
const TEST_FONT_ITALIC_URL =
  'https://fonts.gstatic.com/starlit/ibm-plex-sans-variable-italic-0.2.0.woff2';
const TEST_FONT_CSS = `
  @font-face {
    font-family: 'IBM Plex Sans';
    font-style: normal;
    font-stretch: 75% 100%;
    font-weight: 100 700;
    font-display: block;
    src: url('${TEST_FONT_ROMAN_URL}') format('woff2');
  }
  @font-face {
    font-family: 'IBM Plex Sans';
    font-style: italic;
    font-stretch: 75% 100%;
    font-weight: 100 700;
    font-display: block;
    src: url('${TEST_FONT_ITALIC_URL}') format('woff2');
  }
`;
const TEST_BACKGROUND_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  'base64',
);
const TEST_BACKGROUND_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=',
  'base64',
);
const STABLE_FAVICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
    <rect width="16" height="16" fill="#5f5a32" />
    <rect x="4" y="4" width="8" height="8" fill="#fffaf0" />
  </svg>
`;

async function getExtensionPath(
  pregrantTabGroupPermissions: boolean,
  testInfo: TestInfo,
): Promise<string> {
  if (!pregrantTabGroupPermissions) {
    return EXTENSION_PATH;
  }

  const extensionPath = testInfo.outputPath('extension');
  await cp(EXTENSION_PATH, extensionPath, { recursive: true });
  const manifestPath = resolve(extensionPath, 'manifest.json');
  const manifest = JSON.parse(
    await readFile(manifestPath, 'utf8'),
  ) as ExtensionManifest;
  const pregrantedPermissions = new Set([
    ...(manifest.permissions ?? []),
    'tabs',
    'tabGroups',
  ]);

  manifest.permissions = [...pregrantedPermissions];
  manifest.optional_permissions = (manifest.optional_permissions ?? []).filter(
    (permission) => permission !== 'tabs' && permission !== 'tabGroups',
  );
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return extensionPath;
}

async function waitForServiceWorker(context: BrowserContext): Promise<Worker> {
  const existingWorker = context.serviceWorkers()[0];
  return existingWorker ?? context.waitForEvent('serviceworker');
}

async function waitForInitialInstall(serviceWorker: Worker): Promise<void> {
  await serviceWorker.evaluate(async () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const { storageSchemaVersion } = await chrome.storage.sync.get(
        'storageSchemaVersion',
      );
      if (storageSchemaVersion === 2) {
        return;
      }
      await new Promise((resolveAttempt) => setTimeout(resolveAttempt, 25));
    }

    throw new Error('Extension installation did not initialize storage.');
  });
}

async function createBackgroundVideo(context: BrowserContext): Promise<Buffer> {
  const page = context.pages()[0] ?? (await context.newPage());
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const stream = canvas.captureStream(5);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    const recorded = new Promise<Blob>((resolveVideo, rejectVideo) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onerror = () =>
        rejectVideo(new Error('Test video recording failed.'));
      recorder.onstop = () =>
        resolveVideo(new Blob(chunks, { type: 'video/webm' }));
    });

    recorder.start();
    const context2d = canvas.getContext('2d');
    if (!context2d) {
      throw new Error('Test video canvas context is unavailable.');
    }
    context2d.fillStyle = '#4d2d57';
    context2d.fillRect(0, 0, canvas.width, canvas.height);
    const track = stream.getVideoTracks()[0];
    if (
      track &&
      'requestFrame' in track &&
      typeof track.requestFrame === 'function'
    ) {
      track.requestFrame();
    }
    await new Promise((resolveFrame) => setTimeout(resolveFrame, 120));
    recorder.stop();

    const bytes = new Uint8Array(await (await recorded).arrayBuffer());
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    stream.getTracks().forEach((streamTrack) => streamTrack.stop());
    return btoa(binary);
  });

  return Buffer.from(base64, 'base64');
}

export const test = base.extend<ExtensionFixtures & ExtensionOptions>({
  pregrantTabGroupPermissions: [false, { option: true }],
  extension: async (
    { browserName, pregrantTabGroupPermissions },
    runFixture,
    testInfo,
  ): Promise<void> => {
    if (browserName !== 'chromium') {
      throw new Error('Built extension tests require bundled Chromium.');
    }

    const extensionPath = await getExtensionPath(
      pregrantTabGroupPermissions,
      testInfo,
    );
    await access(resolve(extensionPath, 'manifest.json'));

    const viewport = testInfo.project.use.viewport ?? {
      height: 900,
      width: 1440,
    };
    const context = await chromium.launchPersistentContext(
      testInfo.outputPath('profile'),
      {
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ],
        channel: 'chromium',
        colorScheme: 'light',
        headless: testInfo.project.use.headless !== false,
        locale: 'en-US',
        reducedMotion: 'reduce',
        viewport,
      },
    );
    const serviceWorker = await waitForServiceWorker(context);
    await waitForInitialInstall(serviceWorker);
    const extensionId = new URL(serviceWorker.url()).host;
    const backgroundVideo = await createBackgroundVideo(context);
    let fontStylesheetRequestCount = 0;

    await Promise.all(context.pages().map((page) => page.close()));
    await context.route('https://fonts.googleapis.com/**', async (route) => {
      fontStylesheetRequestCount += 1;
      await route.fulfill({
        body: TEST_FONT_CSS,
        contentType: 'text/css',
        status: 200,
      });
    });
    await context.route(TEST_FONT_ROMAN_URL, async (route) =>
      route.fulfill({
        contentType: 'font/woff2',
        headers: { 'access-control-allow-origin': '*' },
        path: TEST_FONT_ROMAN_PATH,
        status: 200,
      }),
    );
    await context.route(TEST_FONT_ITALIC_URL, async (route) =>
      route.fulfill({
        contentType: 'font/woff2',
        headers: { 'access-control-allow-origin': '*' },
        path: TEST_FONT_ITALIC_PATH,
        status: 200,
      }),
    );
    await context.route('https://www.google.com/s2/favicons**', async (route) =>
      route.fulfill({
        body: STABLE_FAVICON,
        contentType: 'image/svg+xml',
        status: 200,
      }),
    );
    await context.route('https://example.test/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;

      if (pathname.endsWith('.gif')) {
        await route.fulfill({
          body: TEST_BACKGROUND_GIF,
          contentType: 'image/gif',
          status: 200,
        });
        return;
      }

      if (pathname.endsWith('.mp4') || pathname.endsWith('.webm')) {
        await route.fulfill({
          body: backgroundVideo,
          contentType: 'video/webm',
          status: 200,
        });
        return;
      }

      await route.fulfill({
        body: TEST_BACKGROUND_PNG,
        contentType: 'image/png',
        status: 200,
      });
    });

    async function seedProfile(seed: ProfileSeed = {}): Promise<void> {
      await serviceWorker.evaluate(
        async ({ bookmarkRoots, indexedDb, local, sync }) => {
          await chrome.storage.sync.clear();
          await chrome.storage.local.clear();

          const databaseNames = new Set([
            'lotuspad',
            'starlit',
            ...(indexedDb ?? []).map(({ databaseName }) => databaseName),
          ]);

          await Promise.all(
            [...databaseNames].map(
              (databaseName) =>
                new Promise<void>((resolveDelete, rejectDelete) => {
                  const request = indexedDB.deleteDatabase(databaseName);
                  request.onsuccess = () => resolveDelete();
                  request.onerror = () => rejectDelete(request.error);
                  request.onblocked = () =>
                    rejectDelete(
                      new Error(`IndexedDB deletion blocked: ${databaseName}`),
                    );
                }),
            ),
          );

          for (const databaseSeed of indexedDb ?? []) {
            await new Promise<void>((resolveDatabase, rejectDatabase) => {
              const request = indexedDB.open(databaseSeed.databaseName, 1);
              request.onupgradeneeded = () => {
                if (
                  !request.result.objectStoreNames.contains(
                    databaseSeed.storeName,
                  )
                ) {
                  request.result.createObjectStore(databaseSeed.storeName);
                }
              };
              request.onerror = () => rejectDatabase(request.error);
              request.onsuccess = () => {
                const database = request.result;
                const transaction = database.transaction(
                  databaseSeed.storeName,
                  'readwrite',
                );
                const binary = atob(databaseSeed.base64);
                const bytes = Uint8Array.from(binary, (character) =>
                  character.charCodeAt(0),
                );
                transaction
                  .objectStore(databaseSeed.storeName)
                  .put(
                    new Blob([bytes], { type: databaseSeed.mimeType }),
                    databaseSeed.key,
                  );
                transaction.onerror = () => rejectDatabase(transaction.error);
                transaction.oncomplete = () => {
                  database.close();
                  resolveDatabase();
                };
              };
            });
          }

          const tree = await chrome.bookmarks.getTree();
          const roots = tree[0]?.children ?? [];

          for (const root of roots) {
            for (const child of root.children ?? []) {
              if (child.url) {
                await chrome.bookmarks.remove(child.id);
              } else {
                await chrome.bookmarks.removeTree(child.id);
              }
            }
          }

          async function createBookmarks(
            parentId: string,
            bookmarks: BookmarkSeed[],
          ): Promise<void> {
            for (const bookmark of bookmarks) {
              const created = await chrome.bookmarks.create({
                parentId,
                title: bookmark.title,
                url: bookmark.url,
              });

              if (bookmark.children) {
                await createBookmarks(created.id, bookmark.children);
              }
            }
          }

          for (const [rootIndex, bookmarks] of (
            bookmarkRoots ?? []
          ).entries()) {
            const root = roots[rootIndex];
            if (!root) {
              throw new Error(`Bookmark root ${rootIndex} is unavailable.`);
            }
            await createBookmarks(root.id, bookmarks);
          }

          if (sync && Object.keys(sync).length > 0) {
            await chrome.storage.sync.set(sync);
          }
          if (local && Object.keys(local).length > 0) {
            await chrome.storage.local.set(local);
          }
        },
        seed,
      );
    }

    async function openNewTab(): Promise<Page> {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/index.html`);
      await page.waitForFunction(() => {
        const status = document.documentElement.dataset.starlitFontStatus;
        return status === 'loaded' || status === 'system';
      });
      const fontStatus = await page.evaluate(
        () => document.documentElement.dataset.starlitFontStatus,
      );

      if (fontStatus === 'loaded') {
        await page.evaluate(async () => {
          const [romanFaces, italicFaces] = await Promise.all([
            document.fonts.load('16px "IBM Plex Sans"'),
            document.fonts.load('italic 16px "IBM Plex Sans"'),
          ]);
          await document.fonts.ready;

          if (
            romanFaces.length === 0 ||
            italicFaces.length === 0 ||
            [...romanFaces, ...italicFaces].some(
              (fontFace) => fontFace.status !== 'loaded',
            ) ||
            !document.fonts.check('16px "IBM Plex Sans"') ||
            !document.fonts.check('italic 16px "IBM Plex Sans"')
          ) {
            throw new Error('Pinned IBM Plex Sans test font did not load.');
          }
        });
      }
      return page;
    }

    function getFontStylesheetRequestCount(): number {
      return fontStylesheetRequestCount;
    }

    async function readStorage(
      area: 'local' | 'sync',
    ): Promise<Record<string, unknown>> {
      return serviceWorker.evaluate(async (storageArea) => {
        return chrome.storage[storageArea].get(null);
      }, area);
    }

    async function readIndexedDbBlobText(
      databaseName: string,
      storeName: string,
      key: string,
    ): Promise<string | null> {
      return serviceWorker.evaluate(
        async (databaseKey) => {
          return new Promise<string | null>((resolveBlob, rejectBlob) => {
            const request = indexedDB.open(databaseKey.databaseName);
            request.onerror = () => rejectBlob(request.error);
            request.onsuccess = () => {
              const database = request.result;
              if (!database.objectStoreNames.contains(databaseKey.storeName)) {
                database.close();
                resolveBlob(null);
                return;
              }
              const transaction = database.transaction(
                databaseKey.storeName,
                'readonly',
              );
              const blobRequest = transaction
                .objectStore(databaseKey.storeName)
                .get(databaseKey.key);
              blobRequest.onerror = () => rejectBlob(blobRequest.error);
              blobRequest.onsuccess = () => {
                const value: unknown = blobRequest.result;
                database.close();
                if (!(value instanceof Blob)) {
                  resolveBlob(null);
                  return;
                }
                void value.text().then(resolveBlob, rejectBlob);
              };
            };
          });
        },
        { databaseName, key, storeName },
      );
    }

    async function readIndexedDbBlobBase64(
      databaseName: string,
      storeName: string,
      key: string,
    ): Promise<string | null> {
      return serviceWorker.evaluate(
        async (databaseKey) => {
          return new Promise<string | null>((resolveBlob, rejectBlob) => {
            const request = indexedDB.open(databaseKey.databaseName);
            request.onerror = () => rejectBlob(request.error);
            request.onsuccess = () => {
              const database = request.result;
              if (!database.objectStoreNames.contains(databaseKey.storeName)) {
                database.close();
                resolveBlob(null);
                return;
              }
              const transaction = database.transaction(
                databaseKey.storeName,
                'readonly',
              );
              const blobRequest = transaction
                .objectStore(databaseKey.storeName)
                .get(databaseKey.key);
              blobRequest.onerror = () => rejectBlob(blobRequest.error);
              blobRequest.onsuccess = () => {
                const value: unknown = blobRequest.result;
                database.close();
                if (!(value instanceof Blob)) {
                  resolveBlob(null);
                  return;
                }
                void value.arrayBuffer().then((arrayBuffer) => {
                  const bytes = new Uint8Array(arrayBuffer);
                  let binary = '';
                  for (const byte of bytes) {
                    binary += String.fromCharCode(byte);
                  }
                  resolveBlob(btoa(binary));
                }, rejectBlob);
              };
            };
          });
        },
        { databaseName, key, storeName },
      );
    }

    await runFixture({
      backgroundVideo,
      context,
      extensionId,
      getFontStylesheetRequestCount,
      openNewTab,
      readIndexedDbBlobBase64,
      readIndexedDbBlobText,
      readStorage,
      seedProfile,
      serviceWorker,
    });
    await context.close();
  },
});

export const tabGroupTest = test.extend({
  pregrantTabGroupPermissions: true,
});
