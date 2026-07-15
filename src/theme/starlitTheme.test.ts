import { describe, expect, it } from 'vitest';

import { DEFAULT_STARLIT_THEME } from '../newtab/defaultOptionValue';
import { getLayoutStyle, getThemeStyle } from './starlitTheme';
import { DEFAULT_GRID_SETTINGS } from '../newtab/defaultOptionValue';

describe('getThemeStyle', () => {
  it('maps the app theme to Lagrange and compatibility variables', () => {
    const style = getThemeStyle(DEFAULT_STARLIT_THEME);

    expect(style['--c-accent']).toBe(DEFAULT_STARLIT_THEME.accent);
    expect(style['--c-hover-text']).toBe(DEFAULT_STARLIT_THEME.hoverText);
    expect(style['--lagrange-semantic-color-content-accent']).toBe(
      DEFAULT_STARLIT_THEME.accent,
    );
  });
});

describe('getLayoutStyle', () => {
  it('keeps product layout values separate from the design-system theme', () => {
    const style = getLayoutStyle(DEFAULT_GRID_SETTINGS, 16, 28);

    expect(style['--em']).toBe('16px');
    expect(style['--icon-size']).toBe('28px');
    expect(style['--background-color']).toBe(
      DEFAULT_GRID_SETTINGS.background.color,
    );
    expect(style['--position']).toBe(DEFAULT_GRID_SETTINGS.position);
    expect(style['--icon-borderRadius']).toBe('1px');
    expect(style['--icon-iconRadius']).toBe('1px');
    expect(style['--icon-width']).toBe('64px');
    expect(style['--icon-height']).toBe('64px');
    expect(style['--heading-text-stroke']).toBe('0 transparent');
    expect(style['--masonry-card-width']).toContain('var(--em)');
  });
});
