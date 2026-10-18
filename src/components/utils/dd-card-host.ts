import { ensureMushroomAvailable, isMushroomCardType } from '../../utils/mushroom-tiles';

// Generieke host voor een willekeurige Lovelace-kaart-config. Maakt de echte
// kaart via Home Assistants card helpers en beheert die in de eigen light-DOM,
// zodat er nooit een rauw DOM-element in een Lit-template van de ouder belandt.
export class DwainsCardHost extends HTMLElement {
  private _hass: any | undefined;
  private _config: any | undefined;
  private _fallbackConfig: any | undefined;
  private _configKey = '';
  private _renderedConfigKey = '';
  private _child: any | null = null;
  private _observer?: IntersectionObserver;
  private _hasRendered = false;
  private _renderRequest = 0;

  set hass(value: any) {
    this._hass = value;
    if (this._child) this._child.hass = value;
  }
  get hass() {
    return this._hass;
  }

  set config(value: any) {
    this._config = value;
    this._rememberConfigKey();
    this._renderWhenVisible();
  }
  get config() {
    return this._config;
  }

  /** Card used when `config` is a Mushroom card and lovelace-mushroom is missing. */
  set fallbackConfig(value: any) {
    this._fallbackConfig = value;
    this._rememberConfigKey();
    this._renderWhenVisible();
  }
  get fallbackConfig() {
    return this._fallbackConfig;
  }

  private _rememberConfigKey(): void {
    this._configKey = `${this._getConfigKey(this._config)}|${this._getConfigKey(this._fallbackConfig)}`;
  }

  connectedCallback() {
    this.style.display = 'block';
    this.style.setProperty('content-visibility', 'auto');
    this.style.setProperty('contain-intrinsic-size', '120px');
    this._renderWhenVisible();
  }

  disconnectedCallback() {
    this._renderRequest += 1;
    this._observer?.disconnect();
    this._observer = undefined;
    this._hasRendered = false;
    this._renderedConfigKey = '';
    this._child = null;
    this.replaceChildren();
  }

  private _renderWhenVisible() {
    if (!this.isConnected || !this._config) return;

    if (this._child || this._hasRendered || this.hasAttribute('eager') || !('IntersectionObserver' in window)) {
      this._hasRendered = true;
      this._observer?.disconnect();
      this._observer = undefined;
      this._render();
      return;
    }

    if (this._observer) return;

    this._observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this._observer?.disconnect();
        this._observer = undefined;
        this._hasRendered = true;
        this._render();
      },
      { rootMargin: '700px 0px' }
    );
    this._observer.observe(this);
  }

  private _getConfigKey(config: any): string {
    try {
      return JSON.stringify(config) ?? '';
    } catch {
      return String(config?.type ?? '') + ':' + String(config?.entity ?? '');
    }
  }

  private async _render() {
    if (!this.isConnected || !this._config) return;

    const request = ++this._renderRequest;
    const requestedKey = this._configKey;
    let config = this._config;
    if (isMushroomCardType(config?.type)) {
      const ready = await ensureMushroomAvailable();
      if (request !== this._renderRequest || !this.isConnected || requestedKey !== this._configKey) return;
      if (!ready && this._fallbackConfig) config = this._fallbackConfig;
    }
    const configKey = this._getConfigKey(config);

    if (
      this._child &&
      this.contains(this._child) &&
      this._renderedConfigKey === configKey
    ) {
      if (this._hass) this._child.hass = this._hass;
      return;
    }

    try {
      const loadCardHelpers = (window as any).loadCardHelpers;
      if (typeof loadCardHelpers !== 'function') {
        throw new Error('Home Assistant card helpers are not available');
      }

      const helpers = await loadCardHelpers();
      if (
        request !== this._renderRequest ||
        !this.isConnected ||
        requestedKey !== this._configKey
      ) {
        return;
      }

      const child = helpers.createCardElement(config);
      if (!child) throw new Error('Home Assistant did not create a card element');

      // Home Assistant configures the real card before returning it. We only
      // provide hass and mount it, avoiding hui-card's asynchronous setConfig race.
      if (this._hass) child.hass = this._hass;
      this._child = child;
      this._renderedConfigKey = configKey;
      this.replaceChildren(child);
    } catch (e) {
      if (request !== this._renderRequest || !this.isConnected) return;
      // eslint-disable-next-line no-console
      console.warn('dwains-dashboard-next-card-host: failed to create card', e);
      this._child = null;
      this._renderedConfigKey = '';
      const error = document.createElement('div');
      error.className = 'dd-card-host-error';
      error.style.cssText =
        'padding:12px;color:var(--error-color);background:var(--card-background-color);border-radius:8px;';
      error.textContent = 'Card could not be loaded';
      this.replaceChildren(error);
    }
  }
}

if (!customElements.get('dwains-dashboard-next-card-host')) {
  customElements.define('dwains-dashboard-next-card-host', DwainsCardHost);
}
