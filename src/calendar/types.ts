export const GOOGLE_CALENDAR_READONLY_SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
] as const);

export const GOOGLE_CALENDAR_API_ORIGIN = 'https://www.googleapis.com';
export const GOOGLE_CALENDAR_HOST_PERMISSION = 'https://www.googleapis.com/*';

export type CalendarInfo = {
  color: string | null;
  id: string;
  isPrimary: boolean;
  name: string;
};

export type CalendarEvent = {
  allDay: boolean;
  calendarColor: string | null;
  end: string;
  htmlLink: string | null;
  start: string;
  summary: string;
};

export type CalendarFetchFailureReason =
  | 'auth-required'
  | 'forbidden'
  | 'invalid-response'
  | 'network'
  | 'not-found'
  | 'unknown';

export type CalendarFetchFailure = {
  calendarId: string;
  reason: CalendarFetchFailureReason;
};

export type CalendarEventsResult = {
  events: CalendarEvent[];
  expiresAt: number;
  failures: CalendarFetchFailure[];
  fetchedAt: number;
  isFromCache: boolean;
};

export type CalendarConnection = {
  isConnected: true;
};

export type CalendarGatewayErrorCode =
  | 'api-error'
  | 'auth-required'
  | 'invalid-request'
  | 'invalid-response'
  | 'network-error'
  | 'permission-denied'
  | 'unavailable';

export type CalendarGatewayError = Error & {
  code: CalendarGatewayErrorCode;
  status?: number;
};

export type CalendarIdentityPort = {
  getAuthToken: (details: {
    interactive: boolean;
    scopes: string[];
  }) => Promise<{ grantedScopes?: string[]; token?: string }>;
  removeCachedAuthToken: (details: { token: string }) => Promise<void>;
};

export type CalendarHostPermissionPort = {
  contains: () => Promise<boolean>;
  remove: () => Promise<boolean>;
  request: () => Promise<boolean>;
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
  identity: CalendarIdentityPort;
  localStorage: CalendarStoragePort;
  now: () => Date;
  sessionStorage: CalendarStoragePort;
};

export type CalendarGateway = {
  connect: () => Promise<CalendarConnection>;
  disconnect: () => Promise<void>;
  getSelectedCalendarIds: () => Promise<string[]>;
  listCalendars: () => Promise<CalendarInfo[]>;
  listEvents: (calendarIds: readonly string[]) => Promise<CalendarEventsResult>;
  setSelectedCalendarIds: (calendarIds: readonly string[]) => Promise<void>;
};
