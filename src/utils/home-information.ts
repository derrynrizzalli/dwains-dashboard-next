// Pure helpers for the Home information popups (people, climate and device
// groups). The dialogs only render what these return.

/** Service calls the room and "all" actions of a popup can run. */
export type BulkDomainAction = 'turn_on' | 'turn_off' | 'open_cover' | 'close_cover' | 'lock' | 'unlock';

/** Domains whose entities are switched on and off. */
export const TOGGLE_DOMAINS: ReadonlySet<string> = new Set(['light', 'switch', 'fan', 'input_boolean']);

/** Rooms with this many entities or fewer take half the width on desktop. */
export const COMPACT_ROOM_MAX_ENTITIES = 2;

export function isCompactRoom(entityCount: number): boolean {
  return entityCount <= COMPACT_ROOM_MAX_ENTITIES;
}

export interface RoomGroupLike {
  areaId: string;
  areaName: string;
}

/**
 * Room groups in the order the dashboard shows its areas (`areaOrder`, the
 * area ids from `sortAreas`). Rooms that are not in that list, like hidden
 * outdoor areas, follow alphabetically.
 */
export function orderRoomGroups<T extends RoomGroupLike>(
  groups: readonly T[],
  areaOrder: readonly string[],
  locale?: string
): T[] {
  const position = new Map(areaOrder.map((areaId, index) => [areaId, index]));
  return [...groups].sort((a, b) => {
    const aIndex = position.get(a.areaId) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = position.get(b.areaId) ?? Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.areaName.localeCompare(b.areaName, locale);
  });
}

export function countActiveEntities(entityIds: readonly string[], isActive: (entityId: string) => boolean): number {
  let count = 0;
  for (const entityId of entityIds) {
    if (isActive(entityId)) count++;
  }
  return count;
}

export interface RoomSegmentItem {
  action: BulkDomainAction;
  /** Translation key of the action label. */
  labelKey: string;
  icon: string;
  /** Matches the current state of the room (all closed, something unlocked, ...). */
  current: boolean;
}

export type RoomAction =
  | {
      mode: 'toggle';
      /** What a press does: switch everything off when something is on, otherwise on. */
      action: 'turn_on' | 'turn_off';
      checked: boolean;
      activeCount: number;
      totalCount: number;
    }
  | { mode: 'segmented'; items: RoomSegmentItem[] };

/**
 * The action in the header of a room card. Switches get an "active/total"
 * toggle, but only when the room has more than one of them (a single entity
 * has its own switch). Covers get open/close and locks lock/unlock.
 * `activeCount` counts entities that are on, open or unlocked.
 */
export function getRoomAction(domain: string, activeCount: number, totalCount: number): RoomAction | undefined {
  if (totalCount <= 0) return undefined;

  if (TOGGLE_DOMAINS.has(domain)) {
    if (totalCount <= 1) return undefined;
    const checked = activeCount > 0;
    return { mode: 'toggle', action: checked ? 'turn_off' : 'turn_on', checked, activeCount, totalCount };
  }

  if (domain === 'cover') {
    return {
      mode: 'segmented',
      items: [
        { action: 'open_cover', labelKey: 'action.open_all', icon: 'mdi:arrow-up', current: activeCount > 0 },
        { action: 'close_cover', labelKey: 'action.close_all', icon: 'mdi:arrow-down', current: activeCount === 0 },
      ],
    };
  }

  if (domain === 'lock') {
    return {
      mode: 'segmented',
      items: [
        { action: 'lock', labelKey: 'action.lock_all', icon: 'mdi:lock-outline', current: activeCount === 0 },
        { action: 'unlock', labelKey: 'action.unlock_all', icon: 'mdi:lock-open-variant-outline', current: activeCount > 0 },
      ],
    };
  }

  return undefined;
}

/**
 * Whether a room action asks first. Unlocking always asks; everything else
 * follows the master action confirmation setting of the domain.
 */
export function roomActionNeedsConfirmation(action: BulkDomainAction, confirmationEnabled: boolean): boolean {
  return action === 'unlock' || confirmationEnabled;
}

/** Actions that switch something off, close it or unlock it. */
export function isDestructiveBulkAction(action: BulkDomainAction): boolean {
  return action === 'turn_off' || action === 'close_cover' || action === 'unlock';
}

export type PersonPresence = 'home' | 'away' | 'zone' | 'unknown';

/** A person without a (working) device tracker reports unknown or unavailable. */
export function personPresence(state: string | null | undefined): PersonPresence {
  const value = String(state ?? '').toLowerCase();
  if (!value || value === 'unknown' || value === 'unavailable') return 'unknown';
  if (value === 'home') return 'home';
  if (value === 'not_home') return 'away';
  return 'zone';
}
