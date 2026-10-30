import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { Plugin } from 'vite';

import type { LicenseEntry } from '../src/licenses/types';

type PackageMetadata = {
  name: string;
  version: string;
  license?: string;
  dependencies?: Record<string, string>;
  repository?: string | { url: string };
  homepage?: string;
};

function readPackage(directory: string): PackageMetadata {
  return JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
}

function normalizeLink(
  value: string | undefined,
  isRepository = false,
): string | undefined {
  if (!value) {
    return undefined;
  }
  let normalized = value;
  if (isRepository) {
    normalized = normalized
      .replace(/^git\+/, '')
      .replace(/^git:\/\//, 'https://')
      .replace(/\.git(?=$|#)/, '');
    if (/^(github:)?[\w.-]+\/[\w.-]+$/.test(normalized)) {
      normalized = `https://github.com/${normalized.replace(/^github:/, '')}`;
    }
  }
  try {
    const url = new URL(normalized);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function resolvePackage(name: string, from: string): string {
  const require = createRequire(join(from, 'package.json'));
  const directory = require.resolve
    .paths(name)
    ?.map((path) => join(path, name))
    .find((path) => existsSync(join(path, 'package.json')));
  if (!directory) {
    throw new Error(`Cannot find package metadata for ${name}`);
  }
  return realpathSync(directory);
}

export function collectLicenses(root: string): LicenseEntry[] {
  const visited = new Set<string>();
  const entries: LicenseEntry[] = [];

  function visit(name: string, from: string): void {
    const directory = resolvePackage(name, from);
    if (visited.has(directory)) {
      return;
    }
    visited.add(directory);
    const metadata = readPackage(directory);
    const notices = readdirSync(directory, { withFileTypes: true })
      .filter(
        (file) =>
          file.isFile() &&
          /^(licen[cs]e|copying|notice)([.-]|$)/i.test(file.name),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((file) => ({
        name: file.name,
        text: readFileSync(join(directory, file.name), 'utf8'),
      }));
    if (!metadata.license || !notices.some((notice) => notice.text.trim())) {
      throw new Error(
        `Missing license metadata or text: ${metadata.name}@${metadata.version}`,
      );
    }
    entries.push({
      name: metadata.name,
      version: metadata.version,
      license: metadata.license,
      repositoryUrl: normalizeLink(
        typeof metadata.repository === 'string'
          ? metadata.repository
          : metadata.repository?.url,
        true,
      ),
      homepageUrl: normalizeLink(metadata.homepage),
      notices,
    });
    for (const dependency of Object.keys(metadata.dependencies ?? {})) {
      visit(dependency, directory);
    }
  }

  for (const name of Object.keys(readPackage(root).dependencies ?? {})) {
    visit(name, root);
  }
  entries.push({
    name: 'IBM Plex',
    repositoryUrl: 'https://github.com/IBM/plex',
    homepageUrl: 'https://www.ibm.com/plex/',
    license: 'OFL-1.1',
    notices: [
      {
        name: 'OFL-1.1',
        text: readFileSync(
          join(root, 'assets/licenses/IBM-Plex-OFL-1.1.txt'),
          'utf8',
        ),
      },
    ],
  });
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

export function licensesPlugin(root: string): Plugin {
  const id = '\0virtual:starlit-licenses';
  return {
    name: 'starlit-licenses',
    resolveId(source): string | null {
      return source === 'virtual:starlit-licenses' ? id : null;
    },
    load(source): string | null {
      if (source !== id) {
        return null;
      }
      return `export default ${JSON.stringify(collectLicenses(root))};`;
    },
  };
}
