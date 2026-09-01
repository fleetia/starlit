import { DEFAULT_CLOCK_WIDGET_CONFIG } from './clock';
import type {
  BuiltInWidgetDefinition,
  BuiltInWidgetInstanceLike,
  BuiltInWidgetKind,
} from './types';

const BUILT_IN_WIDGET_REGISTRY = {
  clock: {
    defaultConfig: DEFAULT_CLOCK_WIDGET_CONFIG,
    kind: 'clock',
    maxInstancesPerScene: 1,
  },
  'google-calendar': {
    defaultConfig: { maxEvents: 8, showAllDay: true },
    kind: 'google-calendar',
    maxInstancesPerScene: 1,
  },
} as const satisfies {
  [Kind in BuiltInWidgetKind]: BuiltInWidgetDefinition<Kind>;
};

export const BUILT_IN_WIDGET_KINDS = Object.freeze([
  'clock',
  'google-calendar',
] as const satisfies readonly BuiltInWidgetKind[]);

export function getBuiltInWidgetDefinition(
  kind: 'clock',
): BuiltInWidgetDefinition<'clock'>;
export function getBuiltInWidgetDefinition(
  kind: 'google-calendar',
): BuiltInWidgetDefinition<'google-calendar'>;
export function getBuiltInWidgetDefinition(
  kind: BuiltInWidgetKind,
):
  | BuiltInWidgetDefinition<'clock'>
  | BuiltInWidgetDefinition<'google-calendar'>;
export function getBuiltInWidgetDefinition(
  kind: BuiltInWidgetKind,
):
  | BuiltInWidgetDefinition<'clock'>
  | BuiltInWidgetDefinition<'google-calendar'> {
  return BUILT_IN_WIDGET_REGISTRY[kind];
}

export function canAddBuiltInWidget(
  instances: readonly BuiltInWidgetInstanceLike[],
  kind: BuiltInWidgetKind,
): boolean {
  const definition = getBuiltInWidgetDefinition(kind);
  const instanceCount = instances.filter(
    (instance) => instance.kind === kind,
  ).length;

  return instanceCount < definition.maxInstancesPerScene;
}
