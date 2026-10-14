import { describe, expect, it } from 'vitest';
import {
  isAreaLayoutDefault,
  isAreasDisplayDefault,
  isDeviceVisibilityDefault,
  resetAreaLayout,
  resetAreasDisplay,
  resetDeviceVisibility,
} from '../src/utils/settings-reset';
import type { AreaOptions } from '../src/types/strategy';

describe('areas list reset', () => {
  it('knows the default list', () => {
    expect(isAreasDisplayDefault(undefined)).toBe(true);
    expect(isAreasDisplayDefault({})).toBe(true);
    expect(isAreasDisplayDefault({ hidden: [], order: [], sort_mode: 'alphabetical' })).toBe(true);
    expect(isAreasDisplayDefault({ hidden: ['garage'] })).toBe(false);
    expect(isAreasDisplayDefault({ order: ['kitchen'] })).toBe(false);
    expect(isAreasDisplayDefault({ sort_mode: 'home_assistant' })).toBe(false);
  });

  it('clears hidden areas, order and sort mode', () => {
    const reset = resetAreasDisplay({ hidden: ['garage'], order: ['kitchen'], sort_mode: 'custom' });
    expect(reset).toEqual({});
    expect(isAreasDisplayDefault(reset)).toBe(true);
  });
});

describe('room layout reset', () => {
  const customized: AreaOptions = {
    card_size: 'large',
    entity_layout: 'ungrouped',
    group_order: ['covers', 'lights'],
    entity_order: ['light.b', 'light.a'],
    groups_options: { lights: { hidden: ['light.a'], order: ['light.b'] } },
    custom_cards: [
      { id: 'top', placement: 'top', card: { type: 'markdown' } },
      { id: 'free', placement: 'ungrouped:1', card: { type: 'markdown' } },
      { id: 'domain', placement: 'domain:lights:0', card: { type: 'markdown' } },
      { id: 'bottom', placement: 'bottom', card: { type: 'markdown' } },
    ],
  };

  it('knows the default layout', () => {
    expect(isAreaLayoutDefault(undefined)).toBe(true);
    expect(isAreaLayoutDefault({ entity_layout: 'grouped', card_size: 'large' })).toBe(true);
    expect(isAreaLayoutDefault({ groups_options: { lights: { hidden: [], order: [] } } })).toBe(true);
    expect(isAreaLayoutDefault({ entity_layout: 'ungrouped' })).toBe(false);
    expect(isAreaLayoutDefault({ group_order: ['lights'] })).toBe(false);
    expect(isAreaLayoutDefault({ entity_order: ['light.a'] })).toBe(false);
    expect(isAreaLayoutDefault({ groups_options: { lights: { hidden: ['light.a'] } } })).toBe(false);
    expect(isAreaLayoutDefault({ custom_cards: [{ id: 'x', placement: 'ungrouped:0', card: { type: 'markdown' } }] })).toBe(false);
    expect(isAreaLayoutDefault(customized)).toBe(false);
  });

  it('removes the layout options and shows every entity', () => {
    const reset = resetAreaLayout(customized);
    expect(reset.entity_layout).toBeUndefined();
    expect(reset.group_order).toBeUndefined();
    expect(reset.entity_order).toBeUndefined();
    expect(reset.groups_options).toBeUndefined();
    expect(reset.card_size).toBe('large');
    expect(isAreaLayoutDefault(reset)).toBe(true);
  });

  it('moves cards placed between free ordered entities to the bottom', () => {
    const reset = resetAreaLayout(customized);
    expect(reset.custom_cards?.map((entry) => `${entry.id}:${entry.placement}`)).toEqual([
      'top:top',
      'domain:domain:lights:0',
      'bottom:bottom',
      'free:bottom',
    ]);
  });

  it('does not change the options it is given', () => {
    resetAreaLayout(customized);
    expect(customized.custom_cards?.[1]?.placement).toBe('ungrouped:1');
    expect(customized.group_order).toEqual(['covers', 'lights']);
  });
});

describe('devices page reset', () => {
  it('knows the default visibility', () => {
    expect(isDeviceVisibilityDefault(undefined, undefined)).toBe(true);
    expect(isDeviceVisibilityDefault({ hidden_device_types: [] }, { hidden_devices: [], hidden_entities: [] })).toBe(true);
    expect(isDeviceVisibilityDefault({ hidden_device_types: ['light'] }, {})).toBe(false);
    expect(isDeviceVisibilityDefault({}, { hidden_entities: ['light.a'] })).toBe(false);
    expect(isDeviceVisibilityDefault({}, { hidden_devices: ['device'] })).toBe(false);
  });

  it('shows everything again and keeps first seen tracking', () => {
    const reset = resetDeviceVisibility(
      { hidden_device_types: ['light'], show_time: false },
      { hidden_devices: ['device'], hidden_entities: ['light.a'], first_seen_devices: { device: 1 } }
    );
    expect(reset.settings).toEqual({ hidden_device_types: [], show_time: false });
    expect(reset.device_admission).toEqual({ hidden_devices: [], hidden_entities: [], first_seen_devices: { device: 1 } });
    expect(isDeviceVisibilityDefault(reset.settings, reset.device_admission)).toBe(true);
  });
});
