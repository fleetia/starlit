import { cp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');

async function pathExists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function prepareExtension() {
  const entryHtml = resolve(DIST, 'index.html');
  const guideHtml = resolve(DIST, 'guide.html');

  await cp(resolve(ROOT, 'manifest.json'), resolve(DIST, 'manifest.json'));
  await cp(resolve(ROOT, 'assets'), resolve(DIST, 'assets'), {
    recursive: true,
  });

  const requiredPaths = [
    resolve(DIST, 'manifest.json'),
    resolve(DIST, 'background/index.js'),
    entryHtml,
    guideHtml,
    resolve(DIST, 'assets/guide/new-tab-overview.jpg'),
    resolve(DIST, 'assets/guide/open-tab-group-confirm.jpg'),
    resolve(DIST, 'assets/guide/settings-appearance.jpg'),
    resolve(DIST, 'assets/guide/settings-bookmark-groups.jpg'),
    resolve(DIST, 'assets/guide/settings-custom-css.jpg'),
    resolve(DIST, 'assets/guide/settings-general.jpg'),
    resolve(DIST, 'assets/guide/settings-layout.jpg'),
  ];
  const missingPaths = [];

  for (const path of requiredPaths) {
    if (!(await pathExists(path))) {
      missingPaths.push(path);
    }
  }

  if (missingPaths.length > 0) {
    throw new Error(`Missing extension output: ${missingPaths.join(', ')}`);
  }

  const manifest = JSON.parse(
    await readFile(resolve(DIST, 'manifest.json'), 'utf8'),
  );
  const packageJson = JSON.parse(
    await readFile(resolve(ROOT, 'package.json'), 'utf8'),
  );

  if (manifest.version !== packageJson.version) {
    throw new Error('manifest.json and package.json versions must match');
  }

  if (
    !manifest.permissions?.includes('storage') ||
    !manifest.permissions?.includes('bookmarks')
  ) {
    throw new Error('Extension must retain storage and bookmarks permissions');
  }

  if (
    !manifest.optional_permissions?.includes('tabs') ||
    !manifest.optional_permissions?.includes('tabGroups')
  ) {
    throw new Error('Extension must declare optional tab group permissions');
  }

  const manifestReferences = [
    manifest.background?.service_worker,
    manifest.chrome_url_overrides?.newtab,
  ];

  for (const reference of manifestReferences) {
    if (
      typeof reference !== 'string' ||
      !(await pathExists(resolve(DIST, reference)))
    ) {
      throw new Error(`Invalid manifest reference: ${String(reference)}`);
    }
  }

  for (const htmlPath of [entryHtml, guideHtml]) {
    const html = await readFile(htmlPath, 'utf8');
    const assetReferences = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((reference) => reference?.startsWith('/'));

    for (const reference of assetReferences) {
      if (!(await pathExists(resolve(DIST, `.${reference}`)))) {
        throw new Error(`Invalid HTML asset reference: ${reference}`);
      }
    }
  }
}

await prepareExtension();
