export type BookmarkItem = {
  id: string;
  title: string;
  url: string;
  favicon?: string;
};

export type BookmarkLayout = 'horizontal' | 'vertical';

export type Bookmark = {
  id?: string;
  title: string;
  description?: string;
  url?: string;
  favicon?: string;
  route?: string[];
  list?: BookmarkItem[];
  children?: Bookmark[];
};

export type GroupPreference = {
  key: string;
  visible: boolean;
};
