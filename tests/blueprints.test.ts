import { describe, expect, it } from 'vitest';
import {
  blueprintText,
  defaultValues,
  localizeBlueprintConfig,
  parseBlueprintYaml,
  resolveBlueprintCard,
  validateBlueprintValues,
} from '../src/utils/blueprints';

const wasteYaml = `blueprint:
  name: Waste collection
  name_nl: Afvalkalender
  name_de: Abfuhrkalender
  description: Upcoming collections
  description_pt-BR: Próximas coletas
  icon: mdi:trash-can-outline
  version: 1.0.0
  type: page
  input:
    title:
      name: Title
      name_nl: Titel
      type: text-field
      default: ''
    items:
      name: Waste types
      type: entity-list
      entity_domain: sensor
      default_icon: mdi:trash-can-outline
      add_label: Add waste type
      add_label_nl: Afvalsoort toevoegen
card:
  type: vertical-stack
  cards:
    - type: markdown
      requires_input: title
      content: "## $title$"
    - repeat: items
      template:
        type: button
        entity: "$item.entity$"
        name: "$item.name$"
        icon: "$item.icon$"
        label:
          i18n:
            de: "Heute"
            nl: "Vandaag"
            en: "Today"
`;

const rows = [
  { name: 'Bio', entity: 'sensor.bio', icon: '' },
  { name: 'Paper', entity: 'sensor.paper', icon: 'mdi:newspaper' },
];

describe('blueprint metadata', () => {
  it('reads the page icon, translated names and input helpers', () => {
    const { meta } = parseBlueprintYaml(wasteYaml);
    expect(meta.icon).toBe('mdi:trash-can-outline');
    expect(blueprintText(meta, 'name', 'nl')).toBe('Afvalkalender');
    expect(blueprintText(meta, 'name', 'de')).toBe('Abfuhrkalender');
    expect(blueprintText(meta, 'name', 'fr')).toBe('Waste collection');
    expect(blueprintText(meta, 'description', 'pt-br')).toBe('Próximas coletas');
    expect(blueprintText(meta, 'description', 'nl')).toBe('Upcoming collections');

    const items = meta.input!.items!;
    expect(items.entity_domain).toBe('sensor');
    expect(items.default_icon).toBe('mdi:trash-can-outline');
    expect(blueprintText(items, 'add_label', 'nl-BE')).toBe('Afvalsoort toevoegen');
    expect(blueprintText(items, 'add_label', 'en')).toBe('Add waste type');
    expect(blueprintText(meta.input!.title!, 'name', 'nl')).toBe('Titel');
  });

  it('starts an entity-list empty', () => {
    const { meta } = parseBlueprintYaml(wasteYaml);
    expect(defaultValues(meta)).toEqual({ title: '', items: [] });
  });
});

describe('repeatable entity lists', () => {
  it('expands one entry per row and falls back to the default icon', () => {
    const p = parseBlueprintYaml(wasteYaml);
    const card = resolveBlueprintCard(p.card, p.meta, { title: '', items: rows });
    expect(card.cards).toHaveLength(2);
    expect(card.cards[0]).toMatchObject({ type: 'button', name: 'Bio', entity: 'sensor.bio', icon: 'mdi:trash-can-outline' });
    expect(card.cards[1]).toMatchObject({ name: 'Paper', entity: 'sensor.paper', icon: 'mdi:newspaper' });
  });

  it('drops rows without an entity', () => {
    const p = parseBlueprintYaml(wasteYaml);
    const card = resolveBlueprintCard(p.card, p.meta, {
      items: [{ name: 'Incomplete', entity: '' }, { name: 'Paper', entity: 'sensor.paper' }],
    });
    expect(card.cards).toHaveLength(1);
    expect(card.cards[0].name).toBe('Paper');
  });

  it('uses mdi:shape when the input has no default icon', () => {
    const p = parseBlueprintYaml(`blueprint:
  name: List
  input:
    things:
      type: entity-list
card:
  type: grid
  cards:
    - repeat: things
      template:
        type: tile
        icon: $item.icon$
`);
    const card = resolveBlueprintCard(p.card, p.meta, { things: [{ entity: 'light.a' }] });
    expect(card.cards[0].icon).toBe('mdi:shape');
  });

  it('fills any row field plus index and last', () => {
    const p = parseBlueprintYaml(`blueprint:
  name: List
  input:
    things:
      type: entity-list
card:
  type: grid
  cards:
    - repeat: things
      template:
        type: custom:thing
        image: $item.image$
        extra: $item.extra$
        position: $item.index$
        is_last: $item.last$
        caption: "#$item.index$ last=$item.last$ $item.missing$"
`);
    const card = resolveBlueprintCard(p.card, p.meta, {
      things: [
        { entity: 'sensor.a', image: '/local/a.png', extra: 'one' },
        { entity: 'sensor.b', extra: 'two' },
      ],
    });
    expect(card.cards[0]).toEqual({
      type: 'custom:thing',
      image: '/local/a.png',
      extra: 'one',
      position: 0,
      is_last: false,
      caption: '#0 last=false ',
    });
    expect(card.cards[1]).toMatchObject({ image: '', position: 1, is_last: true, caption: '#1 last=true ' });
  });

  it('leaves $item placeholders outside a repeat as written', () => {
    const p = parseBlueprintYaml(`blueprint:
  name: Plain
card:
  type: markdown
  content: "Use $item.name$ in a repeat"
`);
    expect(resolveBlueprintCard(p.card, p.meta, {}).content).toBe('Use $item.name$ in a repeat');
  });

  it('does not scan filled-in values again', () => {
    const p = parseBlueprintYaml(`blueprint:
  name: Plain
  input:
    a:
      type: text-field
    b:
      type: text-field
card:
  type: markdown
  content: "$a$ / $b$"
`);
    expect(resolveBlueprintCard(p.card, p.meta, { a: '$b$', b: 'B' }).content).toBe('$b$ / B');
  });
});

