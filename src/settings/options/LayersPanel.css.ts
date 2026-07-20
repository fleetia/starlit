import { style } from '@vanilla-extract/css';
import { semanticVars } from '@fleetia/lagrange/theme';

export const hiddenInput = style({
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  border: 0,
  whiteSpace: 'nowrap',
});

export const status = style({
  minWidth: 0,
  overflowWrap: 'anywhere',
});

export const directionLabels = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: semanticVars.space.sm,
  paddingInline: semanticVars.space.sm,
});

export const layerList = style({
  display: 'grid',
  maxHeight: '22rem',
  margin: 0,
  padding: 0,
  overflowY: 'auto',
  listStyle: 'none',
  backgroundColor: semanticVars.color.surface.raised,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.strong}`,
});

export const layerRow = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  minWidth: 0,
  minHeight: semanticVars.dimension.row,
  alignItems: 'center',
  gap: semanticVars.space.sm,
  padding: `${semanticVars.space.xs} ${semanticVars.space.sm}`,
  color: semanticVars.color.content.primary,
  backgroundColor: 'transparent',
  borderBottom: `${semanticVars.border.width.hairline} dotted ${semanticVars.color.border.subtle}`,
  cursor: 'grab',
  selectors: {
    '&:last-child': {
      borderBottom: 0,
    },
    '&:hover': {
      color: semanticVars.color.content.accent,
      backgroundColor: semanticVars.color.interaction.focusSurface,
    },
    '&:active': {
      cursor: 'grabbing',
    },
    '&[data-drag-over="true"]': {
      borderBottomColor: semanticVars.color.selection.indicator,
      borderBottomStyle: 'solid',
    },
    '&[data-kind="bookmarks"]': {
      backgroundColor: semanticVars.color.selection.surface,
    },
  },
});

export const layerDetails = style({
  display: 'grid',
  minWidth: 0,
  gap: semanticVars.space.xxs,
});

export const rowActions = style({
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  gap: semanticVars.space.xxs,
});

export const dragHandle = style({
  paddingInline: semanticVars.space.xs,
  color: semanticVars.color.content.secondary,
  fontFamily: semanticVars.typography.family.data,
  fontSize: semanticVars.typography.size.caption,
  cursor: 'grab',
});
