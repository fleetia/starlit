import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { collectLicenses } from './licenses';

const fixtures: string[] = [];
afterEach(() => {
  fixtures.forEach((path) => rmSync(path, { recursive: true, force: true }));
  fixtures.length = 0;
});

describe('collectLicenses', () => {
  it('includes transitive runtime dependencies and font notices, excluding build tools', () => {
    const entries = collectLicenses(resolve(import.meta.dirname, '..'));
    expect(entries.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        '@fleetia/lagrange',
        'clsx',
        'gifuct-js',
        'ical.js',
        'js-binary-schema-parser',
        'react',
        'react-dom',
        'scheduler',
        'IBM Plex',
      ]),
    );
    expect(entries.some((entry) => entry.name === 'vite')).toBe(false);
    expect(
      entries.find((entry) => entry.name === '@fleetia/lagrange')
        ?.repositoryUrl,
    ).toBe('https://github.com/fleetia/lagrange');
    expect(entries.find((entry) => entry.name === 'clsx')?.repositoryUrl).toBe(
      'https://github.com/lukeed/clsx',
    );
    expect(entries.find((entry) => entry.name === 'react')?.homepageUrl).toBe(
      'https://react.dev/',
    );
    expect(
      entries.find((entry) => entry.name === '@fleetia/lagrange')?.notices[0]
        ?.text,
    ).toContain('GNU AFFERO GENERAL PUBLIC LICENSE');
    expect(
      entries.find((entry) => entry.name === 'IBM Plex')?.notices[0]?.text,
    ).toContain('Copyright © 2017 IBM Corp.');
  });

  it('fails rather than silently omitting a dependency without a license text', () => {
    const root = mkdtempSync(join(tmpdir(), 'starlit-licenses-'));
    fixtures.push(root);
    const dependency = join(root, 'node_modules', 'missing-notice');
    mkdirSync(dependency, { recursive: true });
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ dependencies: { 'missing-notice': '1.0.0' } }),
    );
    writeFileSync(
      join(dependency, 'package.json'),
      JSON.stringify({
        name: 'missing-notice',
        version: '1.0.0',
        license: 'MIT',
        main: 'index.js',
      }),
    );
    writeFileSync(join(dependency, 'index.js'), '');
    expect(() => collectLicenses(root)).toThrow(
      'Missing license metadata or text: missing-notice@1.0.0',
    );
  });
});
