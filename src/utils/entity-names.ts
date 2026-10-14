import type { DwainsDashboardSettings } from '../types/strategy';

// Entity names often repeat the room: "Living room Ceiling light" or
// "Ceiling light (Living room)". Pages and groups that already show the room
// drop that part, so the tile reads "Ceiling light".

/** Characters that may sit between an area name and the rest of a name. */
const SEPARATOR_CHARS = String.raw`\-_:|/·–—`;
/** A separator that is required: whitespace and/or punctuation. */
const SEPARATOR = String.raw`(?:\s*[${SEPARATOR_CHARS}]+\s*|\s+)`;
/** Next to a bracketed area name the separator may be left out. */
const OPTIONAL_SEPARATOR = String.raw`(?:\s*[${SEPARATOR_CHARS}]+\s*|\s*)`;

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function capitalizeFirstWord(name: string): string {
  const firstWord = name.split(/\s/, 1)[0] || '';
  // Keep brand style names like "iPhone" or "HomePod" untouched, like Home Assistant does.
  if (firstWord !== firstWord.toLowerCase()) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export interface StripAreaNameOptions {
  /** Also remove the area name at the end of the name. Default true. */
  atEnd?: boolean;
}

/**
 * Removes the area name from the start or the end of an entity name. Only the
 * whole area name is removed, as a separate word or between brackets: in the
 * area "Kitchen", "Kitchen Spots", "Spots - Kitchen" and "Spots (Kitchen)"
 * become "Spots", while "Kitchenette lamp" stays as it is. The match ignores
 * case and the result is never empty: a name that is only the area name is
 * returned unchanged.
 */
export function stripAreaNameFromEntityName(
  name: string,
  areaName?: string | null,
  options: StripAreaNameOptions = {}
): string {
  const original = String(name ?? '');
  const trimmed = original.trim();
  const area = String(areaName ?? '').trim();
  if (!trimmed || !area) return original;

  // Any run of whitespace in the area name matches any run in the entity name.
  const escapedArea = escapeRegExp(area).replace(/\s+/g, String.raw`\s+`);
  const bracketed = String.raw`(?:\(\s*${escapedArea}\s*\)|\[\s*${escapedArea}\s*\])`;
  const atStart = new RegExp(`^(?:${bracketed}${OPTIONAL_SEPARATOR}|${escapedArea}${SEPARATOR})`, 'iu');
  const atEnd = new RegExp(`(?:${OPTIONAL_SEPARATOR}${bracketed}|${SEPARATOR}${escapedArea})$`, 'iu');

  let result = trimmed;
  const withoutStart = result.replace(atStart, '');
  const strippedStart = withoutStart !== result;
  result = withoutStart.trim();
  if (options.atEnd !== false && result) result = result.replace(atEnd, '').trim();

  if (!result) return original;
  return strippedStart ? capitalizeFirstWord(result) : result;
}

/**
 * Whether entity names drop the area name on pages that already show the
 * area. On by default, so the setting only stores an opt-out.
 */
export function hidesAreaNameInEntityNames(settings?: DwainsDashboardSettings | null): boolean {
  return settings?.hide_area_name_in_entity_names !== false;
}

/** The name to show for an entity inside its area, following the setting. */
export function areaEntityDisplayName(
  name: string,
  areaName: string | null | undefined,
  settings?: DwainsDashboardSettings | null
): string {
  return hidesAreaNameInEntityNames(settings) ? stripAreaNameFromEntityName(name, areaName) : name;
}