describe('requires_input', () => {
  it('drops the object when the input is empty and removes the key otherwise', () => {
    const p = parseBlueprintYaml(wasteYaml);
    const empty = resolveBlueprintCard(p.card, p.meta, { title: '', items: rows });
    expect(empty.cards.every((card: any) => card.type !== 'markdown')).toBe(true);

    const filled = resolveBlueprintCard(p.card, p.meta, { title: 'Bins', items: rows });
    expect(filled.cards[0]).toEqual({ type: 'markdown', content: '## Bins' });
  });

  it('treats false, empty lists and lists without entities as empty', () => {
    const p = parseBlueprintYaml(`blueprint:
  name: Optional parts
  input:
    show:
      type: boolean
    things:
      type: entity-list
    count:
      type: number
card:
  type: vertical-stack
  cards:
    - type: a
      requires_input: show
    - type: b
      requires_input: things
    - type: c
      requires_input: count
`);
    const none = resolveBlueprintCard(p.card, p.meta, { show: false, things: [{ name: 'x', entity: '' }], count: 0 });
    expect(none.cards).toEqual([{ type: 'c' }]);
    const all = resolveBlueprintCard(p.card, p.meta, { show: true, things: [{ entity: 'light.a' }], count: 2 });
    expect(all.cards).toEqual([{ type: 'a' }, { type: 'b' }, { type: 'c' }]);
  });

  it('also works on nested objects and inside templates', () => {
    const p = parseBlueprintYaml(`blueprint:
  name: Nested
  input:
    subtitle:
      type: text-field
    things:
      type: entity-list
card:
  type: grid
  header:
    requires_input: subtitle
    text: $subtitle$
  cards:
    - repeat: things
      template:
        type: tile
        entity: $item.entity$
        footer:
          requires_input: subtitle
          text: $subtitle$
`);
    const card = resolveBlueprintCard(p.card, p.meta, { subtitle: '', things: [{ entity: 'light.a' }] });
    expect(card).toEqual({ type: 'grid', cards: [{ type: 'tile', entity: 'light.a' }] });
  });
});

describe('$entities and $json', () => {
  const yaml = `blueprint:
  name: Lists
  input:
    things:
      type: entity-list
      default_icon: mdi:star
card:
  type: custom:list-card
  entities: $entities.things$
  label: "Watching $entities.things$"
  data: "const rows = $json.things$;"
`;

  it('gives the row entities as a list without duplicates', () => {
    const p = parseBlueprintYaml(yaml);
    const card = resolveBlueprintCard(p.card, p.meta, {
      things: [
        { name: 'A', entity: 'sensor.a' },
        { name: 'B', entity: '' },
        { name: 'A again', entity: 'sensor.a' },
        { name: 'C', entity: 'sensor.c' },
      ],
    });
    expect(card.entities).toEqual(['sensor.a', 'sensor.c']);
    expect(card.label).toBe('Watching sensor.a, sensor.c');
  });

  it('gives the complete rows as JSON inside a string', () => {
    const p = parseBlueprintYaml(yaml);
    const card = resolveBlueprintCard(p.card, p.meta, {
      things: [{ name: 'A', entity: 'sensor.a', icon: '' }, { name: 'B', entity: '' }],
    });
    expect(card.data).toBe('const rows = [{"name":"A","entity":"sensor.a","icon":"mdi:star"}];');
  });

  it('gives an empty list when the input is missing', () => {
    const p = parseBlueprintYaml(yaml);
    const card = resolveBlueprintCard(p.card, p.meta, {});
    expect(card.entities).toEqual([]);
    expect(card.data).toBe('const rows = [];');
  });
});

