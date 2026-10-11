import { describe, expect, it } from 'vitest';

import { getBookmarkIdKey } from '../bookmarks/bookmarkRoute';
import { remapBookmarkPreferences } from './bookmarkIdentity';

describe('bookmark identity remapping', () => {
  it('remaps id-based visibility and sibling order while retaining route keys', () => {
    const sourceRoot = getBookmarkIdKey('source-root');
    const sourceFirst = getBookmarkIdKey('source-first');
    const sourceSecond = getBookmarkIdKey('source-second');

    expect(
      remapBookmarkPreferences(
        {
          groupPreferences: [
            { key: sourceFirst, visible: false },
            { key: 'Work/Duplicate', visible: true },
          ],
          siblingOrder: {
            [sourceRoot]: [sourceSecond, sourceFirst],
            'Work/Duplicate': ['Second', 'First'],
          },
        },
        new Map([
          ['source-root', 'target-root'],
          ['source-first', 'target-first'],
          ['source-second', 'target-second'],
        ]),
      ),
    ).toEqual({
      groupPreferences: [
        { key: getBookmarkIdKey('target-first'), visible: false },
        { key: 'Work/Duplicate', visible: true },
      ],
      siblingOrder: {
        [getBookmarkIdKey('target-root')]: [
          getBookmarkIdKey('target-second'),
          getBookmarkIdKey('target-first'),
        ],
        'Work/Duplicate': ['Second', 'First'],
      },
    });
  });

  it('prunes unmapped device ids without dropping legacy route identities', () => {
    expect(
      remapBookmarkPreferences(
        {
          groupPreferences: [
            { key: getBookmarkIdKey('private-device-folder'), visible: false },
            { key: 'Bookmarks Bar/Work', visible: false },
          ],
          siblingOrder: {
            [getBookmarkIdKey('private-device-root')]: ['Work'],
            'Bookmarks Bar': [
              getBookmarkIdKey('private-device-folder'),
              'Personal',
            ],
          },
        },
        new Map(),
      ),
    ).toEqual({
      groupPreferences: [{ key: 'Bookmarks Bar/Work', visible: false }],
      siblingOrder: { 'Bookmarks Bar': ['Personal'] },
    });
  });
});
