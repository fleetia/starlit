import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  copyBookmarkFolderToScene,
  findDefaultSceneBookmarkParent,
  previewBookmarkCopy,
  type SceneBookmarkGateway,
  type SceneBookmarkNode,
} from './bookmarkCopy';

const SOURCE: SceneBookmarkNode = {
  children: [
    { id: 'url-1', title: 'One', url: 'https://one.test' },
    {
      children: [{ id: 'url-2', title: 'Two', url: 'https://two.test' }],
      id: 'nested',
      title: 'Nested',
    },
  ],
  id: 'source',
  title: 'Source',
};
const DESTINATION: SceneBookmarkNode = {
  children: [],
  id: 'destination',
  title: 'Other bookmarks',
};
const OTHER_BOOKMARKS: SceneBookmarkNode = {
  children: [],
  id: '2',
  title: 'Other bookmarks',
};

const create = vi.fn<SceneBookmarkGateway['create']>();
const getChildren = vi.fn<SceneBookmarkGateway['getChildren']>();
const getSubTree = vi.fn<SceneBookmarkGateway['getSubTree']>();
const removeTree = vi.fn<SceneBookmarkGateway['removeTree']>();
const gateway: SceneBookmarkGateway = {
  create,
  getChildren,
  getSubTree,
  removeTree,
};

beforeEach((): void => {
  vi.clearAllMocks();
  getSubTree.mockImplementation(async (id) => {
    if (id === 'source') {
      return [structuredClone(SOURCE)];
    }
    if (id === '2' || id === 'destination') {
      return [structuredClone(id === '2' ? OTHER_BOOKMARKS : DESTINATION)];
    }
    return [];
  });
  getChildren.mockResolvedValue([]);
  removeTree.mockResolvedValue();
});

