import type { LovelaceCardConfig } from '../types/strategy';

/**
 * Tile types the dashboard can render as a Mushroom card. `entity` is the
 * generic card used for domains without a dedicated Mushroom card.
 * `todo` is not a tile type: those entities stay Home Assistant todo-list cards.
 */
export const MUSHROOM_TILE_TYPES = [
  'light',
  'cover',
  'fan',
  'climate',
  'lock',
  'media_player',
  'alarm_control_panel',
  'person',
  'vacuum',
  'number',
  'select',
  'update',
  'entity',
] as const;

export type MushroomTileType = (typeof MUSHROOM_TILE_TYPES)[number];

/** Per-type Lovelace config stored on the dashboard strategy. */
export type MushroomTileOverrides = Partial<Record<MushroomTileType, LovelaceCardConfig>>;

/** Element defined by every lovelace-mushroom build. One module registers the rest. */
export const MUSHROOM_PROBE_ELEMENT = 'mushroom-entity-card';

/** How long to wait for the Lovelace resource before using the built-in tile. */
export const MUSHROOM_WAIT_MS = 2000;

export const MISSING_MUSHROOM_WARNING =
  'Dwains Dashboard Next - Mushroom cards are not loaded. Entity tiles use the built-in layout until lovelace-mushroom is available.';

export interface EnsureMushroomOptions {
  timeoutMs?: number;
  log?: Pick<Console, 'warn'>;
  whenDefined?: (name: string) => Promise<void>;
}

const TILE_TYPE_SET: ReadonlySet<string> = new Set(MUSHROOM_TILE_TYPES);

let availability: Promise<boolean> | undefined;
let warned = false;

export function resetMushroomAvailabilityForTests(): void {
  availability = undefined;
  warned = false;
}

export function isMushroomTileType(value: string): value is MushroomTileType {
  return TILE_TYPE_SET.has(value);
}

export function isMushroomCardType(type: unknown): boolean {
  return typeof type === 'string' && type.startsWith('custom:mushroom-');
}

export function mushroomElementReady(): boolean {
  return typeof customElements !== 'undefined' && !!customElements.get(MUSHROOM_PROBE_ELEMENT);
}

function warnMissingMushroom(log: Pick<Console, 'warn'>): void {
  if (warned) return;
  warned = true;
  log.warn(MISSING_MUSHROOM_WARNING);
}

function defaultWhenDefined(name: string): Promise<void> {
  if (typeof customElements === 'undefined' || typeof customElements.whenDefined !== 'function') {
    return new Promise(() => undefined);
  }
  return customElements.whenDefined(name).then(() => undefined);
}

function probeMushroom(options: EnsureMushroomOptions = {}): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? MUSHROOM_WAIT_MS;
  const log = options.log ?? console;
  const whenDefined = options.whenDefined ?? defaultWhenDefined;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!ready) warnMissingMushroom(log);
      resolve(ready);
    };
    const timer = setTimeout(() => finish(mushroomElementReady()), timeoutMs);
    whenDefined(MUSHROOM_PROBE_ELEMENT).then(
      () => finish(true),
      () => finish(false)
    );
  });
}

/**
 * Resolves true when lovelace-mushroom has registered its cards.
 * A missing resource waits once, then stays on the built-in tiles.
 * The warning is logged a single time for the whole page.
 */
export function ensureMushroomAvailable(options?: EnsureMushroomOptions): Promise<boolean> {
  if (mushroomElementReady()) return Promise.resolve(true);
  if (options) return probeMushroom(options);
  availability ??= probeMushroom();
  return availability;
}

export function mushroomTileTypeForDomain(domain: string): MushroomTileType {
  switch (domain) {
    case 'light':
      return 'light';
    case 'cover':
      return 'cover';
    case 'fan':
      return 'fan';
    case 'climate':
      return 'climate';
    case 'lock':
      return 'lock';
    case 'media_player':
      return 'media_player';
    case 'alarm_control_panel':
      return 'alarm_control_panel';
    case 'person':
      return 'person';
    case 'vacuum':
      return 'vacuum';
    case 'number':
    case 'input_number':
      return 'number';
    case 'select':
    case 'input_select':
      return 'select';
    case 'update':
      return 'update';
    default:
      return 'entity';
  }
}