describe('localized i18n objects', () => {
  it('keeps i18n objects when filling in and localizes them at render time', () => {
    const p = parseBlueprintYaml(wasteYaml);
    const card = resolveBlueprintCard(p.card, p.meta, { items: rows });
    expect(card.cards[0].label).toEqual({ i18n: { de: 'Heute', nl: 'Vandaag', en: 'Today' } });

    expect(localizeBlueprintConfig(card, 'de').cards[0].label).toBe('Heute');
    expect(localizeBlueprintConfig(card, 'nl').cards[1].label).toBe('Vandaag');
  });

  it('falls back to English, then to the first text', () => {
    expect(localizeBlueprintConfig({ label: { i18n: { de: 'Heute', en: 'Today' } } }, 'fr')).toEqual({ label: 'Today' });
    expect(localizeBlueprintConfig({ label: { i18n: { de: 'Heute' } } }, 'fr')).toEqual({ label: 'Heute' });
  });

  it('matches regional and base languages', () => {
    const texts = { label: { i18n: { en: 'Color', 'pt-BR': 'Cor', zh_Hant: '顏色' } } };
    expect(localizeBlueprintConfig(texts, 'pt-br').label).toBe('Cor');
    expect(localizeBlueprintConfig(texts, 'zh-hant').label).toBe('顏色');
    expect(localizeBlueprintConfig({ label: { i18n: { en: 'Color', pt: 'Cor' } } }, 'pt-br').label).toBe('Cor');
  });

  it('only treats objects with i18n as their only key as localized', () => {
    const config = { action: { i18n: { en: 'x' }, other: true } };
    expect(localizeBlueprintConfig(config, 'en')).toEqual(config);
  });

  it('fills placeholders inside localized texts', () => {
    const p = parseBlueprintYaml(`blueprint:
  name: Greeting
  input:
    who:
      type: text-field
card:
  type: markdown
  content:
    i18n:
      en: "Hello $who$"
      nl: "Hallo $who$"
`);
    const card = resolveBlueprintCard(p.card, p.meta, { who: 'Dwain' });
    expect(localizeBlueprintConfig(card, 'nl').content).toBe('Hallo Dwain');
  });
});

describe('validateBlueprintValues', () => {
  const yaml = `blueprint:
  name: Checks
  input:
    main:
      name: Main sensor
      type: entity-picker
    extra:
      type: entity-picker
      default: ''
    things:
      type: entity-list
card:
  type: tile
`;

  it('requires an entity-picker without a default', () => {
    const { meta } = parseBlueprintYaml(yaml);
    expect(validateBlueprintValues(meta, { main: '', extra: '', things: [{ entity: 'light.a' }] }))
      .toEqual({ code: 'select_entity_first', key: 'main' });
  });

  it('lets default: empty make an entity-picker optional', () => {
    const { meta } = parseBlueprintYaml(yaml);
    expect(validateBlueprintValues(meta, { main: 'sensor.a', extra: '', things: [{ entity: 'light.a' }] }))
      .toBeUndefined();
  });

  it('requires at least one complete entity-list row', () => {
    const { meta } = parseBlueprintYaml(yaml);
    expect(validateBlueprintValues(meta, { main: 'sensor.a', things: [] }))
      .toEqual({ code: 'complete_entry_required', key: 'things' });
    expect(validateBlueprintValues(meta, { main: 'sensor.a', things: [{ entity: 'light.a' }, { name: 'Empty', entity: '' }] }))
      .toEqual({ code: 'complete_entry_required', key: 'things' });
  });
});

describe('documentation example', () => {
  it('parses the flow-style example from docs/blueprints.md', () => {
    const p = parseBlueprintYaml(`blueprint:
  name: Waste collection
  name_nl: Afvalkalender
  icon: mdi:trash-can-outline
  version: 1.0.0
  type: page
  input:
    title: { name: Title, type: text-field, default: '' }
    items: { name: Waste types, type: entity-list, entity_domain: sensor, default_icon: mdi:trash-can-outline }
card:
  type: vertical-stack
  cards:
    - type: markdown
      requires_input: title
      content: "## $title$"
    - repeat: items
      template: { type: tile, entity: $item.entity$, name: $item.name$, icon: $item.icon$ }
`);
    expect(p.meta.input?.items?.type).toBe('entity-list');
    const card = resolveBlueprintCard(p.card, p.meta, {
      ...defaultValues(p.meta),
      items: [{ name: 'Paper', entity: 'sensor.paper', icon: '' }],
    });
    expect(card.cards).toEqual([
      { type: 'tile', entity: 'sensor.paper', name: 'Paper', icon: 'mdi:trash-can-outline' },
    ]);
  });
});
