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

export const warning = style({
  padding: semanticVars.space.sm,
  backgroundColor: semanticVars.color.interaction.focusSurface,
  borderInlineStart: `${semanticVars.space.xs} solid ${semanticVars.color.border.strong}`,
});

export const countList = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: semanticVars.space.xs,
  margin: 0,
  padding: semanticVars.space.sm,
  backgroundColor: semanticVars.color.surface.raised,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
  '@media': {
    '(max-width: 34rem)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
});

export const countItem = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: semanticVars.space.sm,
  minWidth: 0,
});

export const countLabel = style({
  overflow: 'hidden',
  color: semanticVars.color.content.secondary,
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const countValue = style({
  margin: 0,
  color: semanticVars.color.content.primary,
  fontFamily: semanticVars.typography.family.data,
});

export const sceneList = style({
  display: 'grid',
  maxHeight: '24rem',
  gap: semanticVars.space.sm,
  margin: 0,
  padding: 0,
  overflowY: 'auto',
  listStyle: 'none',
});

export const sceneCard = style({
  display: 'grid',
  gap: semanticVars.space.sm,
  minWidth: 0,
  padding: semanticVars.space.sm,
  backgroundColor: semanticVars.color.surface.raised,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.strong}`,
});

export const sceneTitle = style({
  minWidth: 0,
  overflowWrap: 'anywhere',
});

export const sceneMeta = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: semanticVars.space.xs,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const sceneMetaItem = style({
  padding: `${semanticVars.space.xxs} ${semanticVars.space.xs}`,
  color: semanticVars.color.content.secondary,
  backgroundColor: semanticVars.color.surface.canvas,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.caption,
});

export const status = style({
  minWidth: 0,
  overflowWrap: 'anywhere',
});
