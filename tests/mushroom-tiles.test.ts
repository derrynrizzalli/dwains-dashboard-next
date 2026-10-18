import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveEntityCardConfig } from '../src/utils/blueprint-replacements';
import {
  MISSING_MUSHROOM_WARNING,
  MUSHROOM_PROBE_ELEMENT,
  applyMushroomTileOverride,
  builtinMushroomCardConfig,
  ensureMushroomAvailable,
  isMushroomCardType,
  mushroomCardType,
  mushroomTileTypeForDomain,
  resetMushroomAvailabilityForTests,
  resolveEntityTileCard,
  type MushroomTileType,
} from '../src/utils/mushroom-tiles';
import type { DwainsDashboardConfig } from '../src/types/strategy';
import { hassWithStates } from './helpers';

const DOMAIN_CARDS: Array<[string, MushroomTileType]> = [
  ['light.kitchen', 'light'],
  ['cover.blind', 'cover'],
  ['fan.ceiling', 'fan'],
  ['climate.hall', 'climate'],
  ['lock.front', 'lock'],
  ['media_player.tv', 'media_player'],
  ['alarm_control_panel.home', 'alarm_control_panel'],
  ['person.derryn', 'person'],
  ['vacuum.robot', 'vacuum'],
  ['number.brightness', 'number'],
  ['input_number.volume', 'number'],
  ['select.mode', 'select'],
  ['input_select.scene', 'select'],
  ['update.core', 'update'],
  ['switch.plug', 'entity'],
  ['sensor.temperature', 'entity'],
  ['binary_sensor.door', 'entity'],
  ['camera.porch', 'entity'],
];

afterEach(() => {
  resetMushroomAvailabilityForTests();
  vi.unstubAllGlobals();
});

describe('domain to Mushroom card', () => {
  it.each(DOMAIN_CARDS)('maps %s to the %s card', (entityId, tileType) => {
    const card = resolveEntityTileCard({ entityId });
    expect(mushroomTileTypeForDomain(entityId.split('.')[0] || '')).toBe(tileType);
    expect(card.type).toBe(mushroomCardType(tileType));
    expect(card.entity).toBe(entityId);
    expect(card.layout).toBe('vertical');
  });

  it('keeps a todo on the Home Assistant todo-list card', () => {
    expect(resolveEntityTileCard({ entityId: 'todo.shopping' })).toEqual({
      type: 'todo-list',
      entity: 'todo.shopping',
    });
  });

  it('adds the controls a vertical Mushroom light card understands', () => {
    expect(builtinMushroomCardConfig('light', 'light.kitchen', 'Kitchen')).toMatchObject({
      type: 'custom:mushroom-light-card',
      entity: 'light.kitchen',
      name: 'Kitchen',
      use_light_color: true,
      show_brightness_control: true,
      collapsible_controls: true,
      layout: 'vertical',
    });
  });

  it('fills entity on a per-type override and leaves the template fields alone', () => {
    const card = applyMushroomTileOverride(
      { light: { type: 'custom:mushroom-template-card', primary: 'Lamp', icon: 'mdi:lightbulb', entity: 'light.other' } },
      'light',
      'light.kitchen',
      'Kitchen'
    );
    expect(card).toEqual({
      type: 'custom:mushroom-template-card',
      primary: 'Lamp',
      icon: 'mdi:lightbulb',
      entity: 'light.kitchen',
      name: 'Kitchen',
    });
  });

  it('prefers the strategy override over the built-in map, and a blueprint over both', () => {
    const config: DwainsDashboardConfig = {
      mushroom_tile_overrides: {
        entity: { type: 'custom:mushroom-template-card', primary: 'Plug' },
      },
    };
    const hass = hassWithStates([]);
    expect(resolveEntityCardConfig({
      hass,
      config,
      entity: 'switch.plug',
      surface: 'devices_cards',
    })).toEqual({
      type: 'custom:mushroom-template-card',
      primary: 'Plug',
      entity: 'switch.plug',
    });

    const withBlueprint: DwainsDashboardConfig = {
      ...config,
      blueprint_replacements: {
        devices_cards: {
          by_entity: {
            'switch.plug': {
              id: 'rep',
              name: 'Tile',
              enabled: true,
              blueprint: 'blueprint:\n  name: Tile\ncard:\n  type: tile\n  entity: $replace_with_input_entity$\n',
            },
          },
        },
      },
    };
    expect(resolveEntityCardConfig({
      hass,
      config: withBlueprint,
      entity: 'switch.plug',
      surface: 'devices_cards',
    })).toEqual({ type: 'tile', entity: 'switch.plug' });
  });
});

describe('missing Mushroom fallback', () => {
  it('resolves immediately when the probe element is already defined', async () => {
    vi.stubGlobal('customElements', {
      get: (name: string) => (name === MUSHROOM_PROBE_ELEMENT ? class {} : undefined),
      whenDefined: () => new Promise(() => undefined),
    });
    const warn = vi.fn();
    await expect(ensureMushroomAvailable({ log: { warn }, timeoutMs: 20 })).resolves.toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it('resolves when the element is defined before the timeout', async () => {
    let resolveDefined: (() => void) | undefined;
    const warn = vi.fn();
    const result = ensureMushroomAvailable({
      timeoutMs: 500,
      log: { warn },
      whenDefined: () => new Promise<void>((resolve) => {
        resolveDefined = resolve;
      }),
    });
    resolveDefined?.();
    await expect(result).resolves.toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once and reports missing when the element never arrives', async () => {
    const warn = vi.fn();
    const pending = new Promise<void>(() => undefined);
    const options = {
      timeoutMs: 5,
      log: { warn },
      whenDefined: () => pending,
    };
    const [first, second] = await Promise.all([
      ensureMushroomAvailable(options),
      ensureMushroomAvailable(options),
    ]);
    expect(first).toBe(false);
    expect(second).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(MISSING_MUSHROOM_WARNING);
    expect(isMushroomCardType('custom:mushroom-light-card')).toBe(true);
    expect(isMushroomCardType('tile')).toBe(false);
  });
});
