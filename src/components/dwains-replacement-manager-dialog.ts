import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { mdiClose } from '@mdi/js';
import type { HomeAssistant } from '../types/home-assistant';
import type { BlueprintReplacementAssignment, DwainsDashboardConfig } from '../types/strategy';
import {
  blueprintText,
  defaultValues,
  parseBlueprintYaml,
  type ParsedBlueprint,
} from '../utils/blueprints';
import { domainReplacementEntries, setDomainReplacement } from '../utils/blueprint-replacements';
import { getDomainName } from '../utils/domain-names';
import { ddLang, ddLocalize } from '../utils/localize';

interface ReplacementManagerParams {
  config: DwainsDashboardConfig;
  onSave: (config: DwainsDashboardConfig) => void;
  /** Domain of an existing replacement to edit. */
  initialDomain?: string;
}

interface GalleryItem {
  name: string;
  description?: string;
  type?: string;
  version?: string;
  url: string;
  custom_cards?: string[];
}

const GALLERY_URL =
  'https://raw.githubusercontent.com/dwainscheeren/dwains-dashboard-blueprints/main/blueprints.json';

const DOMAIN_HINTS: Array<[string, string[]]> = [
  ['alarm_control_panel', ['alarm-control-panel', 'alarm card', 'alarm_control_panel', 'alarm']],
  ['media_player', ['media-player', 'media player', 'mediaplayer']],
  ['binary_sensor', ['binary_sensor', 'binary sensor', 'motion sensor', 'window sensor', 'door sensor', 'motion/window/door']],
  ['cover', ['mushroom-cover', 'slider-button-cover', 'replace_slider_button_cover', 'cover card', 'cover']],
  ['climate', ['mushroom-climate', 'climate card', 'climate']],
  ['switch', ['slider-button-switch', 'replace_slider_button_switch', 'switch card', 'switch']],
  ['light', ['mushroom-light', 'slider-button-light', 'replace_slider_button_light', 'light card', 'light']],
  ['fan', ['mushroom-fan', 'slider-button-fan', 'replace_slider_button_fan', 'fan card', 'fan']],
  ['lock', ['mushroom-lock', 'lock card', 'lock']],
  ['person', ['mushroom-person', 'person card', 'person']],
  ['update', ['mushroom-update', 'update card', 'update']],
  ['vacuum', ['mushroom-vacuum', 'vacuum card', 'vacuum']],
  ['sensor', ['sensor card', 'sensor']],
];

const SYNTHETIC_INPUTS = new Set([
  'replace_with_input_entity',
  'replace_with_input_entity_id',
  'replace_with_input_name',
  'replace_with_input_domain',
  'replace_with_input_device_class',
  'replace_with_input_area',
]);

/**
 * Assigns a replace-card blueprint to a domain, or edits the blueprint of an
 * existing domain replacement. The list of replacements lives on the settings
 * page.
 */
