import { style } from '@vanilla-extract/css';
import { componentVars, semanticVars } from '@fleetia/lagrange/theme';

export const content = style({
  display: 'grid',
  minWidth: 0,
});

export const support = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: semanticVars.space.md,
  marginBottom: semanticVars.space.md,
  padding: semanticVars.space.md,
  backgroundColor: semanticVars.color.interaction.focusSurface,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.strong}`,
  boxShadow: `inset ${semanticVars.space.xs} 0 ${semanticVars.color.interaction.primary}`,
  '@media': {
    '(max-width: 42rem)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
      gap: semanticVars.space.sm,
    },
  },
});

export const supportActions = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: semanticVars.space.sm,
  minWidth: '18rem',
  '@media': {
    '(max-width: 42rem)': {
      minWidth: 0,
      width: '100%',
    },
  },
});

export const supportLink = style({
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: componentVars.control.compactHeight,
  margin: 0,
  padding: `${semanticVars.space.xxs} ${semanticVars.space.sm}`,
  color: componentVars.button.primaryText,
  backgroundColor: componentVars.button.primaryBackground,
  border: `${semanticVars.border.width.hairline} solid ${componentVars.button.primaryBackground}`,
  borderRadius: semanticVars.shape.radius.none,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.caption,
  fontWeight: 700,
  lineHeight: semanticVars.typography.lineHeight.compact,
  letterSpacing: '0.025em',
  textAlign: 'center',
  textDecoration: 'none',
  transition: 'background-color 0.1s, color 0.1s',
  selectors: {
    '&:hover': {
      backgroundColor: componentVars.button.primaryHoverBackground,
      borderColor: componentVars.button.primaryHoverBackground,
    },
    '&:focus-visible': {
      outline: 'none',
      boxShadow: `inset ${semanticVars.space.xs} 0 ${componentVars.button.focusIndicator}`,
    },
  },
});

export const supportLinkSecondary = style({
  color: componentVars.button.secondaryText,
  backgroundColor: 'transparent',
  borderColor: semanticVars.color.border.strong,
  selectors: {
    '&:hover': {
      backgroundColor: componentVars.button.secondaryHoverBackground,
      borderColor: semanticVars.color.border.strong,
    },
  },
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

export const bookmarkGuide = style({
  color: semanticVars.color.content.secondary,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.caption,
});

export const bookmarkGuideSummary = style({
  width: 'fit-content',
  color: semanticVars.color.content.accent,
  cursor: 'pointer',
  fontWeight: 700,
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

export const bookmarkGuideContent = style({
  marginTop: semanticVars.space.sm,
  paddingInlineStart: semanticVars.space.md,
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
