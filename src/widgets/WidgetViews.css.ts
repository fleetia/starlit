import { style } from '@vanilla-extract/css';
import { semanticVars } from '@fleetia/lagrange/theme';

export const widget = style({
  boxSizing: 'border-box',
  display: 'grid',
  minWidth: 0,
  height: '100%',
  padding: semanticVars.space.md,
  overflow: 'hidden',
  color: semanticVars.color.content.primary,
  backgroundColor: 'color-mix(in srgb, currentColor 6%, transparent)',
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
  pointerEvents: 'auto',
});

export const clock = style({
  placeItems: 'center',
  fontFamily: semanticVars.typography.family.ui,
  fontSize: 'clamp(1.25rem, 2.25vw, 2.25rem)',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1,
  backgroundColor: 'color-mix(in srgb, currentColor 3%, transparent)',
});

export const calendar = style({
  alignContent: 'start',
  gap: semanticVars.space.sm,
  overflowY: 'auto',
});

export const events = style({
  display: 'grid',
  gap: semanticVars.space.xs,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const eventLink = style({
  display: 'grid',
  gridTemplateColumns: '0.35rem minmax(0, 1fr)',
  gap: semanticVars.space.xs,
  alignItems: 'center',
  color: 'inherit',
  textDecoration: 'none',
});

export const eventColor = style({
  width: '0.25rem',
  height: '100%',
  minHeight: '1.5rem',
  background: 'currentColor',
});

export const eventText = style({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const status = style({
  margin: 0,
  color: semanticVars.color.content.secondary,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.caption,
});
