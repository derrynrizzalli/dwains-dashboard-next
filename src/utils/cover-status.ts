import type { HassEntity } from '../types/home-assistant';

/** The header status chip a cover is counted in. */
export type CoverStatusKind = 'window' | 'door' | 'gate' | 'shading';

const GATE_COVER_CLASSES: ReadonlySet<string> = new Set(['garage', 'garage_door', 'gate']);

function coverDeviceClass(state: HassEntity): string {
  return String(state.attributes?.device_class || '').toLowerCase();
}

function coverPosition(state: HassEntity): number | undefined {
  const raw = state.attributes?.current_position;
  if (raw === undefined || raw === null || raw === '') return undefined;
  const position = Number(raw);
  return Number.isFinite(position) ? position : undefined;
}

/**
 * Windows, doors and gates get their own chip; every other cover, including
 * covers without a device class, counts as shading.
 */
export function coverStatusKind(state: HassEntity | undefined): CoverStatusKind {
  const deviceClass = state ? coverDeviceClass(state) : '';
  if (deviceClass === 'window') return 'window';
  if (deviceClass === 'door') return 'door';
  if (GATE_COVER_CLASSES.has(deviceClass)) return 'gate';
  return 'shading';
}

/**
 * Whether a cover counts in its status chip. Windows, doors and gates count
 * while they are (partly) open. Shading counts while it is (partly) closed,
 * except awnings, which protect when they are rolled out, so they count while
 * open.
 */
export function isCoverStatusActive(state: HassEntity | undefined): boolean {
  if (!state) return false;
  const value = String(state.state || '').toLowerCase();
  if (value === 'unavailable' || value === 'unknown') return false;

  const position = coverPosition(state);
  const open = value === 'open' || value === 'opening' || (position !== undefined && position > 0);
  if (coverStatusKind(state) !== 'shading' || coverDeviceClass(state) === 'awning') return open;
  return value === 'closed' || value === 'closing' || (position !== undefined && position < 100);
}
