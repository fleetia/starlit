import { globalStyle, style } from '@vanilla-extract/css';
import { semanticVars } from '@fleetia/lagrange/theme';

globalStyle('html, body, #root', {
  minHeight: '100%',
  margin: 0,
});

globalStyle('*', {
  boxSizing: 'border-box',
});

export const root = style({
  minHeight: '100vh',
  color: semanticVars.color.content.primary,
  backgroundColor: semanticVars.color.surface.canvas,
  backgroundImage:
    'radial-gradient(circle at 1px 1px, color-mix(in srgb, currentColor 11%, transparent) 1px, transparent 0)',
  backgroundSize: '16px 16px',
});

export const shell = style({
  width: 'min(80rem, 100%)',
  margin: '0 auto',
  padding: `${semanticVars.space.xxl} ${semanticVars.space.xl}`,
  '@media': {
    '(max-width: 40rem)': {
      padding: `${semanticVars.space.lg} ${semanticVars.space.md}`,
    },
  },
});

export const masthead = style({
  overflow: 'hidden',
  backgroundColor: semanticVars.color.surface.raised,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.strong}`,
});

export const topBar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: semanticVars.space.md,
  padding: `${semanticVars.space.md} ${semanticVars.space.xl}`,
  backgroundColor: semanticVars.color.surface.muted,
  borderBottom: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
  '@media': {
    '(max-width: 40rem)': {
      alignItems: 'flex-start',
      padding: semanticVars.space.md,
    },
  },
});

export const brand = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: semanticVars.space.sm,
  color: semanticVars.color.content.primary,
  fontFamily: semanticVars.typography.family.data,
  fontSize: semanticVars.typography.size.label,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textDecoration: 'none',
  textTransform: 'uppercase',
  selectors: {
    '&:focus-visible': {
      outline: `${semanticVars.border.width.hairline} solid ${semanticVars.color.interaction.focus}`,
      outlineOffset: semanticVars.space.xs,
    },
  },
});

export const brandMark = style({
  display: 'grid',
  width: '1.75rem',
  height: '1.75rem',
  placeItems: 'center',
  color: semanticVars.color.content.onAccent,
  backgroundColor: semanticVars.color.interaction.primary,
});

export const languageNav = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: semanticVars.space.xs,
});

export const languageLink = style({
  padding: `${semanticVars.space.xs} ${semanticVars.space.sm}`,
  color: semanticVars.color.content.primary,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.label,
  textDecoration: 'none',
  selectors: {
    '&[aria-current="page"]': {
      color: semanticVars.color.content.onAccent,
      backgroundColor: semanticVars.color.interaction.primary,
      borderColor: semanticVars.color.interaction.primary,
    },
    '&:hover': {
      borderColor: semanticVars.color.border.strong,
    },
    '&:focus-visible': {
      outline: `${semanticVars.border.width.hairline} solid ${semanticVars.color.interaction.focus}`,
      outlineOffset: semanticVars.space.xs,
    },
  },
});

export const hero = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(18rem, 0.8fr)',
  gap: semanticVars.space.xxl,
  alignItems: 'center',
  padding: semanticVars.space.xxl,
  '@media': {
    '(max-width: 52rem)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
      gap: semanticVars.space.xl,
    },
    '(max-width: 40rem)': {
      padding: semanticVars.space.xl,
    },
  },
});

export const heroCopy = style({
  display: 'grid',
  gap: semanticVars.space.lg,
  alignContent: 'center',
});

export const badge = style({
  width: 'fit-content',
  padding: `${semanticVars.space.xs} ${semanticVars.space.sm}`,
  color: semanticVars.color.content.accent,
  backgroundColor: semanticVars.color.surface.muted,
  fontFamily: semanticVars.typography.family.data,
  letterSpacing: '0.06em',
});

export const heroTitle = style({
  maxWidth: '14ch',
});

export const heroIntro = style({
  maxWidth: '54ch',
  margin: 0,
  color: semanticVars.color.content.secondary,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.body,
  lineHeight: semanticVars.typography.lineHeight.body,
});

export const quickStart = style({
  padding: semanticVars.space.xl,
  backgroundColor: semanticVars.color.surface.muted,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
});

export const quickStartTitle = style({
  margin: 0,
  fontFamily: semanticVars.typography.family.data,
  fontSize: '1rem',
  letterSpacing: '0.04em',
});

export const quickStartDescription = style({
  margin: `${semanticVars.space.sm} 0 0`,
  color: semanticVars.color.content.secondary,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.label,
  lineHeight: semanticVars.typography.lineHeight.body,
});

export const quickStartList = style({
  display: 'grid',
  gap: semanticVars.space.md,
  margin: `${semanticVars.space.lg} 0 0`,
  padding: 0,
  listStyle: 'none',
});

export const quickStartItem = style({
  display: 'grid',
  gridTemplateColumns: '2rem minmax(0, 1fr)',
  gap: semanticVars.space.sm,
  alignItems: 'start',
  fontFamily: semanticVars.typography.family.ui,
});

export const quickStartItemBody = style({
  margin: `${semanticVars.space.xs} 0 0`,
  color: semanticVars.color.content.secondary,
  fontSize: semanticVars.typography.size.label,
  lineHeight: semanticVars.typography.lineHeight.body,
});

export const quickStartNumber = style({
  display: 'grid',
  width: '2rem',
  height: '2rem',
  placeItems: 'center',
  color: semanticVars.color.content.onAccent,
  backgroundColor: semanticVars.color.interaction.primary,
  fontFamily: semanticVars.typography.family.data,
  fontSize: semanticVars.typography.size.label,
  fontWeight: 700,
});

export const layout = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(14rem, 0.27fr) minmax(0, 1fr)',
  gap: semanticVars.space.xl,
  marginTop: semanticVars.space.xl,
  '@media': {
    '(max-width: 52rem)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
});

export const contents = style({
  position: 'sticky',
  top: semanticVars.space.xl,
  alignSelf: 'start',
  maxHeight: 'calc(100vh - 3rem)',
  overflowY: 'auto',
  padding: semanticVars.space.lg,
  backgroundColor: semanticVars.color.surface.muted,
  '@media': {
    '(max-width: 52rem)': {
      position: 'static',
      maxHeight: 'none',
      overflowY: 'visible',
    },
  },
});

export const contentsTitle = style({
  margin: 0,
  color: semanticVars.color.content.primary,
  fontFamily: semanticVars.typography.family.data,
  fontSize: semanticVars.typography.size.label,
  fontWeight: 700,
  letterSpacing: '0.04em',
});

export const contentsList = style({
  display: 'grid',
  gap: semanticVars.space.xs,
  margin: `${semanticVars.space.md} 0 0`,
  padding: 0,
  listStyle: 'none',
  '@media': {
    '(min-width: 40.001rem) and (max-width: 52rem)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
  },
});

export const contentsLink = style({
  display: 'grid',
  gridTemplateColumns: '2rem minmax(0, 1fr)',
  gap: semanticVars.space.sm,
  alignItems: 'baseline',
  padding: `${semanticVars.space.sm} ${semanticVars.space.xs}`,
  color: semanticVars.color.content.primary,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.label,
  lineHeight: semanticVars.typography.lineHeight.body,
  textDecoration: 'none',
  selectors: {
    '&:hover': {
      color: semanticVars.color.content.accent,
      backgroundColor: semanticVars.color.surface.raised,
    },
    '&:focus-visible': {
      outline: `${semanticVars.border.width.hairline} solid ${semanticVars.color.interaction.focus}`,
      outlineOffset: semanticVars.space.xs,
    },
  },
});

export const contentsNumber = style({
  color: semanticVars.color.content.accent,
  fontFamily: semanticVars.typography.family.data,
  fontSize: semanticVars.typography.size.caption,
});

export const main = style({
  minWidth: 0,
});

export const screenshotNote = style({
  margin: `0 0 ${semanticVars.space.xl}`,
  padding: `${semanticVars.space.md} ${semanticVars.space.lg}`,
  color: semanticVars.color.content.secondary,
  backgroundColor: semanticVars.color.surface.muted,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.label,
  lineHeight: semanticVars.typography.lineHeight.body,
});

export const dataOwnership = style({
  padding: semanticVars.space.xl,
  backgroundColor: semanticVars.color.surface.raised,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.strong}`,
});

