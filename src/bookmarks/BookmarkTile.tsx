import type { MouseEvent, ReactElement } from 'react';
import { Text } from '@fleetia/lagrange';

import type { BookmarkLayout } from './types';

export type BookmarkTileLayout = BookmarkLayout;
export type BookmarkTileKind = 'bookmark' | 'folder';

export type BookmarkTileProps = {
  favicon?: string;
  isPreview?: boolean;
  kind: BookmarkTileKind;
  layout?: BookmarkTileLayout;
  onActivate?: () => void;
  onContextMenu?: (event: MouseEvent<HTMLElement>) => void;
  title: string;
};

function TileContent({
  favicon,
  kind,
  title,
}: Pick<BookmarkTileProps, 'favicon' | 'kind' | 'title'>): ReactElement {
  return (
    <>
      <span
        aria-hidden="true"
        className="starlit-bookmark-tile__icon"
        data-kind={kind}
        data-starlit-part="bookmark-tile-icon"
      >
        {favicon ? (
          <img
            alt=""
            className="starlit-bookmark-tile__favicon"
            data-starlit-part="bookmark-tile-favicon"
            src={favicon}
          />
        ) : (
          <span
            className="starlit-bookmark-tile__marker"
            data-starlit-part="bookmark-tile-marker"
          />
        )}
      </span>
      <Text
        className="starlit-bookmark-tile__label"
        data-starlit-part="bookmark-tile-label"
        truncate
        variant="caption"
        weight="medium"
      >
        {title}
      </Text>
    </>
  );
}

export function BookmarkTile({
  favicon,
  isPreview = false,
  kind,
  layout = 'vertical',
  onActivate,
  onContextMenu,
  title,
}: BookmarkTileProps): ReactElement {
  const sharedProps = {
    className: 'starlit-bookmark-tile',
    'data-kind': kind,
    'data-layout': layout,
    'data-starlit-part': 'bookmark-tile',
  } as const;

  if (isPreview) {
    return (
      <div {...sharedProps} aria-hidden="true">
        <TileContent favicon={favicon} kind={kind} title={title} />
      </div>
    );
  }

  return (
    <button
      {...sharedProps}
      aria-label={title}
      onClick={onActivate}
      onContextMenu={onContextMenu}
      type="button"
    >
      <TileContent favicon={favicon} kind={kind} title={title} />
    </button>
  );
}
