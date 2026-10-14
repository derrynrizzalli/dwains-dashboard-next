import { parseYaml } from './yaml-mini';

/**
 * Blueprint-engine voor Dwains Dashboard v4 — volledig client-side.
 *
 * Behoudt het DD3-blueprintformaat 1-op-1:
 *
 *   blueprint:
 *     name: ...
 *     name_<lang>: ...           # optional translated name, e.g. name_nl
 *     description: ...
 *     description_<lang>: ...
 *     icon: mdi:...              # default page icon
 *     version: "1.0"
 *     type: page
 *     custom_cards: [ ... ]      # benodigde HACS-kaarten
 *     input:
 *       <key>:
 *         name: ...
 *         description: ...
 *         type: text-field | entity-picker | entity-list | icon-picker | boolean | number | area-picker
 *         default: ...           # optioneel
 *         entity_domain: sensor  # entity-picker / entity-list: only offer this domain
 *         suggest_entity: ...    # entity-picker: preselect when it exists
 *         default_icon: mdi:...  # entity-list: icon for rows without one
 *         add_label: ...         # entity-list: label of the add button
 *   card:
 *     type: ...
 *     ...                        # gebruikt $<key>$ placeholders
 *
 * Inside the card template:
 *  - `{ repeat: <list key>, template: {...} }` in a list is expanded once per
 *    entity-list row that has an entity, with $item.<field>$, $item.index$ and
 *    $item.last$ placeholders.
 *  - `requires_input: <key>` drops the object when that input is empty.
 *  - `$entities.<key>$` as the whole value gives the row entities as a list,
 *    `$json.<key>$` gives the rows as JSON text.
 *  - `{ i18n: { en: ..., nl: ... } }` is kept in the saved card and replaced by
 *    the viewer's language when the card is rendered (localizeBlueprintConfig).
 */

export type BlueprintInputType =
  | 'text-field'
  | 'entity-picker'
  | 'entity-list'
  | 'icon-picker'
  | 'boolean'
  | 'number'
  | 'area-picker'
  | string;

/** One row of an entity-list input. Rows may carry extra fields. */
export interface BlueprintListRow {
  name?: string;
  entity?: string;
  icon?: string;
  image?: string;
  [field: string]: unknown;
}

export type BlueprintTextField = 'name' | 'description' | 'add_label';

/** Translated texts per field and language, read from keys like name_nl. */
export type BlueprintTranslations = Partial<Record<BlueprintTextField, Record<string, string>>>;

export interface BlueprintInput {
  name?: string;
  description?: string;
  type?: BlueprintInputType;
  default?: any;
  entity_domain?: string;
  suggest_entity?: string;
  default_icon?: string;
  add_label?: string;
  translations?: BlueprintTranslations;
}

export interface BlueprintMeta {
  name: string;
  description?: string;
  version?: string;
  type?: string;
  author?: string;
  icon?: string;
  translations?: BlueprintTranslations;
  custom_cards?: string[];
  input?: Record<string, BlueprintInput>;
}

export interface ParsedBlueprint {
  meta: BlueprintMeta;
  card: any;
  raw: string;
}

export type BlueprintValidationError = {
  code: 'select_entity_first' | 'complete_entry_required';
  key: string;
};

const DEFAULT_ROW_ICON = 'mdi:shape';
const TRANSLATED_KEY = /^(name|description|add_label)_([a-z]{2,3}(?:[-_][a-z0-9]{2,8})*)$/i;

/** Parse blueprint-YAML naar metadata + kaart-template. Gooit bij fouten. */
export function parseBlueprintYaml(text: string): ParsedBlueprint {
  let doc: any;
  try {
    doc = parseYaml(text);
  } catch (e: any) {
    throw new Error('Could not read YAML: ' + (e?.message || e));
  }
  if (!doc || typeof doc !== 'object') {
    throw new Error('Empty or invalid blueprint.');
  }
  if (!doc.blueprint || typeof doc.blueprint !== 'object') {
    throw new Error('Blueprint is missing the "blueprint:" section.');
  }
  if (doc.card === undefined || doc.card === null) {
    throw new Error('Blueprint is missing the "card:" section.');
  }

  const bp = doc.blueprint;
  const meta: BlueprintMeta = {
    name: String(bp.name ?? 'Untitled blueprint'),
    description: bp.description != null ? String(bp.description) : undefined,
    version: bp.version != null ? String(bp.version) : undefined,
    type: bp.type != null ? String(bp.type) : 'page',
    author: bp.author != null ? String(bp.author) : undefined,
    icon: optionalString(bp.icon),
    translations: collectTranslations(bp, ['name', 'description']),
    custom_cards: Array.isArray(bp.custom_cards) ? bp.custom_cards.map(String) : [],
    input: normalizeInputs(bp.input),
  };

  return { meta, card: doc.card, raw: text };
}

