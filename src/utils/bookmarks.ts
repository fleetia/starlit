import { Bookmark, BookmarkItem } from "@/newtab/types";

type ChromeBookmarkNode = chrome.bookmarks.BookmarkTreeNode;

export function convertTree(
  nodes: ChromeBookmarkNode[],
  route: string[] = []
): Bookmark[] {
  const result: Bookmark[] = [];

  for (const node of nodes) {
    if (node.children) {
      const currentRoute = node.title ? [...route, node.title] : route;

      const items: BookmarkItem[] = node.children
        .filter(child => child.url)
        .map(child => ({
          id: child.id ?? crypto.randomUUID(),
          title: child.title,
          url: child.url!,
          favicon: (() => {
            try {
              return `https://www.google.com/s2/favicons?domain=${new URL(child.url!).hostname}&sz=32`;
            } catch {
              return `https://www.google.com/s2/favicons?domain=example.com&sz=32`;
            }
          })()
        }));

      const subFolders = node.children.filter(child => child.children);
      const children =
        subFolders.length > 0
          ? convertTree(subFolders, currentRoute)
          : undefined;

      if (items.length > 0 || (children && children.length > 0)) {
        result.push({
          id: node.id,
          title: node.title || "북마크",
          route: currentRoute,
          list: items,
          children
        });
      }
    }
  }

  return result;
}

/** 모든 BookmarkItem을 평탄화 (캐시용) */
export function flattenItems(folders: Bookmark[]): BookmarkItem[] {
  const items: BookmarkItem[] = [];
  for (const folder of folders) {
    if (folder.list) items.push(...folder.list);
    if (folder.children) items.push(...flattenItems(folder.children));
  }
  return items;
}

const MOCK_TREE: ChromeBookmarkNode[] = [
  {
    id: "0",
    title: "",
    children: [
      {
        id: "1",
        title: "북마크 바",
        children: [
          {
            id: "10",
            title: "개발",
            children: [
              { id: "101", title: "GitHub", url: "https://github.com" },
              {
                id: "102",
                title: "MDN Web Docs",
                url: "https://developer.mozilla.org"
              },
              {
                id: "103",
                title: "Stack Overflow",
                url: "https://stackoverflow.com"
              },
              {
                id: "13",
                title: "프론트엔드",
                children: [
                  { id: "131", title: "React", url: "https://react.dev" },
                  { id: "132", title: "Vue.js", url: "https://vuejs.org" },
                  { id: "133", title: "Svelte", url: "https://svelte.dev" },
                  {
                    id: "134",
                    title: "심화",
                    children: [
                      {
                        id: "1341",
                        title: "TypeScript",
                        url: "https://typescriptlang.org"
                      },
                      {
                        id: "1342",
                        title: "Webpack",
                        url: "https://webpack.js.org"
                      },
                      {
                        id: "1343",
                        title: "상태관리",
                        children: [
                          {
                            id: "13431",
                            title: "Redux",
                            url: "https://redux.js.org"
                          },
                          {
                            id: "13432",
                            title: "Zustand",
                            url: "https://zustand-demo.pmnd.rs"
                          },
                          {
                            id: "13433",
                            title: "패턴",
                            children: [
                              {
                                id: "134331",
                                title: "Flux",
                                url: "https://facebookarchive.github.io/flux"
                              },
                              {
                                id: "134332",
                                title: "아키텍처",
                                children: [
                                  {
                                    id: "1343321",
                                    title: "Clean Architecture",
                                    url: "https://blog.cleancoder.com"
                                  },
                                  {
                                    id: "1343322",
                                    title: "마이크로프론트엔드",
                                    children: [
                                      {
                                        id: "13433221",
                                        title: "Module Federation",
                                        url: "https://webpack.js.org/concepts/module-federation"
                                      },
                                      {
                                        id: "13433222",
                                        title: "빌드도구",
                                        children: [
                                          {
                                            id: "134332221",
                                            title: "Vite",
                                            url: "https://vitejs.dev"
                                          },
                                          {
                                            id: "134332222",
                                            title: "Turbopack",
                                            url: "https://turbo.build/pack"
                                          },
                                          {
                                            id: "134332223",
                                            title: "테스팅",
                                            children: [
                                              {
                                                id: "1343322231",
                                                title: "Vitest",
                                                url: "https://vitest.dev"
                                              },
                                              {
                                                id: "1343322232",
                                                title: "Playwright",
                                                url: "https://playwright.dev"
                                              },
                                              {
                                                id: "1343322233",
                                                title: "CI/CD",
                                                children: [
                                                  {
                                                    id: "13433222331",
                                                    title: "GitHub Actions",
                                                    url: "https://github.com/features/actions"
                                                  },
                                                  {
                                                    id: "13433222332",
                                                    title: "모니터링",
                                                    children: [
                                                      {
                                                        id: "134332223321",
                                                        title: "Sentry",
                                                        url: "https://sentry.io"
                                                      },
                                                      {
                                                        id: "134332223322",
                                                        title: "Datadog",
                                                        url: "https://datadoghq.com"
                                                      }
                                                    ]
                                                  }
                                                ]
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                id: "14",
                title: "백엔드",
                children: [
                  { id: "141", title: "Node.js", url: "https://nodejs.org" },
                  { id: "142", title: "Go", url: "https://go.dev" }
                ]
              }
            ]
          },
          {
            id: "11",
            title: "디자인",
            children: [
              { id: "111", title: "Figma", url: "https://figma.com" },
              { id: "112", title: "Dribbble", url: "https://dribbble.com" }
            ]
          },
          {
            id: "12",
            title: "뉴스",
            children: [
              {
                id: "121",
                title: "Hacker News",
                url: "https://news.ycombinator.com"
              },
              {
                id: "122",
                title: "TechCrunch",
                url: "https://techcrunch.com"
              },
              { id: "123", title: "Verge", url: "https://theverge.com" }
            ]
          }
        ]
      },
      {
        id: "2",
        title: "기타 북마크",
        children: [
          {
            id: "20",
            title: "쇼핑",
            children: [
              { id: "201", title: "Amazon", url: "https://amazon.com" }
            ]
          }
        ]
      }
    ]
  }
];

const getTree = async (): Promise<ChromeBookmarkNode[]> => {
  if (import.meta.env.DEV) {
    return MOCK_TREE;
  }
  return chrome.bookmarks.getTree();
};

export default { getTree };
