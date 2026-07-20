import { style } from '@vanilla-extract/css';
import { semanticVars } from '@fleetia/lagrange/theme';

export const editor = style({
  position: 'fixed',
  zIndex: 40,
  inset: 0,
  color: semanticVars.color.content.primary,
  backgroundColor: 'color-mix(in srgb, black 5%, transparent)',
});

export const canvas = style({
  position: 'absolute',
  zIndex: 0,
  inset: 0,
  isolation: 'isolate',
  overflow: 'hidden',
});

export const imageTarget = style({
  position: 'absolute',
  boxSizing: 'border-box',
  display: 'block',
  margin: 0,
  padding: 0,
  border: '1px dashed transparent',
  borderRadius: 0,
  outline: 'none',
  background: 'transparent',
  cursor: 'move',
  touchAction: 'none',
  selectors: {
    '&:hover': {
      borderColor: semanticVars.color.border.strong,
    },
    '&:focus-visible': {
      borderColor: semanticVars.color.interaction.focus,
      boxShadow: `0 0 0 ${semanticVars.border.width.hairline} ${semanticVars.color.interaction.focus}`,
    },
    '&[data-selected="true"]': {
      borderColor: semanticVars.color.selection.indicator,
      boxShadow: `0 0 0 ${semanticVars.border.width.hairline} ${semanticVars.color.selection.indicator}`,
    },
  },
});

export const toolbar = style({
  position: 'fixed',
  zIndex: 1,
  top: semanticVars.space.md,
  right: semanticVars.space.md,
  boxSizing: 'border-box',
  display: 'grid',
  width: 'min(24rem, calc(100vw - 2rem))',
  maxHeight: 'calc(100vh - 2rem)',
  gap: semanticVars.space.md,
  padding: semanticVars.space.md,
  overflowY: 'auto',
  backgroundColor: semanticVars.color.surface.raised,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.strong}`,
  boxShadow: `${semanticVars.space.xs} ${semanticVars.space.xs} 0 color-mix(in srgb, ${semanticVars.color.border.strong} 35%, transparent)`,
  '@media': {
    '(max-width: 42rem)': {
      top: 'auto',
      right: semanticVars.space.md,
      bottom: semanticVars.space.md,
      maxHeight: 'calc(50vh - 1rem)',
    },
  },
});

export const toolbarHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: semanticVars.space.md,
});

export const toolbarHeading = style({
  display: 'flex',
  minWidth: 0,
  alignItems: 'center',
  gap: semanticVars.space.xs,
});

export const toolbarMoveHandle = style({
  flexShrink: 0,
  minWidth: '2rem',
  minHeight: '2rem',
  padding: 0,
  color: semanticVars.color.content.secondary,
  backgroundColor: 'transparent',
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
  cursor: 'move',
  touchAction: 'none',
  selectors: {
    '&:hover': {
      color: semanticVars.color.content.accent,
      borderColor: semanticVars.color.border.strong,
    },
    '&:focus-visible': {
      outline: `${semanticVars.border.width.hairline} solid ${semanticVars.color.interaction.focus}`,
      outlineOffset: semanticVars.space.xxs,
    },
  },
});

export const field = style({
  display: 'grid',
  minWidth: 0,
  gap: semanticVars.space.xs,
  margin: 0,
  padding: 0,
  border: 0,
});

export const label = style({
  color: semanticVars.color.content.secondary,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.caption,
  fontWeight: 700,
});

export const select = style({
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '2.25rem',
  paddingInline: semanticVars.space.sm,
  color: semanticVars.color.content.primary,
  backgroundColor: semanticVars.color.surface.canvas,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.strong}`,
  font: 'inherit',
});

export const rangeRow = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: semanticVars.space.sm,
});

export const rangeValue = style({
  minWidth: '4ch',
  color: semanticVars.color.content.secondary,
  fontFamily: semanticVars.typography.family.data,
  textAlign: 'end',
});

export const actions = style({
  display: 'flex',
  justifyContent: 'flex-end',
});

export const title = style({
  margin: 0,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.label,
});
