import { style } from '@vanilla-extract/css';

export const compositor = style({
  position: 'fixed',
  inset: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
});

export const image = style({
  position: 'absolute',
  display: 'block',
  maxWidth: 'none',
  objectFit: 'contain',
  pointerEvents: 'none',
  userSelect: 'none',
});
