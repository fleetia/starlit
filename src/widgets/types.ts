export type BuiltInWidgetKind = 'calendar' | 'clock';

export type ClockAppearance = 'analog' | 'digital';

export type ClockWidgetConfig = {
  appearance: ClockAppearance;
  format: string;
  showSecondHand: boolean;
  timeZone: string | null;
};

export type CalendarWidgetConfig = {
  feedUrl: string | null;
  maxEvents: number;
  showAllDay: boolean;
};

export type BuiltInWidgetConfigByKind = {
  calendar: CalendarWidgetConfig;
  clock: ClockWidgetConfig;
};

export type BuiltInWidgetDefinition<Kind extends BuiltInWidgetKind> = {
  defaultConfig: BuiltInWidgetConfigByKind[Kind];
  kind: Kind;
};
