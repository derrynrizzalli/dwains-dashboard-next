import type { DwainsDashboardConfig } from '../../types/strategy';
import { resolveEntityCardConfig } from '../../utils/blueprint-replacements';
import { ensureMushroomAvailable, isMushroomCardType } from '../../utils/mushroom-tiles';

/**
 * Header favorite. Renders the domain-mapped Mushroom card (or an assigned
 * replacement blueprint). If Mushroom is not loaded, falls back to the
 * Home Assistant tile card this host used to create directly.
 */
export class DwainsTileHost extends HTMLElement {
  private _hass: any | undefined;
  private _entityId: string | undefined;
  private _name: string | undefined;
  private _dashboardConfig: DwainsDashboardConfig | undefined;
  private _child: any | null = null;
  private _childKey = '';
  private _request = 0;

  static get observedAttributes() {
    return ['entity', 'name'];
  }

  set hass(value: any) {
    this._hass = value;
    if (this._child) this._child.hass = value;
    void this._ensureChild();
  }

  get hass() {
    return this._hass;
  }

  set dashboardConfig(value: DwainsDashboardConfig | undefined) {
    this._dashboardConfig = value;
    void this._ensureChild();
  }

  get dashboardConfig() {
    return this._dashboardConfig;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'entity') this._entityId = value ?? undefined;
    if (name === 'name') this._name = value ?? undefined;
    void this._ensureChild();
  }

  connectedCallback() {
    this.style.display = 'block';
    void this._ensureChild();
  }

  disconnectedCallback() {
    this._request += 1;
    this._child = null;
    this._childKey = '';
    this.replaceChildren();
  }

  private _desiredConfig(): any | undefined {
    if (!this._entityId) return undefined;
    const config = resolveEntityCardConfig({
      hass: this._hass,
      config: this._dashboardConfig,
      entity: this._entityId,
      surface: 'area_cards',
    });
    if (this._name && config.name === undefined && isMushroomCardType(config.type)) {
      return { ...config, name: this._name };
    }
    return config;
  }

  private async _ensureChild() {
    if (!this.isConnected || !this._entityId) return;

    const request = ++this._request;
    let config = this._desiredConfig();
    if (!config) return;

    if (isMushroomCardType(config.type)) {
      const ready = await ensureMushroomAvailable();
      if (request !== this._request || !this.isConnected) return;
      if (!ready) {
        config = { type: 'tile', entity: this._entityId };
        if (this._name) config.name = this._name;
      }
    }

    const key = `${config.type}:${config.entity ?? this._entityId}:${config.name ?? ''}`;
    if (this._child && this.contains(this._child) && this._childKey === key) {
      if (this._hass) this._child.hass = this._hass;
      return;
    }

    try {
      const child = config.type === 'tile'
        ? await this._createHaTile(config)
        : await this._createLovelaceCard(config);
      if (request !== this._request || !this.isConnected || !child) return;
      if (this._hass) child.hass = this._hass;
      this._child = child;
      this._childKey = key;
      this.replaceChildren(child);
    } catch (e) {
      if (request !== this._request || !this.isConnected) return;
      console.warn('dwains-dashboard-next-tile-host: failed to configure tile', e);
    }
  }

  private async _createHaTile(config: { entity: string; name?: string }): Promise<any | undefined> {
    if (!customElements.get('hui-tile-card')) {
      try {
        await customElements.whenDefined('hui-tile-card');
      } catch {
        return undefined;
      }
    }
    const child = document.createElement('hui-tile-card') as any;
    child.classList.add('favorite-tile');
    child.setAttribute('data-entity', config.entity);
    if ('setConfig' in child) child.setConfig(config);
    return child;
  }

  private async _createLovelaceCard(config: any): Promise<any | undefined> {
    const loadCardHelpers = (window as any).loadCardHelpers;
    if (typeof loadCardHelpers !== 'function') {
      throw new Error('Home Assistant card helpers are not available');
    }
    const helpers = await loadCardHelpers();
    return helpers.createCardElement(config);
  }
}

if (!customElements.get('dwains-dashboard-next-tile-host')) {
  customElements.define('dwains-dashboard-next-tile-host', DwainsTileHost);
}
