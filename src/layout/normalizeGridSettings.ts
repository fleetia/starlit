import {
  DEFAULT_GRID_SETTINGS,
  LEGACY_DEFAULT_GRID_SETTINGS,
} from './defaults';
import type { GridSettings, Placement } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveDefaultLeaves(
  current: unknown,
  legacyDefault: unknown,
  nextDefault: unknown,
  translateLegacyDefaults: boolean,
): unknown {
  if (isRecord(nextDefault)) {
    const currentRecord = isRecord(current) ? current : {};
    const legacyRecord = isRecord(legacyDefault) ? legacyDefault : {};
    const result: Record<string, unknown> = { ...currentRecord };

    for (const [key, nextValue] of Object.entries(nextDefault)) {
      result[key] = resolveDefaultLeaves(
        currentRecord[key],
        legacyRecord[key],
        nextValue,
        translateLegacyDefaults,
      );
    }

    return result;
  }

  if (current === undefined || current === null) {
    return nextDefault;
  }

  if (nextDefault !== undefined && typeof current !== typeof nextDefault) {
    return nextDefault;
  }

  return translateLegacyDefaults && Object.is(current, legacyDefault)
    ? nextDefault
    : current;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionalFiniteNumber(
  record: Record<string, unknown>,
  key: string,
): boolean {
  return record[key] === undefined || isFiniteNumber(record[key]);
}

function isOptionalString(
  record: Record<string, unknown>,
  key: string,
): boolean {
  return record[key] === undefined || typeof record[key] === 'string';
}

function isPlacement(value: unknown): value is Placement {
  return (
    value === 'top-left' ||
    value === 'top-center' ||
    value === 'top-right' ||
    value === 'center-left' ||
    value === 'center-center' ||
    value === 'center-right' ||
    value === 'bottom-left' ||
    value === 'bottom-center' ||
    value === 'bottom-right'
  );
}

function isMargin(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.top) &&
    isFiniteNumber(value.bottom) &&
    isFiniteNumber(value.left) &&
    isFiniteNumber(value.right)
  );
}

function isGridBackground(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.color === 'string' &&
    typeof value.border === 'string' &&
    typeof value.text === 'string' &&
    isOptionalString(value, 'gridImage')
  );
}

function isGridIcon(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.color === 'string' &&
    typeof value.border === 'string' &&
    typeof value.text === 'string' &&
    isOptionalFiniteNumber(value, 'borderRadius') &&
    isOptionalFiniteNumber(value, 'iconRadius') &&
    isOptionalFiniteNumber(value, 'width') &&
    isOptionalFiniteNumber(value, 'height')
  );
}

function isGridHeading(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return (
    isRecord(value) &&
    typeof value.titleColor === 'string' &&
    isOptionalString(value, 'titleBackgroundColor') &&
    isOptionalFiniteNumber(value, 'titleSize') &&
    typeof value.subtitleColor === 'string' &&
    isOptionalFiniteNumber(value, 'subtitleSize') &&
    typeof value.borderEnabled === 'boolean' &&
    isFiniteNumber(value.borderWidth) &&
    typeof value.borderColor === 'string' &&
    typeof value.subtitleHoverColor === 'string' &&
    isOptionalFiniteNumber(value, 'borderRadius')
  );
}

function isGridFolder(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return (
    isRecord(value) &&
    typeof value.color === 'string' &&
    typeof value.accent === 'string' &&
    typeof value.accentText === 'string' &&
    typeof value.text === 'string' &&
    typeof value.border === 'string'
  );
}

export function isGridSettings(value: unknown): value is GridSettings {
  return (
    isRecord(value) &&
    isFiniteNumber(value.columns) &&
    isOptionalFiniteNumber(value, 'horizontalColumns') &&
    isFiniteNumber(value.rows) &&
    typeof value.gap === 'string' &&
    isOptionalString(value, 'cardGap') &&
    isOptionalFiniteNumber(value, 'masonryColumns') &&
    isPlacement(value.position) &&
    (value.margin === undefined || isMargin(value.margin)) &&
    isGridBackground(value.background) &&
    isGridIcon(value.icon) &&
    isGridHeading(value.heading) &&
    isGridFolder(value.folder)
  );
}

export function normalizeGridSettings(
  value: unknown,
  fallback: GridSettings = DEFAULT_GRID_SETTINGS,
): GridSettings {
  const normalized = resolveDefaultLeaves(
    value,
    LEGACY_DEFAULT_GRID_SETTINGS,
    fallback,
    true,
  );

  return isGridSettings(normalized) ? normalized : fallback;
}

export function decodeGridSettings(
  value: unknown,
  fallback: GridSettings = DEFAULT_GRID_SETTINGS,
): GridSettings {
  if (isGridSettings(value)) {
    return value;
  }

  const decoded = resolveDefaultLeaves(value, undefined, fallback, false);

  return isGridSettings(decoded) ? decoded : fallback;
}