@customElement('dwains-dashboard-next-replacement-manager-dialog')
export class DwainsReplacementManagerDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;
  @state() private _params?: ReplacementManagerParams;
  @state() private _config?: DwainsDashboardConfig;

  // Domain filter and target. Empty means all domains.
  @state() private _domain = '';

  @state() private _gallery: GalleryItem[] = [];
  @state() private _galleryLoading = false;
  @state() private _galleryError = '';
  @state() private _search = '';
  @state() private _selected?: GalleryItem;
  @state() private _parsed?: ParsedBlueprint;
  @state() private _inputs: Record<string, any> = {};
  @state() private _loadingBlueprint = false;
  @state() private _error = '';

  private _t(key: string, replacements?: Record<string, string | number>): string {
    return ddLocalize(this.hass, key, replacements);
  }

  private get _editDomain(): string | undefined {
    return this._params?.initialDomain || undefined;
  }

  public showDialog(params: ReplacementManagerParams): void {
    this._params = params;
    this._config = params.config;
    this._domain = params.initialDomain || '';
    this._search = '';
    this._selected = undefined;
    this._parsed = undefined;
    this._inputs = {};
    this._error = '';
    if (params.initialDomain) this._selectCurrentAssignment(params.initialDomain);
    this._open = true;
    void this._loadGallery();
  }

  public closeDialog(): void {
    this._open = false;
    this._params = undefined;
    this.remove();
  }

  protected render() {
    if (!this._open || !this._config) return nothing;
    const title = this._editDomain
      ? this._t('replacement.edit_title', { domain: getDomainName(this.hass, this._editDomain) })
      : this._t('replacement.assign');
    return html`
      <ha-dialog open @closed=${this.closeDialog} .heading=${title} hideActions>
        <ha-dialog-header slot="header">
          <ha-icon-button
            slot="navigationIcon"
            .path=${mdiClose}
            .label=${this._t('common.close')}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span slot="title">${title}</span>
        </ha-dialog-header>

        <div class="content">
          ${this._renderBuilder()}
        </div>
      </ha-dialog>
    `;
  }

  private _renderBuilder() {
    const conflict = this._conflict();
    return html`
      <section class="builder">
        <p class="hint intro">${this._t('replacement.views_description')}</p>
        <div class="builder-controls">
          <label class="control-block">
            <span>${this._t('replacement.domain')}</span>
            ${this._renderDomainControl()}
          </label>
          <label class="control-block">
            <span>${this._t('replacement.search')}</span>
            <input
              class="search"
              type="search"
              .value=${this._search}
              @input=${(e: Event) => (this._search = (e.target as HTMLInputElement).value)}
            />
          </label>
        </div>
        ${this._error ? html`<div class="error" role="alert">${this._error}</div>` : nothing}
        ${conflict ? html`<div class="error" role="alert">${conflict}</div>` : nothing}
        ${this._galleryLoading ? html`<div class="loading">${this._t('common.loading')}</div>` : nothing}
        ${this._galleryError ? html`<div class="error">${this._galleryError}</div>` : nothing}

        <div class="gallery">
          ${repeat(
            this._filteredGallery(),
            (item) => item.url,
            (item) => html`
              <button
                type="button"
                class="blueprint-choice ${this._selected?.url === item.url ? 'selected' : ''}"
                aria-pressed=${this._selected?.url === item.url ? 'true' : 'false'}
                @click=${() => this._selectBlueprint(item)}
              >
                <span class="choice-name">${item.name}</span>
                ${item.description ? html`<span class="choice-desc">${item.description}</span>` : nothing}
                <span class="choice-tags">
                  ${item.version ? html`<span>v${item.version}</span>` : nothing}
                  ${(item.custom_cards || []).slice(0, 3).map((card) => html`<span>${card}</span>`)}
                </span>
              </button>
            `
          )}
        </div>

        ${this._selected ? this._renderSelectedBlueprint() : nothing}
      </section>
    `;
  }

  private _renderDomainControl() {
    return html`
      <select
        .value=${this._domain}
        ?disabled=${!!this._editDomain}
        @change=${(e: Event) => this._setDomain((e.target as HTMLSelectElement).value)}
      >
        ${this._domainOptions().map(
          (option) => html`<option value=${option.value} ?selected=${option.value === this._domain}>${option.label}</option>`
        )}
      </select>
    `;
  }

  private _renderSelectedBlueprint() {
    const inputKeys = this._editableInputKeys();
    return html`
      <div class="selected-blueprint">
        <div class="selected-header">
          <div>
            <div class="selected-name">${this._selected!.name}</div>
            ${this._parsed?.meta.version ? html`<div class="selected-version">v${this._parsed.meta.version}</div>` : nothing}
          </div>
          <ha-button
            appearance="accent"
            ?disabled=${this._loadingBlueprint || !this._canApply()}
            @click=${this._applyAssignment}
          >
            <ha-icon icon="mdi:check"></ha-icon>
            ${this._t('common.apply')}
          </ha-button>
        </div>

        ${this._loadingBlueprint ? html`<div class="loading">${this._t('replacement.loading_blueprint')}</div>` : nothing}
        <div class="hint">
          ${this._domain
            ? this._t('replacement.applies_to', { domain: getDomainName(this.hass, this._domain) })
            : this._t('replacement.choose_domain')}
        </div>
        ${inputKeys.length
          ? html`
              <div class="input-grid">
                ${inputKeys.map((key) => this._renderInputField(key))}
              </div>
            `
          : html`<div class="hint">${this._t('replacement.entity_hint')}</div>`}
      </div>
    `;
  }

  private _renderInputField(key: string) {
    const input = this._parsed?.meta.input?.[key];
    const lang = ddLang(this.hass);
    const description = input ? blueprintText(input, 'description', lang) : undefined;
    return html`
      <label class="input-field">
        <span>${(input && blueprintText(input, 'name', lang)) || key}</span>
        ${description ? html`<small>${description}</small>` : nothing}
        <input
          type=${input?.type === 'number' ? 'number' : 'text'}
          .value=${this._inputs[key] ?? ''}
          @input=${(e: Event) =>
            (this._inputs = { ...this._inputs, [key]: (e.target as HTMLInputElement).value })}
        />
      </label>
    `;
  }

  private async _loadGallery(): Promise<void> {
    if (this._gallery.length || this._galleryLoading) return;
    this._galleryLoading = true;
    this._galleryError = '';
    try {
      const resp = await fetch(GALLERY_URL, { redirect: 'follow' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const list: any[] = Array.isArray(data) ? data : data?.blueprints || [];
      this._gallery = list
        .filter((item) => item?.url && item?.name && item?.type === 'replace-card' && !isPopupBlueprint(item))
        .map((item) => ({
          name: String(item.name),
          description: item.description ? String(item.description) : undefined,
          type: item.type ? String(item.type) : undefined,
          version: item.version != null ? String(item.version) : undefined,
          url: String(item.url),
          custom_cards: Array.isArray(item.custom_cards) ? item.custom_cards.map(String) : undefined,
        }));
    } catch (e: any) {
      this._galleryError = String(e?.message || e);
    } finally {
      this._galleryLoading = false;
    }
  }

  // Start editing with the blueprint and inputs of the current replacement.
  private _selectCurrentAssignment(domain: string): void {
    const current = this._assignment(domain);
    if (!current) return;
    try {
      const parsed = parseBlueprintYaml(current.blueprint);
      this._selected = {
        name: current.name,
        url: current.source || '',
        version: current.version,
        custom_cards: current.custom_cards,
      };
      this._parsed = parsed;
      this._inputs = { ...defaultValues(parsed.meta), ...(current.inputs || {}) };
    } catch (e: any) {
      this._error = this._t('replacement.load_failed', { name: current.name, error: String(e?.message || e) });
    }
  }

  private _setDomain(domain: string): void {
    this._domain = domain;
    this._error = '';
    // A blueprint made for another domain no longer fits.
    const selectedDomain = this._selected ? inferBlueprintDomain(this._selected, this._parsed) : '';
    if (domain && selectedDomain && selectedDomain !== domain) {
      this._selected = undefined;
      this._parsed = undefined;
      this._inputs = {};
    }
  }

  private async _selectBlueprint(item: GalleryItem): Promise<void> {
    this._selected = item;
    this._parsed = undefined;
    this._inputs = {};
    this._error = '';
    this._loadingBlueprint = true;
    try {
      const resp = await fetch(item.url, { redirect: 'follow' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      if (this._selected !== item) return;
      const parsed = parseBlueprintYaml(text);
      const blueprintDomain = inferBlueprintDomain(item, parsed);
      if (blueprintDomain && this._domain && blueprintDomain !== this._domain) {
        this._error = this._t('replacement.domain_mismatch', {
          name: item.name,
          other: getDomainName(this.hass, blueprintDomain),
          domain: getDomainName(this.hass, this._domain),
        });
        this._selected = undefined;
        return;
      }
      if (blueprintDomain && !this._domain) this._domain = blueprintDomain;
      // Keep the inputs when picking the blueprint that is being edited again.
      const current = this._editDomain ? this._assignment(this._editDomain) : undefined;
      this._parsed = parsed;
      this._inputs = {
        ...defaultValues(parsed.meta),
        ...(current?.source && current.source === item.url ? current.inputs : {}),
      };
    } catch (e: any) {
      this._error = this._t('replacement.load_failed', {
        name: item.name,
        error: String(e?.message || e),
      });
    } finally {
      if (this._selected === item || !this._selected) this._loadingBlueprint = false;
    }
  }

  private _applyAssignment = (): void => {
    if (!this._selected || !this._parsed || !this._canApply()) return;
    const target = this._domain;
    const assignment: BlueprintReplacementAssignment = {
      id: this._slug(`${this._selected.name}-${target}`),
      name: this._selected.name,
      source: this._selected.url || undefined,
      version: this._parsed.meta.version,
      blueprint: this._parsed.raw,
      inputs: this._stripSyntheticInputs(this._inputs),
      custom_cards: this._parsed.meta.custom_cards || this._selected.custom_cards || [],
      enabled: this._assignment(target)?.enabled ?? true,
    };
    const replacements = setDomainReplacement(this._config!.blueprint_replacements, target, assignment);
    this._params?.onSave({ ...this._config!, blueprint_replacements: replacements });
    this.closeDialog();
  };

  private _assignment(domain: string): BlueprintReplacementAssignment | undefined {
    return domainReplacementEntries(this._config?.blueprint_replacements).find((entry) => entry.domain === domain)
      ?.assignment;
  }

  // Another replacement already uses the chosen domain.
  private _conflict(): string {
    if (!this._domain || this._domain === this._editDomain || !this._assignment(this._domain)) return '';
    return this._t('replacement.already_assigned', { domain: getDomainName(this.hass, this._domain) });
  }

  // Domains offered by the gallery, plus the assigned and current ones.
  private _domainOptions(): Array<{ value: string; label: string }> {
    const domains = new Set<string>();
    this._gallery.forEach((item) => {
      const domain = inferBlueprintDomain(item);
      if (domain) domains.add(domain);
    });
    domainReplacementEntries(this._config?.blueprint_replacements).forEach((entry) => domains.add(entry.domain));
    if (this._domain) domains.add(this._domain);
    const options = Array.from(domains)
      .map((domain) => ({ value: domain, label: getDomainName(this.hass, domain) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: '', label: this._t('replacement.all_domains') }, ...options];
  }

  private _canApply(): boolean {
    return !!this._parsed && !!this._selected && !!this._domain && !this._conflict();
  }

  // Blueprints for the chosen domain, plus blueprints that fit any domain.
  private _filteredGallery(): GalleryItem[] {
    const q = this._search.trim().toLowerCase();
    return this._gallery
      .filter((item) => {
        if (!this._domain) return true;
        const domain = inferBlueprintDomain(item);
        return !domain || domain === this._domain;
      })
      .filter((item) => {
        if (!q) return true;
        const haystack = `${item.name} ${item.description || ''} ${(item.custom_cards || []).join(' ')}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private _editableInputKeys(): string[] {
    return Object.keys(this._parsed?.meta.input || {}).filter((key) => !SYNTHETIC_INPUTS.has(key));
  }

  private _stripSyntheticInputs(inputs: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    Object.entries(inputs).forEach(([key, value]) => {
      if (!SYNTHETIC_INPUTS.has(key) && value !== '') out[key] = value;
    });
    return out;
  }

  private _slug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  static override styles = css`
    :host {
      --mdc-dialog-min-width: min(880px, 92vw);
      --mdc-dialog-max-width: min(960px, 96vw);
    }
    ha-dialog {
      --dialog-content-padding: 0;
    }
    .content {
      padding: 0 18px 20px;
      color: var(--primary-text-color);
    }
    .selected-blueprint {
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--card-background-color);
    }
    .selected-name {
      font-weight: 600;
    }
    .choice-desc,
    .selected-version,
    .hint,
    small {
      color: var(--secondary-text-color);
      font-size: 12px;
    }
    .hint.intro {
      margin: 0 0 12px;
    }
    .choice-tags span {
      border-radius: 999px;
      padding: 2px 8px;
      background: var(--secondary-background-color);
      color: var(--secondary-text-color);
      font-size: 12px;
      white-space: nowrap;
    }
    .choice-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 6px;
    }
    .builder-controls {
      display: grid;
      grid-template-columns: minmax(180px, 260px) minmax(220px, 1fr);
      gap: 12px;
      margin-bottom: 12px;
    }
    .control-block {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    label {
      font-size: 12px;
      font-weight: 600;
      color: var(--secondary-text-color);
    }
    select,
    .search,
    .input-field input {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 10px 11px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-size: 14px;
    }
    select:disabled {
      opacity: 0.7;
    }
    .loading {
      margin-bottom: 8px;
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      max-height: 280px;
      overflow: auto;
      padding-right: 2px;
    }
    .blueprint-choice {
      text-align: left;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
      padding: 10px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .blueprint-choice:hover,
    .blueprint-choice.selected {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color) inset;
    }
    .choice-name {
      font-weight: 600;
    }
    .selected-blueprint {
      margin-top: 12px;
      padding: 12px;
    }
    .selected-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .selected-header ha-icon {
      --mdc-icon-size: 18px;
      margin-right: 5px;
    }
    .input-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    .input-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .error {
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(var(--rgb-error-color, 244, 67, 54), 0.12);
      color: var(--error-color);
      margin-bottom: 10px;
    }
    @media (max-width: 760px) {
      :host {
        --mdc-dialog-min-width: 96vw;
      }
      .builder-controls,
      .gallery,
      .input-grid {
        grid-template-columns: 1fr;
      }
      .selected-header {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `;
}

function inferBlueprintDomain(item: GalleryItem, parsed?: ParsedBlueprint): string {
  const haystack = [
    item.name,
    item.description,
    item.url,
    ...(item.custom_cards || []),
    parsed?.meta.name,
    parsed?.meta.description,
    ...(parsed?.meta.custom_cards || []),
    stringifyCardType(parsed?.card),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return DOMAIN_HINTS.find(([, hints]) => hints.some((hint) => haystack.includes(hint)))?.[0] || '';
}

function stringifyCardType(card: any): string {
  if (!card) return '';
  if (typeof card?.type === 'string') return card.type;
  try {
    return JSON.stringify(card);
  } catch {
    return '';
  }
}

function isPopupBlueprint(item: any): boolean {
  const haystack = `${item?.name || ''} ${item?.description || ''} ${item?.url || ''}`.toLowerCase();
  return haystack.includes('popup');
}

export function openReplacementManager(
  hass: HomeAssistant,
  config: DwainsDashboardConfig,
  onSave: (config: DwainsDashboardConfig) => void,
  initialDomain?: string
): void {
  // Mount inside <home-assistant>, where Home Assistant mounts its own dialogs,
  // so cards and controls can reach the context it provides.
  const root: ParentNode = (document.querySelector('home-assistant') as HTMLElement | null)?.shadowRoot || document.body;
  let dlg = root.querySelector(
    'dwains-dashboard-next-replacement-manager-dialog'
  ) as DwainsReplacementManagerDialog | null;
  if (!dlg) {
    dlg = document.createElement('dwains-dashboard-next-replacement-manager-dialog') as DwainsReplacementManagerDialog;
    root.appendChild(dlg);
  }
  dlg.hass = hass;
  dlg.showDialog({ config, onSave, initialDomain });
}

declare global {
  interface HTMLElementTagNameMap {
    'dwains-dashboard-next-replacement-manager-dialog': DwainsReplacementManagerDialog;
  }
}
