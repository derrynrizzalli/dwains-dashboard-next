import { describe, expect, it } from 'vitest';
import {
  MOBILE_AREA_BADGE_LIMIT,
  SIDEBAR_AREA_BADGE_MAX,
  buildAreaStatusBadges,
  getAreaStatusBadges,
  limitAreaStatusBadges,
  sidebarAreaBadgeLimit,
  sidebarAreaBadgeLimits,
} from '../src/utils/area-status-badges';
import { URGENT_STATUS_COLOR } from '../src/utils/status-urgency';
import { getDomainColor } from '../src/utils/icons';
import type { AreaData } from '../src/types/strategy';

function areaData(
  on: Record<string, number>,
  alerts: Array<{ entity_id: string; deviceClass?: string }> = []
): AreaData {
  return {
    area_id: 'living',
    name: 'Living room',
    alerts,
    domains: Object.fromEntries(Object.entries(on).map(([domain, count]) => [domain, { on: count, total: count }])),
  };
}

describe('buildAreaStatusBadges', () => {
  it('lists the active domains in a fixed order, then motion and the alerts', () => {
    const badges = buildAreaStatusBadges(areaData(
      { motion: 1, lock: 1, fan: 2, media_player: 1, climate: 1, cover: 3, switch: 1, light: 4 },
      [{ entity_id: 'binary_sensor.door', deviceClass: 'door' }]
    ), false);
    expect(badges.map(badge => badge.key)).toEqual([
      'light', 'switch', 'cover', 'climate', 'media_player', 'fan', 'lock', 'binary_sensor.motion', 'binary_sensor.door',
    ]);
    expect(badges.find(badge => badge.key === 'light')).toMatchObject({ count: 4, color: getDomainColor('light') });
    expect(badges.find(badge => badge.key === 'lock')?.icon).toBe('mdi:lock-open-variant');
  });

  it('leaves out domains with nothing active', () => {
    expect(buildAreaStatusBadges(areaData({ light: 0, switch: 0, motion: 0 }), false)).toEqual([]);
  });

  it('gives every alert type its own badge, icon and colour', () => {
    const badges = buildAreaStatusBadges(areaData({}, [
      { entity_id: 'binary_sensor.smoke', deviceClass: 'smoke' },
      { entity_id: 'binary_sensor.window_1', deviceClass: 'window' },
      { entity_id: 'binary_sensor.leak', deviceClass: 'moisture' },
      { entity_id: 'binary_sensor.window_2', deviceClass: 'window' },
      { entity_id: 'binary_sensor.door', deviceClass: 'door' },
    ]), false);
    // Smoke and moisture are urgent and come first, the openings follow.
    expect(badges.map(badge => [badge.deviceClass, badge.count, badge.icon])).toEqual([
      ['moisture', 1, 'mdi:water-alert'],
      ['smoke', 1, 'mdi:smoke-detector-alert'],
      ['window', 2, 'mdi:window-open'],
      ['door', 1, 'mdi:door-open'],
    ]);
    expect(badges.filter(badge => badge.urgent).map(badge => badge.color)).toEqual([URGENT_STATUS_COLOR, URGENT_STATUS_COLOR]);
    expect(badges.find(badge => badge.deviceClass === 'window')?.color).toBe(getDomainColor('binary_sensor', 'window'));
  });

  it('keeps safety alerts ahead of motion and openings', () => {
    const data = areaData({ motion: 1 }, [
      { entity_id: 'binary_sensor.window', deviceClass: 'window' },
      { entity_id: 'binary_sensor.smoke', deviceClass: 'smoke' },
    ]);
    expect(buildAreaStatusBadges(data, true).map(badge => badge.key))
      .toEqual(['binary_sensor.smoke', 'binary_sensor.motion', 'binary_sensor.window']);
  });

  it('moves motion and openings to the front while the alarm is triggered', () => {
    const data = areaData({ light: 1, motion: 1 }, [{ entity_id: 'binary_sensor.window', deviceClass: 'window' }]);
    expect(buildAreaStatusBadges(data, false).map(badge => badge.key))
      .toEqual(['light', 'binary_sensor.motion', 'binary_sensor.window']);

    const triggered = buildAreaStatusBadges(data, true);
    expect(triggered.map(badge => badge.key)).toEqual(['binary_sensor.motion', 'binary_sensor.window', 'light']);
    expect(triggered.slice(0, 2).every(badge => badge.urgent && badge.color === URGENT_STATUS_COLOR)).toBe(true);
  });
});