export const overviewHeader = style({
  display: 'grid',
  gap: semanticVars.space.sm,
  maxWidth: '60ch',
});

export const overviewDescription = style({
  margin: 0,
  color: semanticVars.color.content.secondary,
});

export const dataGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: semanticVars.space.md,
  marginTop: semanticVars.space.xl,
  '@media': {
    '(max-width: 40rem)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
});

export const dataCard = style({
  padding: semanticVars.space.lg,
  backgroundColor: semanticVars.color.surface.muted,
  fontFamily: semanticVars.typography.family.ui,
});

export const dataCardTitle = style({
  margin: 0,
  fontFamily: semanticVars.typography.family.data,
  fontSize: semanticVars.typography.size.label,
  letterSpacing: '0.03em',
});

export const dataCardList = style({
  display: 'grid',
  gap: semanticVars.space.sm,
  margin: `${semanticVars.space.md} 0 0`,
  paddingInlineStart: semanticVars.space.xl,
  color: semanticVars.color.content.secondary,
  fontSize: semanticVars.typography.size.label,
  lineHeight: semanticVars.typography.lineHeight.body,
});

export const sections = style({
  display: 'grid',
  gap: semanticVars.space.xl,
  marginTop: semanticVars.space.xl,
});

export const section = style({
  padding: semanticVars.space.xl,
  backgroundColor: semanticVars.color.surface.raised,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
  '@media': {
    '(max-width: 40rem)': {
      padding: semanticVars.space.lg,
    },
  },
});