describe('bookmark copy transaction', () => {
  it('previews descendant URL and folder counts without writing bookmarks', async () => {
    await expect(previewBookmarkCopy('source', gateway)).resolves.toEqual({
      folderCount: 1,
      sourceFolderId: 'source',
      urlCount: 2,
    });

    expect(create).not.toHaveBeenCalled();
  });

  it('uses writable Other bookmarks as the default parent and falls back cleanly', async () => {
    await expect(findDefaultSceneBookmarkParent(gateway)).resolves.toBe('2');

    getSubTree.mockRejectedValueOnce(new Error('unavailable'));
    await expect(findDefaultSceneBookmarkParent(gateway)).resolves.toBeNull();
  });

  it('copies into an existing Starlit Scenes folder without modifying existing nodes', async () => {
    getChildren.mockResolvedValue([
      { id: 'existing-container', title: 'Starlit Scenes' },
    ]);
    create
      .mockResolvedValueOnce({ id: 'scene-root', title: 'Focus' })
      .mockResolvedValueOnce({
        id: 'created-url-1',
        title: 'One',
        url: 'https://one.test',
      })
      .mockResolvedValueOnce({ id: 'created-nested', title: 'Nested' })
      .mockResolvedValueOnce({
        id: 'created-url-2',
        title: 'Two',
        url: 'https://two.test',
      });

    await expect(
      copyBookmarkFolderToScene(
        {
          destinationParentId: 'destination',
          sceneName: 'Focus',
          sourceFolderId: 'source',
        },
        gateway,
      ),
    ).resolves.toEqual({
      containerFolderId: 'existing-container',
      createdNodeIds: [
        'scene-root',
        'created-url-1',
        'created-nested',
        'created-url-2',
      ],
      folderCount: 1,
      identityMap: new Map([
        ['source', 'scene-root'],
        ['url-1', 'created-url-1'],
        ['nested', 'created-nested'],
        ['url-2', 'created-url-2'],
      ]),
      sceneFolderId: 'scene-root',
      sourceFolderId: 'source',
      urlCount: 2,
      wasContainerCreated: false,
    });

    expect(create.mock.calls).toEqual([
      [{ parentId: 'existing-container', title: 'Focus' }],
      [
        {
          parentId: 'scene-root',
          title: 'One',
          url: 'https://one.test',
        },
      ],
      [{ parentId: 'scene-root', title: 'Nested' }],
      [
        {
          parentId: 'created-nested',
          title: 'Two',
          url: 'https://two.test',
        },
      ],
    ]);
    expect(removeTree).not.toHaveBeenCalled();
  });

  it('does not reuse the source folder itself as the Starlit Scenes container', async () => {
    getSubTree.mockImplementation(async (id) => {
      if (id === 'source') {
        return [{ children: [], id: 'source', title: 'Starlit Scenes' }];
      }
      return [structuredClone(DESTINATION)];
    });
    getChildren.mockResolvedValue([
      { children: [], id: 'source', title: 'Starlit Scenes' },
    ]);
    create
      .mockResolvedValueOnce({
        id: 'new-container',
        title: 'Starlit Scenes',
      })
      .mockResolvedValueOnce({ id: 'scene-root', title: 'Focus' });

    const result = await copyBookmarkFolderToScene(
      {
        destinationParentId: 'destination',
        sceneName: 'Focus',
        sourceFolderId: 'source',
      },
      gateway,
    );

    expect(result.containerFolderId).toBe('new-container');
    expect(create).toHaveBeenNthCalledWith(1, {
      parentId: 'destination',
      title: 'Starlit Scenes',
    });
  });

  it('copies a root snapshot into its descendant while excluding the destination container', async () => {
    const root: SceneBookmarkNode = {
      children: [
        { children: [], id: 'bookmarks-bar', title: 'Bookmarks bar' },
        {
          children: [
            { children: [], id: 'existing-container', title: 'Starlit Scenes' },
            { id: 'other-url', title: 'Other', url: 'https://other.test' },
          ],
          id: 'destination',
          title: 'Other bookmarks',
        },
      ],
      id: 'root',
      title: '',
    };
    getSubTree.mockImplementation(async (id) =>
      id === 'root' ? [structuredClone(root)] : [structuredClone(DESTINATION)],
    );
    getChildren.mockResolvedValue([
      { children: [], id: 'existing-container', title: 'Starlit Scenes' },
    ]);
    create
      .mockResolvedValueOnce({ id: 'scene-root', title: 'Focus' })
      .mockResolvedValueOnce({ id: 'bar-copy', title: 'Bookmarks bar' })
      .mockResolvedValueOnce({ id: 'other-copy', title: 'Other bookmarks' })
      .mockResolvedValueOnce({
        id: 'other-url-copy',
        title: 'Other',
        url: 'https://other.test',
      });

    await copyBookmarkFolderToScene(
      {
        destinationParentId: 'destination',
        sceneName: 'Focus',
        sourceFolderId: 'root',
      },
      gateway,
    );

    expect(create).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Starlit Scenes' }),
    );
    expect(create).toHaveBeenLastCalledWith({
      parentId: 'other-copy',
      title: 'Other',
      url: 'https://other.test',
    });
  });

  it('compensates only the created scene root and container when copying fails', async () => {
    create
      .mockResolvedValueOnce({ id: 'new-container', title: 'Starlit Scenes' })
      .mockResolvedValueOnce({ id: 'scene-root', title: 'Focus' })
      .mockResolvedValueOnce({
        id: 'created-url-1',
        title: 'One',
        url: 'https://one.test',
      })
      .mockRejectedValueOnce(new Error('copy failed'));

    await expect(
      copyBookmarkFolderToScene(
        {
          destinationParentId: 'destination',
          sceneName: 'Focus',
          sourceFolderId: 'source',
        },
        gateway,
      ),
    ).rejects.toThrow('copy failed');

    expect(removeTree.mock.calls).toEqual([['scene-root'], ['new-container']]);
  });

  it('surfaces the original and compensation failures together', async () => {
    create
      .mockResolvedValueOnce({ id: 'new-container', title: 'Starlit Scenes' })
      .mockResolvedValueOnce({ id: 'scene-root', title: 'Focus' })
      .mockRejectedValueOnce(new Error('copy failed'));
    removeTree
      .mockRejectedValueOnce(new Error('scene rollback failed'))
      .mockResolvedValueOnce();

    await expect(
      copyBookmarkFolderToScene(
        {
          destinationParentId: 'destination',
          sceneName: 'Focus',
          sourceFolderId: 'source',
        },
        gateway,
      ),
    ).rejects.toThrow('Bookmark copy and compensation both failed');
  });
});
