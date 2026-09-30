import type { CSSProperties, MouseEvent, ReactElement } from 'react';
import { IconTile } from '@fleetia/lagrange';

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

function TileIcon({
  favicon,
  kind,
}: Pick<BookmarkTileProps, 'favicon' | 'kind'>): ReactElement {
  return (
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
  const labelProps = {
    className: 'starlit-bookmark-tile__label',
    'data-starlit-part': 'bookmark-tile-label',
  };
  const iconStyle: CSSProperties & {
    '--lagrange-icon-tile-icon-size': string;
  } = {
    '--lagrange-icon-tile-icon-size': 'var(--icon-size, 28px)',
  };

  return (
    <IconTile
      aria-hidden={isPreview || undefined}
      className="starlit-bookmark-tile"
      data-kind={kind}
      data-starlit-part="bookmark-tile"
      icon={<TileIcon favicon={favicon} kind={kind} />}
      label={title}
      labelProps={labelProps}
      layout={layout}
      onClick={isPreview ? undefined : onActivate}
      onContextMenu={isPreview ? undefined : onContextMenu}
      style={iconStyle}
      tabIndex={isPreview ? -1 : undefined}
      title={isPreview ? undefined : title}
    />
  );
}