export const sectionHeader = style({
  display: 'grid',
  gap: semanticVars.space.sm,
  maxWidth: '62ch',
});

export const sectionKicker = style({
  margin: 0,
  color: semanticVars.color.content.accent,
  fontFamily: semanticVars.typography.family.data,
  fontSize: semanticVars.typography.size.caption,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});

export const sectionHeading = style({
  scrollMarginTop: semanticVars.space.xl,
  selectors: {
    '&:focus-visible': {
      outline: `${semanticVars.border.width.hairline} solid ${semanticVars.color.interaction.focus}`,
      outlineOffset: semanticVars.space.xs,
    },
  },
});

export const sectionDescription = style({
  margin: 0,
  color: semanticVars.color.content.secondary,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.body,
  lineHeight: semanticVars.typography.lineHeight.body,
});

export const mediaGallery = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: semanticVars.space.md,
  marginTop: semanticVars.space.xl,
});

export const figure = style({
  margin: 0,
});

export const caption = style({
  marginTop: semanticVars.space.sm,
  color: semanticVars.color.content.secondary,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.caption,
  lineHeight: semanticVars.typography.lineHeight.body,
});

export const imageFrame = style({
  display: 'grid',
  minHeight: '12rem',
  padding: semanticVars.space.md,
  placeItems: 'center',
  overflow: 'hidden',
  backgroundColor: semanticVars.color.surface.muted,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.strong}`,
});

export const image = style({
  display: 'block',
  maxWidth: '100%',
  height: 'auto',
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
});

export const imageLink = style({
  display: 'grid',
  maxWidth: '100%',
  placeItems: 'center',
  selectors: {
    '&:focus-visible': {
      outline: `${semanticVars.border.width.hairline} solid ${semanticVars.color.interaction.focus}`,
      outlineOffset: semanticVars.space.xs,
    },
  },
});

export const articleGrid = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.35fr) minmax(15rem, 0.65fr)',
  gap: semanticVars.space.xl,
  marginTop: semanticVars.space.xl,
  '@media': {
    '(max-width: 64rem)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
});

export const minorHeading = style({
  margin: 0,
  color: semanticVars.color.content.primary,
  fontFamily: semanticVars.typography.family.data,
  fontSize: semanticVars.typography.size.label,
  letterSpacing: '0.04em',
});

export const stepList = style({
  display: 'grid',
  gap: semanticVars.space.lg,
  margin: `${semanticVars.space.lg} 0 0`,
  padding: 0,
  listStyle: 'none',
});

export const step = style({
  display: 'grid',
  gridTemplateColumns: '2.25rem minmax(0, 1fr)',
  gap: semanticVars.space.md,
  alignItems: 'start',
  fontFamily: semanticVars.typography.family.ui,
});

export const stepTitle = style({
  margin: 0,
  fontSize: semanticVars.typography.size.body,
});

export const stepBody = style({
  margin: `${semanticVars.space.xs} 0 0`,
  color: semanticVars.color.content.secondary,
  fontSize: semanticVars.typography.size.label,
  lineHeight: semanticVars.typography.lineHeight.body,
});

export const stepNumber = style({
  display: 'grid',
  width: '2.25rem',
  height: '2.25rem',
  placeItems: 'center',
  color: semanticVars.color.content.accent,
  backgroundColor: semanticVars.color.surface.muted,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.strong}`,
  fontFamily: semanticVars.typography.family.data,
  fontSize: semanticVars.typography.size.label,
  fontWeight: 700,
});

