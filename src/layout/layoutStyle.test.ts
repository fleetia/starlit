import { describe, expect, it } from 'vitest';

import { DEFAULT_GRID_SETTINGS } from './defaults';
import { getLayoutStyle } from './layoutStyle';

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
    expect(style['--heading-title-background-color']).toBe(
      DEFAULT_GRID_SETTINGS.heading?.titleBackgroundColor,
    );
    expect(style['--masonry-card-width']).toContain('var(--em)');
  });
});
