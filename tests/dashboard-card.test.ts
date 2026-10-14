import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DwainsDashboardCard } from '../src/components/dwains-dashboard-card';
import { getEntityRegistry, setFullEntityRegistry } from '../src/utils/entity-registry';
import { isRegistryEntryVisible } from '../src/utils/entity-visibility';
import { ENTITY_REGISTRY, mockHass } from './helpers';

// The layout card needs a real DOM; this test is only about the registries.
vi.mock('../src/components/dwains-layout-card', () => ({}));

const HIDDEN_LIGHT = {
  entity_id: 'light.hidden_lamp',
  area_id: 'living_room',
  device_id: null,
  hidden_by: 'user',
  entity_category: null,
};

function hassWithHiddenEntity() {
  const hass = mockHass();
  const callWS = hass.callWS;
  (hass as any).callWS = vi.fn(async (msg: { type: string }) =>
    msg.type === 'config/entity_registry/list'
      ? structuredClone([...ENTITY_REGISTRY, HIDDEN_LIGHT])
      : callWS(msg)
  );
  return hass;
}

async function loadCard(hass = hassWithHiddenEntity()) {
  const card = new DwainsDashboardCard();
  card.hass = hass;
  card.config = { type: 'custom:dwains-dashboard-next-card' };
  await (card as any)._generateDashboardConfig();
  return { card, hass };
}

beforeEach(() => {
  setFullEntityRegistry([]);
  vi.useFakeTimers();
  vi.stubGlobal('window', {});
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DwainsDashboardCard', () => {
  it('leaves the shared hass object alone and keeps the full entity registry itself', async () => {
    const error = vi.spyOn(console, 'error');
    const hass = hassWithHiddenEntity();
    const before = { areas: hass.areas, devices: hass.devices, entities: hass.entities, floors: hass.floors };
    const keys = Object.keys(hass).sort();

    await loadCard(hass);

    // hass is shared with the rest of Home Assistant and must not be replaced.
    expect(hass.areas).toBe(before.areas);
    expect(hass.devices).toBe(before.devices);
    expect(hass.entities).toBe(before.entities);
    expect(hass.floors).toBe(before.floors);
    expect(hass.entities).toEqual({});
    expect(hass.devices).toEqual({});
    expect(Object.keys(hass).sort()).toEqual(keys);
    expect(getEntityRegistry(hass)['switch.plug']?.area_id).toBe('kitchen');
    expect(error).not.toHaveBeenCalled();
  });

  it('still respects hidden entities', async () => {
    const { card, hass } = await loadCard();
    const registry = getEntityRegistry(hass);

    expect(registry['light.hidden_lamp']?.hidden_by).toBe('user');
    expect(isRegistryEntryVisible(registry['light.hidden_lamp'])).toBe(false);
    expect(isRegistryEntryVisible(registry['light.reading_lamp'])).toBe(true);

    const entities = (card as any)._dashboardConfig.entities;
    expect(entities.find((entity: any) => entity.entity_id === 'light.hidden_lamp')?.hidden).toBe(true);
    expect(entities.find((entity: any) => entity.entity_id === 'light.reading_lamp')?.hidden).toBe(false);
  });

  it('follows Home Assistant when an entity is unhidden later', async () => {
    const { hass } = await loadCard();
    // Home Assistant replaces hass with a new entities object on registry changes.
    const updated = { ...hass, entities: { 'light.hidden_lamp': { entity_id: 'light.hidden_lamp', hidden: false } } } as any;
    expect(isRegistryEntryVisible(getEntityRegistry(updated)['light.hidden_lamp'])).toBe(true);
  });

  it('reads the debug helper from the stored registry', async () => {
    await loadCard();
    const result = (window as any).ddDebugEntity('light.hidden_lamp');
    expect(result.registry).toMatchObject({ entity_id: 'light.hidden_lamp', hidden_by: 'user' });
  });
});
