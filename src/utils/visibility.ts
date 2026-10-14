// Show/hide state of groups in the settings: a room's entity groups and the
// type and area groups of the Devices page.

/** A group is visible, partly hidden or completely hidden. */
export type GroupVisibility = 'visible' | 'partial' | 'hidden';

/** How many of the ids are in the hidden set. */
export function countHidden(ids: readonly string[], hidden: ReadonlySet<string>): number {
  let count = 0;
  for (const id of ids) {
    if (hidden.has(id)) count += 1;
  }
  return count;
}

/** Visibility of a group of `total` items of which `hiddenCount` are hidden. An empty group is visible. */
export function groupVisibility(total: number, hiddenCount: number): GroupVisibility {
  if (total <= 0 || hiddenCount <= 0) return 'visible';
  return hiddenCount >= total ? 'hidden' : 'partial';
}

/** Visibility of the ids in a group. */
export function idsVisibility(ids: readonly string[], hidden: ReadonlySet<string>): GroupVisibility {
  return groupVisibility(ids.length, countHidden(ids, hidden));
}

/**
 * The eye button of a group hides the group while anything in it is shown,
 * and shows everything once the whole group is hidden.
 */
export function hidesOnToggle(visibility: GroupVisibility): boolean {
  return visibility !== 'hidden';
}

/**
 * A hidden list with the ids hidden or shown. Other ids keep their place,
 * newly hidden ids are added at the end and the result has no duplicates.
 */
export function withIdsHidden(current: readonly string[] | undefined, ids: readonly string[], hidden: boolean): string[] {
  const change = new Set(ids);
  const next = (current || []).filter((id, index, all) =>
    typeof id === 'string' && id.length > 0 && all.indexOf(id) === index && (hidden || !change.has(id))
  );
  if (hidden) {
    const present = new Set(next);
    ids.forEach((id) => {
      if (id && !present.has(id)) {
        present.add(id);
        next.push(id);
      }
    });
  }
  return next;
}

/**
 * The hidden list of a group after hiding or showing the whole group. Hiding
 * stores the entities the group has now, not the group itself, so entities
 * added to the group later are still shown. Entries that are no longer part
 * of the group are dropped.
 */
export function groupHiddenIds(current: readonly string[] | undefined, groupIds: readonly string[], hidden: boolean): string[] {
  const inGroup = new Set(groupIds);
  return withIdsHidden((current || []).filter((id) => inGroup.has(id)), groupIds, hidden);
}
