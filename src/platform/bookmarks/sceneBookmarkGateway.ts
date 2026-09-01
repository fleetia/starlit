import type {
  SceneBookmarkGateway,
  SceneBookmarkNode,
} from '../../scenes/bookmarkCopy';

function toSceneBookmarkNode(
  node: chrome.bookmarks.BookmarkTreeNode,
): SceneBookmarkNode {
  return {
    ...(node.children
      ? { children: node.children.map(toSceneBookmarkNode) }
      : {}),
    id: node.id,
    ...(node.parentId === undefined ? {} : { parentId: node.parentId }),
    title: node.title,
    ...(node.unmodifiable === undefined
      ? {}
      : { unmodifiable: 'managed' as const }),
    ...(node.url === undefined ? {} : { url: node.url }),
  };
}

export function createChromeSceneBookmarkGateway(): SceneBookmarkGateway {
  return {
    create: async (input) =>
      toSceneBookmarkNode(await chrome.bookmarks.create(input)),
    getChildren: async (id) =>
      (await chrome.bookmarks.getChildren(id)).map(toSceneBookmarkNode),
    getSubTree: async (id) =>
      (await chrome.bookmarks.getSubTree(id)).map(toSceneBookmarkNode),
    removeTree: async (id) => chrome.bookmarks.removeTree(id),
  };
}
