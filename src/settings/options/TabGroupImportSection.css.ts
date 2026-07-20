import { style } from '@vanilla-extract/css';
import { semanticVars } from '@fleetia/lagrange/theme';

export const actions = style({
  alignItems: 'center',
});

export const status = style({
  minWidth: 0,
  overflowWrap: 'anywhere',
});

export const groupList = style({
  display: 'grid',
  maxHeight: '14rem',
  margin: 0,
  padding: 0,
  overflowY: 'auto',
  listStyle: 'none',
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.strong}`,
});

export const groupRow = style({
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: semanticVars.space.sm,
  minHeight: semanticVars.dimension.row,
  padding: `${semanticVars.space.xs} ${semanticVars.space.sm}`,
  borderBottom: `${semanticVars.border.width.hairline} dotted ${semanticVars.color.border.subtle}`,
  selectors: {
    '&:last-child': {
      borderBottom: 0,
    },
  },
});

export const checkbox = style({
  width: '1rem',
  height: '1rem',
  margin: 0,
  accentColor: semanticVars.color.interaction.primary,
});

export const groupTitle = style({
  minWidth: 0,
  cursor: 'pointer',
});

export const resultList = style({
  display: 'grid',
  gap: semanticVars.space.xs,
  margin: 0,
  paddingInlineStart: semanticVars.space.lg,
});
