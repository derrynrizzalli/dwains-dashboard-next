import { describe, expect, it } from 'vitest';
import {
  URGENT_STATUS_COLOR,
  applyStatusUrgency,
  isUrgentStatus,
  statusColor,
} from '../src/utils/status-urgency';
import { getDomainColor } from '../src/utils/icons';

const sensor = (deviceClass: string) => ({ domain: 'binary_sensor', deviceClass });

describe('isUrgentStatus', () => {
  it('always marks the alarm and safety sensors', () => {
    expect(isUrgentStatus({ domain: 'alarm_control_panel' }, false)).toBe(true);
    for (const deviceClass of ['smoke', 'gas', 'moisture', 'carbon_monoxide', 'problem', 'safety', 'tamper', 'heat', 'cold']) {
      expect(isUrgentStatus(sensor(deviceClass), false), deviceClass).toBe(true);
    }
  });

  it('marks openings and motion only while the alarm is triggered', () => {
    for (const deviceClass of ['motion', 'window', 'door', 'opening', 'garage_door']) {
      expect(isUrgentStatus(sensor(deviceClass), false), deviceClass).toBe(false);
      expect(isUrgentStatus(sensor(deviceClass), true), deviceClass).toBe(true);
    }
  });

  it('treats window, door and gate covers as openings', () => {
    expect(isUrgentStatus({ domain: 'cover', statusKind: 'window' }, true)).toBe(true);
    expect(isUrgentStatus({ domain: 'cover', statusKind: 'door' }, true)).toBe(true);
    expect(isUrgentStatus({ domain: 'cover', statusKind: 'gate' }, true)).toBe(true);
    expect(isUrgentStatus({ domain: 'cover', statusKind: 'shading' }, true)).toBe(false);
    expect(isUrgentStatus({ domain: 'cover', statusKind: 'window' }, false)).toBe(false);
  });

  it('never marks other status, whatever its colour', () => {
    // Motion is red in the palette but is not urgent without a triggered alarm.
    expect(getDomainColor('binary_sensor', 'motion')).toBe(URGENT_STATUS_COLOR);
    expect(isUrgentStatus(sensor('motion'), false)).toBe(false);
    for (const domain of ['light', 'switch', 'cover', 'lock', 'person', 'wattage']) {
      expect(isUrgentStatus({ domain }, true), domain).toBe(false);
    }
    expect(isUrgentStatus(sensor('occupancy'), true)).toBe(false);
    expect(isUrgentStatus({ domain: 'binary_sensor' }, true)).toBe(false);
  });
});

describe('statusColor', () => {
  it('uses red for urgent status and the type colour otherwise', () => {
    expect(statusColor(sensor('window'), true)).toBe(URGENT_STATUS_COLOR);
    expect(statusColor(sensor('window'), false)).toBe(getDomainColor('binary_sensor', 'window'));
    expect(statusColor({ domain: 'light' }, false)).toBe(getDomainColor('light'));
  });
});

interface Chip {
  domain: string;
  name: string;
  deviceClass?: string;
  statusKind?: 'window' | 'door' | 'gate' | 'shading';
  urgent?: boolean;
}

describe('applyStatusUrgency', () => {
  const chips: Chip[] = [
    { domain: 'wattage', name: 'Power' },
    { domain: 'person', name: 'Home' },
    { domain: 'light', name: 'Lights' },
    { domain: 'cover', statusKind: 'window', name: 'Windows' },
    { domain: 'binary_sensor', deviceClass: 'motion', name: 'Motion' },
    { domain: 'binary_sensor', deviceClass: 'smoke', name: 'Smoke' },
  ];

  it('moves urgent chips to the front and keeps the order otherwise', () => {
    const calm = applyStatusUrgency(chips, false);
    expect(calm.map(chip => chip.name)).toEqual(['Smoke', 'Power', 'Home', 'Lights', 'Windows', 'Motion']);
    expect(calm.filter(chip => chip.urgent).map(chip => chip.name)).toEqual(['Smoke']);

    const triggered = applyStatusUrgency(chips, true);
    expect(triggered.map(chip => chip.name)).toEqual(['Windows', 'Motion', 'Smoke', 'Power', 'Home', 'Lights']);
    expect(triggered.filter(chip => chip.urgent)).toHaveLength(3);
  });

  it('does not change the input', () => {
    applyStatusUrgency(chips, true);
    expect(chips.some(chip => 'urgent' in chip)).toBe(false);
    expect(chips[0]!.name).toBe('Power');
  });
});
