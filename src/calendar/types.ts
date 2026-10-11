export type CalendarEvent = {
  allDay: boolean;
  calendarColor: string | null;
  end: string;
  htmlLink: string | null;
  start: string;
  summary: string;
};

export type ParsedCalendarFeed = {
  events: CalendarEvent[];
  name: string;
};

export type CalendarEventsResult = ParsedCalendarFeed & {
  expiresAt: number;
  fetchedAt: number;
  isFromCache: boolean;
};

export type CalendarSubscription = {
  isConnected: true;
};

export type CalendarGatewayErrorCode =
  | 'api-error'
  | 'invalid-request'
  | 'invalid-response'
  | 'network-error'
  | 'permission-denied'
  | 'response-too-large'
  | 'unavailable';

export type CalendarGatewayError = Error & {
  code: CalendarGatewayErrorCode;
  status?: number;
};

export type CalendarHostPermissionPort = {
  contains: (originPattern: string) => Promise<boolean>;
};

export type CalendarStoragePort = {
  get: (key: string) => Promise<Record<string, unknown>>;
  remove: (keys: string | string[]) => Promise<void>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

export type CalendarFetchPort = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export type CalendarGatewayDependencies = {
  fetch: CalendarFetchPort;
  hostPermission: CalendarHostPermissionPort;
  now: () => Date;
  sessionStorage: CalendarStoragePort;
};

export type CalendarGateway = {
  listEvents: (
    feedUrl: string,
    forceRefresh?: boolean,
  ) => Promise<CalendarEventsResult>;
  subscribe: (feedUrl: string) => Promise<CalendarSubscription>;
};