export function mushroomCardType(tileType: MushroomTileType): string {
  switch (tileType) {
    case 'light':
      return 'custom:mushroom-light-card';
    case 'cover':
      return 'custom:mushroom-cover-card';
    case 'fan':
      return 'custom:mushroom-fan-card';
    case 'climate':
      return 'custom:mushroom-climate-card';
    case 'lock':
      return 'custom:mushroom-lock-card';
    case 'media_player':
      return 'custom:mushroom-media-player-card';
    case 'alarm_control_panel':
      return 'custom:mushroom-alarm-control-panel-card';
    case 'person':
      return 'custom:mushroom-person-card';
    case 'vacuum':
      return 'custom:mushroom-vacuum-card';
    case 'number':
      return 'custom:mushroom-number-card';
    case 'select':
      return 'custom:mushroom-select-card';
    case 'update':
      return 'custom:mushroom-update-card';
    case 'entity':
      return 'custom:mushroom-entity-card';
    default: {
      const exhaustive: never = tileType;
      return exhaustive;
    }
  }
}

function withName(card: LovelaceCardConfig, name?: string): LovelaceCardConfig {
  if (!name || card.name !== undefined) return card;
  return { ...card, name };
}

/** Built-in Mushroom card for one tile type. Options are accepted by Mushroom 3 and 4. */
export function builtinMushroomCardConfig(
  tileType: MushroomTileType,
  entityId: string,
  name?: string
): LovelaceCardConfig {
  switch (tileType) {
    case 'light':
      return withName({
        type: mushroomCardType(tileType),
        entity: entityId,
        use_light_color: true,
        show_brightness_control: true,
        collapsible_controls: true,
        layout: 'vertical',
      }, name);
    case 'cover':
      return withName({
        type: mushroomCardType(tileType),
        entity: entityId,
        show_buttons_control: true,
        show_position_control: true,
        layout: 'vertical',
      }, name);
    case 'fan':
      return withName({
        type: mushroomCardType(tileType),
        entity: entityId,
        show_percentage_control: true,
        collapsible_controls: true,
        layout: 'vertical',
      }, name);
    case 'climate':
      return withName({
        type: mushroomCardType(tileType),
        entity: entityId,
        show_temperature_control: true,
        collapsible_controls: true,
        layout: 'vertical',
      }, name);
    case 'media_player':
      return withName({
        type: mushroomCardType(tileType),
        entity: entityId,
        use_media_info: true,
        show_volume_level: true,
        collapsible_controls: true,
        layout: 'vertical',
      }, name);
    case 'lock':
    case 'alarm_control_panel':
    case 'person':
    case 'vacuum':
    case 'number':
    case 'select':
    case 'update':
    case 'entity':
      return withName({
        type: mushroomCardType(tileType),
        entity: entityId,
        layout: 'vertical',
      }, name);
    default: {
      const exhaustive: never = tileType;
      return exhaustive;
    }
  }
}

/**
 * Copy a stored per-type card and point it at this entity.
 * The stored config is the extension point for a mushroom-template-card later.
 */
export function applyMushroomTileOverride(
  overrides: MushroomTileOverrides | undefined,
  tileType: MushroomTileType,
  entityId: string,
  name?: string
): LovelaceCardConfig | undefined {
  const template = overrides?.[tileType];
  if (!template || typeof template.type !== 'string' || !template.type) return undefined;
  return withName({ ...template, entity: entityId }, name);
}

export interface ResolveEntityTileParams {
  entityId: string;
  overrides?: MushroomTileOverrides;
  name?: string;
}

/** Domain map, then an optional per-type override. Todo stays a todo-list card. */
export function resolveEntityTileCard(params: ResolveEntityTileParams): LovelaceCardConfig {
  const domain = params.entityId.split('.')[0] || '';
  if (domain === 'todo') return { type: 'todo-list', entity: params.entityId };

  const tileType = mushroomTileTypeForDomain(domain);
  const override = applyMushroomTileOverride(params.overrides, tileType, params.entityId, params.name);
  if (override) return override;
  return builtinMushroomCardConfig(tileType, params.entityId, params.name);
}
