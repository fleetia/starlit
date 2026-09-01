import { describe, expect, it } from 'vitest';

import {
  BUILT_IN_WIDGET_KINDS,
  canAddBuiltInWidget,
  getBuiltInWidgetDefinition,
} from './registry';

describe('built-in widget registry', () => {
  it('owns only the clock and Google Calendar widget kinds', () => {
    expect(BUILT_IN_WIDGET_KINDS).toEqual(['clock', 'google-calendar']);
  });

  it('allows at most one instance of each kind per Scene', () => {
    const instances = [{ kind: 'clock' as const }];

    expect(canAddBuiltInWidget(instances, 'clock')).toBe(false);
    expect(canAddBuiltInWidget(instances, 'google-calendar')).toBe(true);
    expect(getBuiltInWidgetDefinition('google-calendar')).toMatchObject({
      kind: 'google-calendar',
      maxInstancesPerScene: 1,
    });
  });
});