describe('getAreaStatusBadges', () => {
  it('reuses the badges of the same area data and alarm state', () => {
    const data = areaData({ light: 1 });
    const first = getAreaStatusBadges(data, false);
    expect(getAreaStatusBadges(data, false)).toBe(first);
    expect(getAreaStatusBadges(data, true)).not.toBe(first);
    expect(getAreaStatusBadges(areaData({ light: 1 }), false)).not.toBe(first);
  });
});

describe('limitAreaStatusBadges', () => {
  const badges = buildAreaStatusBadges(
    areaData({ light: 1, switch: 1, cover: 1, climate: 1, media_player: 1 }),
    false
  );

  it('shows every badge when they fit', () => {
    expect(limitAreaStatusBadges(badges, 5)).toEqual({ visible: badges, hidden: 0 });
    expect(limitAreaStatusBadges(badges, 9, 8).hidden).toBe(0);
    expect(limitAreaStatusBadges(badges.slice(0, 4), MOBILE_AREA_BADGE_LIMIT).hidden).toBe(0);
  });

  it('keeps one place for the overflow marker', () => {
    const limited = limitAreaStatusBadges(badges, MOBILE_AREA_BADGE_LIMIT);
    expect(limited.visible.map(badge => badge.key)).toEqual(['light', 'switch', 'cover']);
    expect(limited.hidden).toBe(2);
  });

  it('never shows more than the maximum number of badges', () => {
    const many = buildAreaStatusBadges(areaData(
      { light: 1, switch: 1, cover: 1, climate: 1, media_player: 1, fan: 1, lock: 1, motion: 1 },
      [{ entity_id: 'binary_sensor.window', deviceClass: 'window' }]
    ), false);
    expect(many).toHaveLength(9);
    const limited = limitAreaStatusBadges(many, 9, SIDEBAR_AREA_BADGE_MAX);
    expect(limited.visible).toHaveLength(SIDEBAR_AREA_BADGE_MAX);
    expect(limited.hidden).toBe(1);
  });
});

describe('sidebar badge limits', () => {
  it('is empty until the list is measured', () => {
    expect(sidebarAreaBadgeLimits(0)).toEqual([]);
    expect(sidebarAreaBadgeLimit([], 3)).toBe(SIDEBAR_AREA_BADGE_MAX + 1);
  });

  it('fits more badges on wider tiles', () => {
    const narrow = sidebarAreaBadgeLimits(234);
    expect(narrow).toHaveLength(1);
    expect(narrow[0]).toBe(6);

    // 1 column at 234px, 2 at 380px, 3 at 560px.
    expect(sidebarAreaBadgeLimits(380)).toHaveLength(2);
    expect(sidebarAreaBadgeLimits(560)).toHaveLength(3);

    for (let width = 200; width <= 660; width += 10) {
      const limits = sidebarAreaBadgeLimits(width);
      // Fewer areas per row means wider tiles and never fewer badges.
      for (let index = 1; index < limits.length; index++) {
        expect(limits[index]!).toBeLessThanOrEqual(limits[index - 1]!);
      }
      expect(Math.max(...limits)).toBeLessThanOrEqual(SIDEBAR_AREA_BADGE_MAX + 1);
      expect(Math.min(...limits)).toBeGreaterThanOrEqual(3);
    }
    expect(sidebarAreaBadgeLimits(644)[0]).toBe(SIDEBAR_AREA_BADGE_MAX + 1);
  });

  it('uses the tile width of the floor', () => {
    const limits = sidebarAreaBadgeLimits(380);
    // One area in a floor fills the row, three areas share two columns.
    expect(sidebarAreaBadgeLimit(limits, 1)).toBe(limits[0]);
    expect(sidebarAreaBadgeLimit(limits, 3)).toBe(limits[1]);
    expect(limits[0]!).toBeGreaterThan(limits[1]!);
  });
});
