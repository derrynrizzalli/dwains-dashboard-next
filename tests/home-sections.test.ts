import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOME_INFORMATION_CARDS,
  DEFAULT_HOME_SECTIONS_ORDER,
  HOME_INFORMATION_CARD_META,
  HOME_SECTION_META,
  normalizeHiddenHomeInformationCards,
  normalizeHiddenHomeSections,
  isHomeSectionManaged,
  normalizeHomeSectionsOrder,
  resolveHiddenHomeSections,
} from '../src/utils/home-sections';
import { hasDdTranslation } from '../src/utils/localize';

describe('normalizeHomeSectionsOrder', () => {
  it('returns the default order when nothing is stored', () => {
    expect(normalizeHomeSectionsOrder()).toEqual(DEFAULT_HOME_SECTIONS_ORDER);
    expect(normalizeHomeSectionsOrder([])).toEqual(DEFAULT_HOME_SECTIONS_ORDER);
  });

  it('keeps a complete stored order', () => {
    const order = ['favorites', 'scenes', 'now_playing', 'summaries', 'areas', 'cameras', 'devices', 'todos', 'custom_cards'];
    expect(normalizeHomeSectionsOrder(order)).toEqual(order);
  });

  it('places scenes after favorites by default', () => {
    const order = normalizeHomeSectionsOrder();
    expect(order.indexOf('scenes')).toBe(order.indexOf('favorites') + 1);
  });

  it('adds scenes to an order saved before scenes existed', () => {
    // A customised order from an older version keeps its own order. Now
    // playing is new as well and its default place is first.
    expect(normalizeHomeSectionsOrder(['favorites', 'summaries', 'areas', 'cameras', 'devices', 'todos', 'custom_cards'])).toEqual([
      'now_playing',
      'favorites',
      'scenes',
      'summaries',
      'areas',
      'cameras',
      'devices',
      'todos',
      'custom_cards',
    ]);
    // Summaries first: scenes is placed before the first later default section.
    expect(normalizeHomeSectionsOrder(['summaries', 'favorites', 'custom_cards', 'todos', 'devices', 'areas', 'cameras'])).toEqual([
      'now_playing',
      'scenes',
      'summaries',
      'favorites',
      'custom_cards',
      'todos',
      'devices',
      'areas',
      'cameras',
    ]);
  });

  it('keeps a stored scenes position', () => {
    expect(normalizeHomeSectionsOrder(['scenes', 'cameras', 'areas', 'devices', 'todos', 'custom_cards', 'favorites', 'summaries', 'now_playing'])[0]).toBe('scenes');
  });

  it('drops unknown and duplicate sections', () => {
    expect(normalizeHomeSectionsOrder(['areas', 'weather', 'areas', 42, null, 'cameras'])).toEqual([
      'now_playing',
      'areas',
      'cameras',
      'devices',
      'todos',
      'custom_cards',
      'favorites',
      'scenes',
      'summaries',
    ]);
  });

  it('inserts sections added in a newer version next to their default neighbours', () => {
    // An order saved before "todos" and "summaries" existed.
    expect(normalizeHomeSectionsOrder(['cameras', 'areas', 'devices', 'custom_cards', 'favorites'])).toEqual([
      'now_playing',
      'cameras',
      'areas',
      'devices',
      'todos',
      'custom_cards',
      'favorites',
      'scenes',
      'summaries',
    ]);
  });
});

