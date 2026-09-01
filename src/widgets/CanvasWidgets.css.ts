import { style } from '@vanilla-extract/css';

export const compositor = style({
  position: 'fixed',
  inset: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
});

export const frame = style({
  position: 'absolute',
  minWidth: 0,
  pointerEvents: 'auto',
});
