import { style } from '@vanilla-extract/css';
import { semanticVars } from '@fleetia/lagrange/theme';

export const sceneList = style({
  display: 'grid',
  gap: semanticVars.space.sm,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const sceneRow = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: semanticVars.space.sm,
  padding: semanticVars.space.sm,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
  '@media': {
    '(max-width: 34rem)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
});

export const sceneIdentity = style({
  display: 'grid',
  gap: semanticVars.space.xxs,
  minWidth: 0,
});

export const recovery = style({
  gridColumn: '1 / -1',
  display: 'grid',
  gap: semanticVars.space.sm,
  paddingTop: semanticVars.space.sm,
  borderTop: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
});

export const counts = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: semanticVars.space.sm,
});

export const count = style({
  display: 'grid',
  gap: semanticVars.space.xxs,
  padding: semanticVars.space.md,
  background: semanticVars.color.surface.muted,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
});