function normalizeInputs(input: any): Record<string, BlueprintInput> {
  const out: Record<string, BlueprintInput> = {};
  if (!input || typeof input !== 'object') return out;
  for (const key of Object.keys(input)) {
    const def = input[key] || {};
    out[key] = {
      name: def.name != null ? String(def.name) : key,
      description: def.description != null ? String(def.description) : undefined,
      type: def.type != null ? String(def.type) : 'text-field',
      default: def.default,
      entity_domain: optionalString(def.entity_domain),
      suggest_entity: optionalString(def.suggest_entity),
      default_icon: optionalString(def.default_icon),
      add_label: optionalString(def.add_label),
      translations: collectTranslations(def, ['name', 'description', 'add_label']),
    };
  }
  return out;
}

function optionalString(value: unknown): string | undefined {
  if (value == null || typeof value === 'object') return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function collectTranslations(
  source: Record<string, any>,
  fields: BlueprintTextField[]
): BlueprintTranslations | undefined {
  let out: BlueprintTranslations | undefined;
  for (const [key, value] of Object.entries(source)) {
    const match = TRANSLATED_KEY.exec(key);
    if (!match || value == null || typeof value === 'object') continue;
    const field = match[1]!.toLowerCase() as BlueprintTextField;
    if (!fields.includes(field)) continue;
    out ??= {};
    (out[field] ??= {})[normalizeLanguage(match[2]!)] = String(value);
  }
  return out;
}

function normalizeLanguage(lang: string): string {
  return lang.trim().toLowerCase().replace(/_/g, '-');
}

/**
 * Pick the entry for a language from a map keyed by language code. Tries the
 * exact language, then its base language (pt-br -> pt), then any regional
 * variant of that base. Returns undefined when nothing matches.
 */
export function pickTranslation<T>(translations: Record<string, T> | undefined, lang: string): T | undefined {
  if (!translations) return undefined;
  const wanted = normalizeLanguage(lang);
  const base = wanted.split('-')[0];
  const entries = Object.entries(translations).map(([key, value]) => [normalizeLanguage(key), value] as const);
  return (
    entries.find(([key]) => key === wanted)?.[1] ??
    entries.find(([key]) => key === base)?.[1] ??
    entries.find(([key]) => key.split('-')[0] === base)?.[1]
  );
}

/**
 * Text of a blueprint or input field in the given language, falling back to
 * the plain field (name, description, add_label).
 */
export function blueprintText(
  source: { translations?: BlueprintTranslations } & Partial<Record<BlueprintTextField, string>>,
  field: BlueprintTextField,
  lang: string
): string | undefined {
  return pickTranslation(source.translations?.[field], lang) || source[field] || undefined;
}

/** Geef standaardwaarden voor alle inputs (voor een leeg formulier). */
export function defaultValues(meta: BlueprintMeta): Record<string, any> {
  const vals: Record<string, any> = {};
  const inputs = meta.input || {};
  for (const key of Object.keys(inputs)) {
    const def = inputs[key]!;
    if (def.type === 'entity-list') {
      vals[key] = Array.isArray(def.default)
        ? def.default.filter(isPlainObject).map((row: BlueprintListRow) => ({ ...row }))
        : [];
    } else if (def.default !== undefined) vals[key] = def.default;
    else if (def.type === 'boolean') vals[key] = false;
    else vals[key] = '';
  }
  return vals;
}

/** Rows of an entity-list value that have an entity. */
export function completeListRows(value: unknown): BlueprintListRow[] {
  return Array.isArray(value) ? value.filter(isCompleteRow) : [];
}

function isCompleteRow(row: unknown): row is BlueprintListRow {
  return isPlainObject(row) && typeof row.entity === 'string' && row.entity.trim() !== '';
}

/**
 * Check the values before saving: an entity-picker without a default needs an
 * entity, and an entity-list needs at least one row and an entity in every
 * row. Returns the first problem, or undefined when everything is filled in.
 */
export function validateBlueprintValues(
  meta: BlueprintMeta,
  values: Record<string, any>
): BlueprintValidationError | undefined {
  for (const [key, def] of Object.entries(meta.input || {})) {
    const value = values[key];
    if (def.type === 'entity-picker' && def.default === undefined) {
      if (typeof value !== 'string' || !value.trim()) return { code: 'select_entity_first', key };
    }
    if (def.type === 'entity-list') {
      const rows = Array.isArray(value) ? value : [];
      if (!rows.length || !rows.every(isCompleteRow)) return { code: 'complete_entry_required', key };
    }
  }
  return undefined;
}

interface RepeatContext {
  row: BlueprintListRow;
  index: number;
  last: boolean;
}

// Marks an object dropped by requires_input.
const REMOVED = Symbol('removed');
// Marks a placeholder that stays as written (an $item...$ outside a repeat).
const KEEP = Symbol('keep');

/**
 * Vul de kaart-template met de ingevulde inputwaarden. Vervangt elke
 * $<key>$ placeholder. Wanneer een stringwaarde exact één placeholder is en de
 * ingevulde waarde numeriek/boolean is, wordt het type behouden (zodat bv.
 * maxDaysToShow een nummer wordt i.p.v. "7").
 *
 * Localized `{ i18n: ... }` objects are kept; render them with
 * localizeBlueprintConfig.
 */
export function resolveBlueprintCard(
  card: any,
  meta: BlueprintMeta,
  values: Record<string, any>
): any {
  const inputs = meta.input || {};
  // Langere keys eerst, zodat $11$ niet door $1$ wordt geraakt. Neem ook
  // runtime/synthetic values mee voor DD3 replace-card placeholders zoals
  // $replace_with_input_entity$, ook wanneer ze niet in blueprint.input staan.
  const keys = Array.from(new Set([...Object.keys(inputs), ...Object.keys(values || {})]))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const tokens = [
    'item\\.[A-Za-z0-9_]+',
    'entities\\.[A-Za-z0-9_]+',
    'json\\.[A-Za-z0-9_]+',
    ...keys.map(escapeRegExp),
  ].join('|');
  // One pass over the text, so filled-in values are never scanned again.
  const tokenPattern = new RegExp(`\\$(${tokens})\\$`, 'g');
  const wholePattern = new RegExp(`^\\$(${tokens})\\$$`);

  return walk(card, undefined, true);

  function walk(node: any, item?: RepeatContext, top = false): any {
    if (typeof node === 'string') return substitute(node, item);
    if (Array.isArray(node)) {
      const out: any[] = [];
      for (const entry of node) {
        if (isRepeatBlock(entry)) {
          out.push(...expandRepeat(entry));
          continue;
        }
        const next = walk(entry, item);
        if (next !== REMOVED) out.push(next);
      }
      return out;
    }
    if (isPlainObject(node)) {
      if (!top && typeof node.requires_input === 'string' && !hasValue(node.requires_input)) {
        return REMOVED;
      }
      const out: Record<string, any> = {};
      for (const key of Object.keys(node)) {
        if (key === 'requires_input') continue;
        const next = walk(node[key], item);
        if (next !== REMOVED) out[key] = next;
      }
      return out;
    }
    return node;
  }

  function expandRepeat(entry: { repeat: string; template: any; requires_input?: unknown }): any[] {
    if (typeof entry.requires_input === 'string' && !hasValue(entry.requires_input)) return [];
    const rows = listRows(entry.repeat);
    const out: any[] = [];
    rows.forEach((row, index) => {
      const next = walk(entry.template, { row, index, last: index === rows.length - 1 });
      if (next !== REMOVED) out.push(next);
    });
    return out;
  }

  // Complete rows of an entity-list, with the icon fallback applied.
  function listRows(key: string): BlueprintListRow[] {
    const fallbackIcon = inputs[key]?.default_icon || DEFAULT_ROW_ICON;
    return completeListRows(values[key]).map((row) => ({
      ...row,
      icon: typeof row.icon === 'string' && row.icon.trim() ? row.icon : fallbackIcon,
    }));
  }

  function hasValue(key: string): boolean {
    const value = values[key];
    if (value == null || value === false) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) {
      return inputs[key]?.type === 'entity-list' ? completeListRows(value).length > 0 : value.length > 0;
    }
    return true;
  }

  function substitute(str: string, item?: RepeatContext): any {
    // Exact één placeholder? Behoud type van de waarde.
    const whole = wholePattern.exec(str);
    if (whole) {
      const value = tokenValue(whole[1]!, item, true);
      if (value !== KEEP) return value;
    }
    // Anders: tekstvervanging binnen de string.
    return str.replace(tokenPattern, (match, token: string) => {
      const value = tokenValue(token, item, false);
      return value === KEEP ? match : value;
    });
  }

  function tokenValue(token: string, item: RepeatContext | undefined, whole: boolean): any {
    if (token.startsWith('item.')) {
      if (!item) return KEEP;
      const field = token.slice(5);
      if (field === 'index') return whole ? item.index : String(item.index);
      if (field === 'last') return whole ? item.last : String(item.last);
      const value = item.row[field];
      if (whole) return value ?? '';
      return value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    if (token.startsWith('entities.')) {
      const entities = Array.from(new Set(listRows(token.slice(9)).map((row) => String(row.entity))));
      return whole ? entities : entities.join(', ');
    }
    if (token.startsWith('json.')) {
      const key = token.slice(5);
      const value = values[key];
      const rows = inputs[key]?.type === 'entity-list' ? listRows(key) : Array.isArray(value) ? value : [];
      return JSON.stringify(rows);
    }
    if (whole) return coerce(values[token]);
    const value = values[token];
    return value == null ? '' : String(value);
  }
}

function isRepeatBlock(entry: unknown): entry is { repeat: string; template: any; requires_input?: unknown } {
  return isPlainObject(entry) && typeof entry.repeat === 'string' && 'template' in entry;
}

/**
 * Replace every `{ i18n: { en: ..., nl: ... } }` object by the text for the
 * given language, falling back to English and then to the first entry. Only
 * objects with `i18n` as their only key count as localized.
 */
export function localizeBlueprintConfig(node: any, lang: string): any {
  if (Array.isArray(node)) return node.map((entry) => localizeBlueprintConfig(entry, lang));
  if (!isPlainObject(node)) return node;
  if (isLocalizedObject(node)) {
    const texts = node.i18n as Record<string, any>;
    const value = pickTranslation(texts, lang) ?? pickTranslation(texts, 'en') ?? Object.values(texts)[0];
    return localizeBlueprintConfig(value ?? '', lang);
  }
  const out: Record<string, any> = {};
  for (const key of Object.keys(node)) out[key] = localizeBlueprintConfig(node[key], lang);
  return out;
}

function isLocalizedObject(node: Record<string, any>): boolean {
  const keys = Object.keys(node);
  return keys.length === 1 && keys[0] === 'i18n' && isPlainObject(node.i18n) && Object.keys(node.i18n).length > 0;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function coerce(v: any): any {
  if (v == null) return '';
  if (typeof v !== 'string') return v;
  const t = v.trim();
  if (t === '') return '';
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^[-+]?\d+$/.test(t)) return parseInt(t, 10);
  if (/^[-+]?(\d+\.\d*|\.\d+)$/.test(t)) return parseFloat(t);
  return v;
}

/** Verzamel alle custom: kaarttypes die in de template voorkomen. */
export function collectCustomCardTypes(card: any): string[] {
  const found = new Set<string>();
  walk(card);
  return Array.from(found);

  function walk(node: any) {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      if (typeof node.type === 'string' && node.type.startsWith('custom:')) {
        found.add(node.type.slice('custom:'.length));
      }
      Object.values(node).forEach(walk);
    }
  }
}
