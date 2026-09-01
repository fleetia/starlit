export type BuiltInWidgetKind = 'clock' | 'google-calendar';

export type ClockHourCycle = 'locale' | 'h12' | 'h24';

export type ClockWidgetConfig = {
  hourCycle: ClockHourCycle;
  showSeconds: boolean;
};

export type GoogleCalendarWidgetConfig = {
  maxEvents: number;
  showAllDay: boolean;
};

export type BuiltInWidgetConfigByKind = {
  clock: ClockWidgetConfig;
  'google-calendar': GoogleCalendarWidgetConfig;
};

export type BuiltInWidgetInstanceLike = {
  kind: BuiltInWidgetKind;
};

export type BuiltInWidgetDefinition<Kind extends BuiltInWidgetKind> = {
  defaultConfig: BuiltInWidgetConfigByKind[Kind];
  kind: Kind;
  maxInstancesPerScene: 1;
};