describe('Now playing as a Home section', () => {
  it('comes first in the default order', () => {
    expect(DEFAULT_HOME_SECTIONS_ORDER[0]).toBe('now_playing');
    expect(normalizeHomeSectionsOrder()[0]).toBe('now_playing');
  });

  it('is added first to an order saved before it existed', () => {
    const order = normalizeHomeSectionsOrder(['favorites', 'cameras', 'areas', 'devices', 'todos', 'custom_cards', 'scenes', 'summaries']);
    expect(order[0]).toBe('now_playing');
    expect(order.slice(1)).toEqual(['favorites', 'cameras', 'areas', 'devices', 'todos', 'custom_cards', 'scenes', 'summaries']);
  });

  it('keeps a stored position', () => {
    const order = normalizeHomeSectionsOrder(['cameras', 'areas', 'now_playing', 'devices']);
    expect(order.indexOf('now_playing')).toBe(2);
  });

  it('knows when the section was saved', () => {
    expect(isHomeSectionManaged(undefined, 'now_playing')).toBe(false);
    expect(isHomeSectionManaged({ home_sections_order: ['cameras'] }, 'now_playing')).toBe(false);
    expect(isHomeSectionManaged({ home_sections_order: ['now_playing'] }, 'now_playing')).toBe(true);
    expect(isHomeSectionManaged({ home_sections_hidden: ['now_playing'] }, 'now_playing')).toBe(true);
  });

  it('follows the older now_playing_bar setting until it is managed', () => {
    expect(resolveHiddenHomeSections({})).toEqual([]);
    expect(resolveHiddenHomeSections({ now_playing_bar: 'home' })).toEqual([]);
    expect(resolveHiddenHomeSections({ now_playing_bar: 'all' })).toEqual([]);
    expect(resolveHiddenHomeSections({ now_playing_bar: 'off' })).toEqual(['now_playing']);
    expect(resolveHiddenHomeSections({ now_playing_bar: 'off', home_sections_hidden: ['todos'] })).toEqual(['todos', 'now_playing']);
    // An order saved by an older version does not manage Now playing yet.
    expect(resolveHiddenHomeSections({ now_playing_bar: 'off', home_sections_order: ['cameras', 'areas'] })).toEqual(['now_playing']);
  });

  it('ignores the older setting once the section is managed', () => {
    expect(resolveHiddenHomeSections({ now_playing_bar: 'off', home_sections_order: normalizeHomeSectionsOrder() })).toEqual([]);
    expect(resolveHiddenHomeSections({ now_playing_bar: 'home', home_sections_hidden: ['now_playing'] })).toEqual(['now_playing']);
    expect(resolveHiddenHomeSections({ now_playing_bar: 'off', home_sections_hidden: ['now_playing'] })).toEqual(['now_playing']);
  });
});

describe('normalizeHiddenHomeSections', () => {
  it('keeps only known sections once', () => {
    expect(normalizeHiddenHomeSections(['todos', 'todos', 'unknown', 'cameras'])).toEqual(['todos', 'cameras']);
    expect(normalizeHiddenHomeSections(['scenes'])).toEqual(['scenes']);
    expect(normalizeHiddenHomeSections(undefined)).toEqual([]);
  });
});

describe('normalizeHiddenHomeInformationCards', () => {
  it('accepts the outdoor climate card', () => {
    expect(normalizeHiddenHomeInformationCards(['outdoor_climate'])).toEqual(['outdoor_climate']);
  });

  it('keeps only known cards once', () => {
    expect(normalizeHiddenHomeInformationCards(['power', 'weather', 'power', 'people', 7])).toEqual(['power', 'people']);
    expect(normalizeHiddenHomeInformationCards()).toEqual([]);
  });
});

describe('home section metadata', () => {
  it('describes every section and information card', () => {
    expect(Object.keys(HOME_SECTION_META).sort()).toEqual([...DEFAULT_HOME_SECTIONS_ORDER].sort());
    expect(Object.keys(HOME_INFORMATION_CARD_META).sort()).toEqual([...DEFAULT_HOME_INFORMATION_CARDS].sort());
    expect(DEFAULT_HOME_INFORMATION_CARDS).toContain('outdoor_climate');
  });

  it('only uses translation keys that exist', () => {
    const metas = [...Object.values(HOME_SECTION_META), ...Object.values(HOME_INFORMATION_CARD_META)];
    for (const meta of metas) {
      expect(hasDdTranslation(meta.labelKey), meta.labelKey).toBe(true);
      expect(hasDdTranslation(meta.descriptionKey), meta.descriptionKey).toBe(true);
      expect(meta.icon).toMatch(/^mdi:[a-z0-9-]+$/);
    }
  });
});
