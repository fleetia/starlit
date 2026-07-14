import { style } from '@vanilla-extract/css';
import { semanticVars } from '@fleetia/lagrange/theme';

export const content = style({
  display: 'grid',
  minWidth: 0,
});

export const primaryTabs = style({
  minWidth: 0,
});

export const panel = style({
  minWidth: 0,
  minHeight: '24rem',
});

export const appearanceTabs = style({
  minWidth: 0,
  minHeight: '22rem',
});

export const fieldGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: semanticVars.space.md,
  '@media': {
    '(max-width: 42rem)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
});

export const marginGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: semanticVars.space.sm,
  marginTop: semanticVars.space.md,
  '@media': {
    '(max-width: 34rem)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
});

export const preview = style({
  minHeight: '8rem',
  padding: semanticVars.space.md,
  overflow: 'auto',
  color: semanticVars.color.content.primary,
  backgroundColor: semanticVars.color.surface.canvas,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.strong}`,
});

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

export const credits = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: semanticVars.space.sm,
  '@media': {
    '(max-width: 34rem)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
});

export const link = style({
  width: 'fit-content',
  color: semanticVars.color.content.accent,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.label,
  lineHeight: semanticVars.typography.lineHeight.compact,
  textDecorationLine: 'underline',
  textDecorationStyle: 'dotted',
  textUnderlineOffset: semanticVars.space.xs,
  selectors: {
    '&:hover': {
      color: semanticVars.color.interaction.primaryHover,
      textDecorationStyle: 'solid',
    },
    '&:focus-visible': {
      outline: `${semanticVars.border.width.hairline} solid ${semanticVars.color.interaction.focus}`,
      outlineOffset: semanticVars.space.xs,
    },
  },
});
