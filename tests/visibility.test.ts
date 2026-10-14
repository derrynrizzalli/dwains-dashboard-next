import { describe, expect, it } from 'vitest';
import {
  countHidden,
  groupHiddenIds,
  groupVisibility,
  hidesOnToggle,
  idsVisibility,
  withIdsHidden,
} from '../src/utils/visibility';

describe('group visibility', () => {
  it('is visible, partly hidden or hidden', () => {
    expect(groupVisibility(3, 0)).toBe('visible');
    expect(groupVisibility(3, 1)).toBe('partial');
    expect(groupVisibility(3, 2)).toBe('partial');
    expect(groupVisibility(3, 3)).toBe('hidden');
  });

  it('treats an empty group as visible', () => {
    expect(groupVisibility(0, 0)).toBe('visible');
    expect(idsVisibility([], new Set(['light.a']))).toBe('visible');
  });

  it('counts only the ids of the group', () => {
    const hidden = new Set(['light.a', 'light.x']);
    expect(countHidden(['light.a', 'light.b'], hidden)).toBe(1);
    expect(idsVisibility(['light.a', 'light.b'], hidden)).toBe('partial');
    expect(idsVisibility(['light.a'], hidden)).toBe('hidden');
    expect(idsVisibility(['light.b'], hidden)).toBe('visible');
  });

  it('hides a visible or partly hidden group and shows a hidden one', () => {
    expect(hidesOnToggle('visible')).toBe(true);
    expect(hidesOnToggle('partial')).toBe(true);
    expect(hidesOnToggle('hidden')).toBe(false);
  });
});

describe('withIdsHidden', () => {
  it('adds hidden ids at the end without duplicates', () => {
    expect(withIdsHidden(['b'], ['a', 'b', 'a'], true)).toEqual(['b', 'a']);
    expect(withIdsHidden(undefined, ['a'], true)).toEqual(['a']);
  });

  it('removes shown ids and keeps the others', () => {
    expect(withIdsHidden(['a', 'b', 'c'], ['b'], false)).toEqual(['a', 'c']);
    expect(withIdsHidden(['a', 'a', '', 'c'], ['x'], false)).toEqual(['a', 'c']);
  });
});

describe('groupHiddenIds', () => {
  it('stores the current entities of the group when hiding it', () => {
    expect(groupHiddenIds(['light.a'], ['light.a', 'light.b'], true)).toEqual(['light.a', 'light.b']);
  });

  it('shows every entity of the group', () => {
    expect(groupHiddenIds(['light.a', 'light.b'], ['light.a', 'light.b'], false)).toEqual([]);
  });

  it('drops entries that are no longer in the group', () => {
    expect(groupHiddenIds(['light.old', 'light.a'], ['light.a', 'light.b'], true)).toEqual(['light.a', 'light.b']);
    expect(groupHiddenIds(['light.old'], ['light.a'], false)).toEqual([]);
  });

  it('leaves entities added later visible', () => {
    const hidden = new Set(groupHiddenIds(undefined, ['light.a', 'light.b'], true));
    expect(idsVisibility(['light.a', 'light.b', 'light.new'], hidden)).toBe('partial');
  });
});
