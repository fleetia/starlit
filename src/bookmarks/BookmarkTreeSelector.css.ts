import { style } from '@vanilla-extract/css';
import { semanticVars } from '@fleetia/lagrange/theme';

export const tree = style({
  display: 'grid',
  minHeight: '7rem',
  maxHeight: '23rem',
  gap: semanticVars.space.md,
  padding: semanticVars.space.md,
  overflowY: 'auto',
  backgroundColor: semanticVars.color.surface.raised,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.strong}`,
});

export const rows = style({
  display: 'grid',
  minWidth: 0,
});

export const level = style({
  display: 'grid',
  minWidth: 0,
});

export const row = style({
  display: 'flex',
  boxSizing: 'border-box',
  width: '100%',
  minWidth: 0,
  minHeight: semanticVars.dimension.row,
  alignItems: 'center',
  gap: semanticVars.space.xs,
  paddingBlock: semanticVars.space.xxs,
  paddingInlineEnd: semanticVars.space.xs,
  color: semanticVars.color.content.primary,
  backgroundColor: 'transparent',
  borderBottom: `${semanticVars.border.width.hairline} dotted ${semanticVars.color.border.subtle}`,
  cursor: 'grab',
  selectors: {
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
    '&[data-hidden="true"]': {
      opacity: 0.52,
      textDecoration: 'line-through',
    },
  },
});

export const placeholder = style({
  width: semanticVars.dimension.row,
  height: semanticVars.dimension.row,
  flexShrink: 0,
});

export const folderName = style({
  flex: 1,
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
