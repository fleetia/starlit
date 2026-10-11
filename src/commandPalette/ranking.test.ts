import { describe, expect, it } from 'vitest';

import type { PaletteResult } from './types';
import { rankPaletteResults } from './ranking';

const results: PaletteResult[] = [
  {
    bookmarkId: 'global-title',
    category: 'bookmark',
    isCurrentScene: false,
    path: ['Other bookmarks'],
    title: 'GitHub Issues',
    url: 'https://github.com/fleetia/starlit/issues',
  },
  {
    bookmarkId: 'scene-domain',
    category: 'bookmark',
    isCurrentScene: true,
    path: ['Work'],
    title: 'Repository',
    url: 'https://github.com/fleetia/starlit',
  },
  {
    bookmarkId: 'scene-path',
    category: 'bookmark',
    isCurrentScene: true,
    path: ['Work', 'Planning'],
    title: 'Milestones',
    url: 'https://example.com/projects/github-roadmap',
  },
];

describe('rankPaletteResults', () => {
  it('prioritizes current Scene results before a stronger global match', () => {
    expect(
      rankPaletteResults(results, 'github').map((result) => result.title),
    ).toEqual(['Repository', 'Milestones', 'GitHub Issues']);
  });

  it('uses title prefix, domain prefix, then path substring', () => {
    const globalResults: PaletteResult[] = results.map(
      (result): PaletteResult => {
        if (result.category === 'settings') return result;
        return { ...result, isCurrentScene: false };
      },
    );

    expect(
      rankPaletteResults(globalResults, 'github').map((result) => result.title),
    ).toEqual(['GitHub Issues', 'Repository', 'Milestones']);
  });

  it('returns no unrelated results and applies a deterministic limit', () => {
    expect(rankPaletteResults(results, 'not-present')).toEqual([]);
    expect(rankPaletteResults(results, '', 2)).toHaveLength(2);
  });
});
