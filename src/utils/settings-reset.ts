import type { AreaOptions, AreasDisplay, DeviceAdmission, DwainsDashboardSettings } from '../types/strategy';

// Reset buttons of the settings pages: what "default" means for each list and
// how the stored options look after a reset. A reset keeps every option that
// belongs to something else.

/** The area list has no hidden areas, no own order and the default sort mode. */
export function isAreasDisplayDefault(display?: AreasDisplay | null): boolean {
  return !display?.hidden?.length &&
    !display?.order?.length &&
    (!display?.sort_mode || display.sort_mode === 'alphabetical');
}

/** Shows every area again and goes back to the default sort mode. */
export function resetAreasDisplay(display?: AreasDisplay | null): AreasDisplay {
  const { hidden: _hidden, order: _order, sort_mode: _sortMode, ...rest } = display || {};
  return rest;
}

function hasGroupOptions(options?: AreaOptions | null): boolean {
  return Object.values(options?.groups_options || {}).some((group) =>
    Boolean(group?.hidden?.length || group?.order?.length)
  );
}

/**
 * The room uses the generated layout: grouped by type in the default order,
 * nothing hidden or moved, and no custom cards placed between free ordered
 * entities.
 */
export function isAreaLayoutDefault(options?: AreaOptions | null): boolean {
  return (options?.entity_layout ?? 'grouped') === 'grouped' &&
    !options?.group_order?.length &&
    !options?.entity_order?.length &&
    !hasGroupOptions(options) &&
    !(options?.custom_cards || []).some((entry) => entry.placement.startsWith('ungrouped:'));
}

/**
 * Back to the generated layout of a room: grouped by type, default group and
 * entity order and every entity shown. Custom cards stay; cards placed between
 * free ordered entities move to the bottom of the room.
 */
export function resetAreaLayout(options?: AreaOptions | null): AreaOptions {
  const {
    entity_layout: _layout,
    group_order: _groupOrder,
    entity_order: _entityOrder,
    groups_options: _groupsOptions,
    ...rest
  } = options || {};
  if (Array.isArray(rest.custom_cards)) {
    const cards = rest.custom_cards;
    const kept = cards.filter((entry) => !entry.placement.startsWith('ungrouped:'));
    const moved = cards
      .filter((entry) => entry.placement.startsWith('ungrouped:'))
      .map((entry) => ({ ...entry, placement: 'bottom' }));
    rest.custom_cards = [...kept, ...moved];
  }
  return rest;
}

/** Every type, device and entity is shown on the Devices page. */
export function isDeviceVisibilityDefault(
  settings?: DwainsDashboardSettings | null,
  admission?: DeviceAdmission | null
): boolean {
  return !settings?.hidden_device_types?.length &&
    !admission?.hidden_entities?.length &&
    !admission?.hidden_devices?.length;
}

/** Shows every type, device and entity again. First seen tracking is kept. */
export function resetDeviceVisibility(
  settings?: DwainsDashboardSettings | null,
  admission?: DeviceAdmission | null
): { settings: DwainsDashboardSettings; device_admission: DeviceAdmission } {
  return {
    settings: { ...settings, hidden_device_types: [] },
    device_admission: { ...admission, hidden_entities: [], hidden_devices: [] },
  };
}
