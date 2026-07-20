import { style } from '@vanilla-extract/css';
import { semanticVars } from '@fleetia/lagrange/theme';

export const content = style({
  minHeight: '9rem',
});

export const step = style({
  color: semanticVars.color.content.accent,
  fontFamily: semanticVars.typography.family.data,
});

export const guideLinks = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: semanticVars.space.md,
  marginTop: semanticVars.space.md,
});

export const guideLink = style({
  color: semanticVars.color.content.accent,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.label,
  fontWeight: 700,
  textUnderlineOffset: semanticVars.space.xs,
  selectors: {
    '&:focus-visible': {
      outline: `${semanticVars.border.width.hairline} solid ${semanticVars.color.interaction.focus}`,
      outlineOffset: semanticVars.space.xs,
    },
  },
});