export const factsPanel = style({
  alignSelf: 'start',
  padding: semanticVars.space.lg,
  backgroundColor: semanticVars.color.surface.muted,
});

export const factsList = style({
  display: 'grid',
  gap: semanticVars.space.sm,
  margin: `${semanticVars.space.md} 0 0`,
  paddingInlineStart: semanticVars.space.xl,
  color: semanticVars.color.content.secondary,
  fontFamily: semanticVars.typography.family.ui,
  fontSize: semanticVars.typography.size.label,
  lineHeight: semanticVars.typography.lineHeight.body,
});

export const callout = style({
  marginTop: semanticVars.space.xl,
  padding: semanticVars.space.lg,
  backgroundColor: semanticVars.color.surface.muted,
  fontFamily: semanticVars.typography.family.ui,
});

export const calloutBody = style({
  margin: `${semanticVars.space.xs} 0 0`,
  color: semanticVars.color.content.secondary,
  fontSize: semanticVars.typography.size.label,
  lineHeight: semanticVars.typography.lineHeight.body,
});

export const detailsGroup = style({
  display: 'grid',
  gap: semanticVars.space.sm,
  marginTop: semanticVars.space.xl,
});

export const detail = style({
  backgroundColor: semanticVars.color.surface.raised,
  borderTop: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.subtle}`,
  fontFamily: semanticVars.typography.family.ui,
});

export const detailSummary = style({
  padding: `${semanticVars.space.md} 0`,
  color: semanticVars.color.content.accent,
  cursor: 'pointer',
  fontSize: semanticVars.typography.size.label,
  fontWeight: 700,
  selectors: {
    '&:focus-visible': {
      outline: `${semanticVars.border.width.hairline} solid ${semanticVars.color.interaction.focus}`,
      outlineOffset: semanticVars.space.xs,
    },
  },
});

export const detailBody = style({
  margin: `0 0 ${semanticVars.space.md}`,
  color: semanticVars.color.content.secondary,
  fontSize: semanticVars.typography.size.label,
  lineHeight: semanticVars.typography.lineHeight.body,
});

export const support = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: semanticVars.space.xl,
  marginTop: semanticVars.space.xl,
  padding: semanticVars.space.xl,
  backgroundColor: semanticVars.color.surface.raised,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.border.strong}`,
  fontFamily: semanticVars.typography.family.ui,
  '@media': {
    '(max-width: 40rem)': {
      alignItems: 'stretch',
      flexDirection: 'column',
    },
  },
});

export const supportTitle = style({
  margin: 0,
  fontFamily: semanticVars.typography.family.data,
  fontSize: '1rem',
});

export const supportDescription = style({
  maxWidth: '50ch',
  margin: `${semanticVars.space.sm} 0 0`,
  color: semanticVars.color.content.secondary,
  fontSize: semanticVars.typography.size.label,
  lineHeight: semanticVars.typography.lineHeight.body,
});

export const supportLinks = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: semanticVars.space.sm,
});

export const supportLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: semanticVars.space.md,
  padding: `${semanticVars.space.sm} ${semanticVars.space.md}`,
  color: semanticVars.color.content.onAccent,
  backgroundColor: semanticVars.color.interaction.primary,
  border: `${semanticVars.border.width.hairline} solid ${semanticVars.color.interaction.primary}`,
  fontSize: semanticVars.typography.size.label,
  fontWeight: 700,
  textDecoration: 'none',
  selectors: {
    '&:hover': {
      backgroundColor: semanticVars.color.interaction.primaryHover,
    },
    '&:focus-visible': {
      outline: `${semanticVars.border.width.hairline} solid ${semanticVars.color.interaction.focus}`,
      outlineOffset: semanticVars.space.xs,
    },
  },
});
