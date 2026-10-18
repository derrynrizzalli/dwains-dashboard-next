import { loadPart } from '../utils/load-part';

const DEVICES_CARD_TAG = 'dwains-dashboard-next-devices-card';
const DEVICES_IMPL_TAG = 'dwains-dashboard-next-devices-impl';

interface DevicesCardElement extends HTMLElement {
  hass?: unknown;
  setConfig?: (config: unknown) => void;
  getCardSize?: () => number;
}

/**
 * Public Devices card. Home Assistant creates this as soon as the Devices tab
 * opens. The heavy card, and the house-power panel it imports, load then.
 */
export class DwainsDevicesCardShell extends HTMLElement {
  private _hass: unknown;
  private _config: unknown;
  private _child?: DevicesCardElement;
  private _mounting = false;

  set hass(value: unknown) {
    this._hass = value;
    if (this._child) this._child.hass = value;
  }

  get hass(): unknown {
    return this._hass;
  }

  setConfig(config: unknown): void {
    this._config = config;
    if (this._child?.setConfig) {
      this._child.setConfig(config);
      return;
    }
    void this._mount();
  }

  getCardSize(): number {
    return this._child?.getCardSize?.() ?? 1;
  }

  connectedCallback(): void {
    this.style.display = 'block';
    this.style.height = '100%';
    this.style.minHeight = '0';
    if (!this._child) {
      const pending = document.createElement('div');
      pending.style.cssText = 'padding:24px;color:var(--secondary-text-color);';
      pending.textContent = 'Loading…';
      this.replaceChildren(pending);
    }
    void this._mount();
  }

  private async _mount(): Promise<void> {
    if (this._child || this._mounting || !this._config || !this.isConnected) return;
    this._mounting = true;
    try {
      await loadPart(() => import('./dwains-devices-card'));
      if (this._child || !this.isConnected || !this._config) return;
      if (!customElements.get(DEVICES_IMPL_TAG)) {
        throw new Error('Dwains Dashboard Next devices card did not register');
      }
      const child = document.createElement(DEVICES_IMPL_TAG) as DevicesCardElement;
      child.style.display = 'block';
      child.style.height = '100%';
      child.setConfig?.(this._config);
      if (this._hass !== undefined) child.hass = this._hass;
      this._child = child;
      this.replaceChildren(child);
    } catch (error) {
      if (!this.isConnected) return;
      console.error('Dwains Dashboard Next - Devices page failed to load', error);
      const message = document.createElement('div');
      message.style.cssText = 'padding:24px;color:var(--error-color);';
      message.textContent = error instanceof Error ? error.message : 'Devices page failed to load';
      this.replaceChildren(message);
    } finally {
      this._mounting = false;
    }
  }
}

if (!customElements.get(DEVICES_CARD_TAG)) {
  customElements.define(DEVICES_CARD_TAG, DwainsDevicesCardShell);
}
