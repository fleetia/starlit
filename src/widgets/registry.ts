import { DEFAULT_CLOCK_WIDGET_CONFIG } from './clock';
import type { BuiltInWidgetDefinition, BuiltInWidgetKind } from './types';

const BUILT_IN_WIDGET_REGISTRY = {
  calendar: {
    defaultConfig: { feedUrl: null, maxEvents: 8, showAllDay: true },
    kind: 'calendar',
  },
  clock: {
    defaultConfig: DEFAULT_CLOCK_WIDGET_CONFIG,
    kind: 'clock',
  },
} as const satisfies {
  [Kind in BuiltInWidgetKind]: BuiltInWidgetDefinition<Kind>;
};

export const BUILT_IN_WIDGET_KINDS = Object.freeze([
  'calendar',
  'clock',
] as const satisfies readonly BuiltInWidgetKind[]);

export function getBuiltInWidgetDefinition(
  kind: 'calendar',
): BuiltInWidgetDefinition<'calendar'>;

export function getBuiltInWidgetDefinition(
  kind: 'clock',
): BuiltInWidgetDefinition<'clock'>;
export function getBuiltInWidgetDefinition(
  kind: BuiltInWidgetKind,
): BuiltInWidgetDefinition<'calendar'> | BuiltInWidgetDefinition<'clock'>;
export function getBuiltInWidgetDefinition(
  kind: BuiltInWidgetKind,
): BuiltInWidgetDefinition<'calendar'> | BuiltInWidgetDefinition<'clock'> {
  return BUILT_IN_WIDGET_REGISTRY[kind];
}
