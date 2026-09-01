import { describe, expect, it } from 'vitest';

import { BUILT_IN_WIDGET_KINDS, getBuiltInWidgetDefinition } from './registry';

describe('built-in widget registry', () => {
  it('registers Clock and generic Calendar without instance limits', () => {
    expect(BUILT_IN_WIDGET_KINDS).toEqual(['calendar', 'clock']);
    expect(getBuiltInWidgetDefinition('calendar')).toEqual({
      defaultConfig: { feedUrl: null, maxEvents: 8, showAllDay: true },
      kind: 'calendar',
    });
    expect(getBuiltInWidgetDefinition('clock').defaultConfig).toMatchObject({
      appearance: 'digital',
      format: 'HH:mm',
    });
  });
});
