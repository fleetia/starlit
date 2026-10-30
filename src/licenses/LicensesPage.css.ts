import { globalStyle, style } from '@vanilla-extract/css';
import { semanticVars } from '@fleetia/lagrange/theme';

globalStyle('html, body', { margin: 0 });
export const root = style({
  minHeight: '100vh',
  backgroundColor: semanticVars.color.surface.canvas,
  color: semanticVars.color.content.primary,
});
export const main = style({
  width: 'min(52rem, 100%)',
  boxSizing: 'border-box',
  margin: '0 auto',
  padding: `${semanticVars.space.xxl} ${semanticVars.space.lg}`,
});
export const header = style({ marginBottom: semanticVars.space.xxl });
export const entry = style({
  padding: `${semanticVars.space.lg} 0`,
  borderTop: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
  overflowWrap: 'anywhere',
});
export const details = style({ marginTop: semanticVars.space.md });
export const summary = style({
  cursor: 'pointer',
  fontFamily: semanticVars.typography.family.ui,
  selectors: {
    '&:focus-visible': {
      outline: `2px solid ${semanticVars.color.interaction.focus}`,
      outlineOffset: '4px',
    },
  },
});
export const notice = style({
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  fontSize: semanticVars.typography.size.caption,
  lineHeight: 1.6,
  margin: `${semanticVars.space.md} 0 0`,
});

export const links = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: semanticVars.space.md,
  marginTop: semanticVars.space.sm,
});
export const link = style({
  color: semanticVars.color.content.accent,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.label,
  textUnderlineOffset: '3px',
  selectors: {
    '&:focus-visible': {
      outline: `2px solid ${semanticVars.color.interaction.focus}`,
      outlineOffset: '4px',
    },
  },
});
