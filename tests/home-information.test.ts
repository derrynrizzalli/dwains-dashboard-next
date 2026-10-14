import { describe, expect, it } from 'vitest';
import {
  countActiveEntities,
  getRoomAction,
  isCompactRoom,
  isDestructiveBulkAction,
  orderRoomGroups,
  personPresence,
  roomActionNeedsConfirmation,
} from '../src/utils/home-information';

describe('orderRoomGroups', () => {
  const groups = [
    { areaId: 'garden', areaName: 'Garden' },
    { areaId: 'kitchen', areaName: 'Kitchen' },
    { areaId: 'attic', areaName: 'Attic' },
    { areaId: 'living_room', areaName: 'Living room' },
  ];

  it('follows the dashboard area order', () => {
    const ordered = orderRoomGroups(groups, ['living_room', 'kitchen', 'garden', 'attic']);
    expect(ordered.map((group) => group.areaId)).toEqual(['living_room', 'kitchen', 'garden', 'attic']);
  });

  it('puts rooms outside the order last, alphabetically', () => {
    const ordered = orderRoomGroups(groups, ['kitchen']);
    expect(ordered.map((group) => group.areaId)).toEqual(['kitchen', 'attic', 'garden', 'living_room']);
  });

  it('does not change the input', () => {
    const input = [...groups];
    orderRoomGroups(input, ['kitchen']);
    expect(input).toEqual(groups);
  });
});

describe('room actions', () => {
  it('counts active entities', () => {
    const on = new Set(['light.a', 'light.c']);
    expect(countActiveEntities(['light.a', 'light.b', 'light.c'], (id) => on.has(id))).toBe(2);
  });

  it('gives switches a toggle only with more than one entity', () => {
    expect(getRoomAction('light', 1, 1)).toBeUndefined();
    expect(getRoomAction('light', 1, 3)).toEqual({
      mode: 'toggle',
      action: 'turn_off',
      checked: true,
      activeCount: 1,
      totalCount: 3,
    });
    expect(getRoomAction('input_boolean', 0, 2)).toMatchObject({ mode: 'toggle', action: 'turn_on', checked: false });
  });

  it('gives covers open and close, also for a single cover', () => {
    const action = getRoomAction('cover', 0, 1);
    expect(action?.mode).toBe('segmented');
    if (action?.mode !== 'segmented') return;
    expect(action.items.map((item) => item.action)).toEqual(['open_cover', 'close_cover']);
    expect(action.items.map((item) => item.current)).toEqual([false, true]);
  });

  it('gives locks lock and unlock', () => {
    const action = getRoomAction('lock', 1, 2);
    if (action?.mode !== 'segmented') throw new Error('expected segmented');
    expect(action.items.map((item) => [item.action, item.current])).toEqual([
      ['lock', false],
      ['unlock', true],
    ]);
  });

  it('has no action for other domains or empty rooms', () => {
    expect(getRoomAction('climate', 1, 3)).toBeUndefined();
    expect(getRoomAction('cover', 0, 0)).toBeUndefined();
  });

  it('always confirms unlocking', () => {
    expect(roomActionNeedsConfirmation('unlock', false)).toBe(true);
    expect(roomActionNeedsConfirmation('lock', false)).toBe(false);
    expect(roomActionNeedsConfirmation('turn_off', true)).toBe(true);
  });

  it('marks switching off, closing and unlocking as destructive', () => {
    expect(isDestructiveBulkAction('turn_off')).toBe(true);
    expect(isDestructiveBulkAction('close_cover')).toBe(true);
    expect(isDestructiveBulkAction('unlock')).toBe(true);
    expect(isDestructiveBulkAction('turn_on')).toBe(false);
    expect(isDestructiveBulkAction('lock')).toBe(false);
  });

  it('treats rooms with two entities or fewer as compact', () => {
    expect(isCompactRoom(1)).toBe(true);
    expect(isCompactRoom(2)).toBe(true);
    expect(isCompactRoom(3)).toBe(false);
  });
});

describe('personPresence', () => {
  it('maps person states', () => {
    expect(personPresence('home')).toBe('home');
    expect(personPresence('not_home')).toBe('away');
    expect(personPresence('Work')).toBe('zone');
    expect(personPresence('unknown')).toBe('unknown');
    expect(personPresence('unavailable')).toBe('unknown');
    expect(personPresence(undefined)).toBe('unknown');
  });
});
