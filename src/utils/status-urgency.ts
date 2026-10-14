import type { CoverStatusKind } from './cover-status';
import { getDomainColor } from './icons';

/** Binary sensor classes that need attention whenever they are on. */
export const ALWAYS_URGENT_DEVICE_CLASSES: ReadonlySet<string> = new Set([
  'smoke',
  'gas',
  'moisture',
  'carbon_monoxide',
  'problem',
  'safety',
  'tamper',
  'heat',
  'cold',
]);

/** Openings and motion only need attention while the alarm is triggered. */
export const ALARM_URGENT_DEVICE_CLASSES: ReadonlySet<string> = new Set([
  'motion',
  'window',
  'door',
  'opening',
  'garage_door',
]);

// Cover chips stand for the matching opening.
const COVER_KIND_DEVICE_CLASS: Partial<Record<CoverStatusKind, string>> = {
  window: 'window',
  door: 'door',
  gate: 'garage_door',
};

/** Colour of urgent chips and badges, the same red as the alarm. */
export const URGENT_STATUS_COLOR = getDomainColor('alarm_control_panel');

export interface StatusUrgencyTarget {
  domain: string;
  deviceClass?: string;
  statusKind?: CoverStatusKind;
}

/**
 * Whether a status chip or badge is urgent: the alarm panel and safety
 * sensors always are, openings and motion only while the alarm is triggered.
 * Decided by type, never by colour (motion is red without being urgent).
 */
export function isUrgentStatus(target: StatusUrgencyTarget, alarmTriggered: boolean): boolean {
  if (target.domain === 'alarm_control_panel') return true;

  let deviceClass: string | undefined;
  if (target.domain === 'binary_sensor') {
    deviceClass = target.deviceClass;
    if (deviceClass && ALWAYS_URGENT_DEVICE_CLASSES.has(deviceClass)) return true;
  } else if (target.domain === 'cover' && target.statusKind) {
    deviceClass = COVER_KIND_DEVICE_CLASS[target.statusKind];
  }
  return alarmTriggered && deviceClass !== undefined && ALARM_URGENT_DEVICE_CLASSES.has(deviceClass);
}

/** The chip or badge colour: red when urgent, else the colour of its type. */
export function statusColor(target: StatusUrgencyTarget, urgent: boolean): string {
  return urgent ? URGENT_STATUS_COLOR : getDomainColor(target.domain, target.deviceClass);
}

// Order of urgent items: the alarm itself, then safety sensors, then openings
// and motion. Other items come after them.
function urgencyRank(item: StatusUrgencyTarget & { urgent?: boolean }): number {
  if (!item.urgent) return 3;
  if (item.domain === 'alarm_control_panel') return 0;
  if (item.domain === 'binary_sensor' && item.deviceClass && ALWAYS_URGENT_DEVICE_CLASSES.has(item.deviceClass)) {
    return 1;
  }
  return 2;
}

/** Urgent items first (see urgencyRank), the order is kept otherwise. */
export function sortUrgentFirst<T extends StatusUrgencyTarget & { urgent?: boolean }>(items: readonly T[]): T[] {
  if (!items.some(item => item.urgent)) return [...items];
  return items
    .map((item, index) => ({ item, index, rank: urgencyRank(item) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ item }) => item);
}

/**
 * Marks the urgent items and moves them to the front. Returns new objects for
 * the urgent items, the input is not changed.
 */
export function applyStatusUrgency<T extends StatusUrgencyTarget & { urgent?: boolean }>(
  items: readonly T[],
  alarmTriggered: boolean
): T[] {
  return sortUrgentFirst(items.map(item => isUrgentStatus(item, alarmTriggered) ? { ...item, urgent: true } : item));
}
