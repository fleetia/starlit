import { style } from '@vanilla-extract/css';
import { semanticVars } from '@fleetia/lagrange/theme';

export const content = style({
  display: 'grid',
  gap: semanticVars.space.sm,
  minHeight: '12rem',
});

export const hint = style({
  margin: 0,
  color: semanticVars.color.content.secondary,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.caption,
  lineHeight: semanticVars.typography.lineHeight.compact,
});
