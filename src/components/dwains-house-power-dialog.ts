import { mdiClose } from '@mdi/js';
import { LitElement, css, html, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { HomeAssistant } from '../types/home-assistant';
import type { DwainsDashboardConfig } from '../types/strategy';
import { closeDialogThenNavigate } from '../utils/dialog-history';
import { getDomainColor } from '../utils/icons';
import { ddLocalize } from '../utils/localize';
import {
  SheetDragController,
  animateSheetIn,
  findDialogPanel,
  shouldAnimateSheet,
} from '../utils/sheet-drag-controller';
import { dialogSheetStyles } from './styles/dialog-sheet-styles';
import { fireEvent } from './utils/fire-event';
import './ui/dd-house-power-panel';

export interface HousePowerDialogParams {
  config: DwainsDashboardConfig;
  /** Opens Devices > Energy (the header link). */
  onViewEnergy?: () => void;
}

/**
 * House power popup of the Home page: the whole house, the top room and
 * every room with its graph and power sensors (the same panel as Devices >
 * Energy).
 */
@customElement('dwains-dashboard-next-house-power-dialog')
export class DwainsHousePowerDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: HousePowerDialogParams;

  private _mobileSheetAnimated = false;
  private _sheetDrag = new SheetDragController(this, {
    getPanel: () => findDialogPanel(this.renderRoot?.querySelector('ha-dialog')),
    onClose: () => this.closeDialog(),
  });

  private _t(key: string, vars?: Record<string, string | number>): string {
    return ddLocalize(this.hass, key, vars);
  }

  public showDialog(params: HousePowerDialogParams): void {
    this._params = params;
    this._mobileSheetAnimated = false;
  }

  public closeDialog(): void {
    this._params = undefined;
    this._mobileSheetAnimated = false;
    fireEvent(this, 'dialog-closed', { dialog: this.localName });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._sheetDrag.attach();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._sheetDrag.detach();
  }

  protected override updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (this._mobileSheetAnimated || !this._params || !shouldAnimateSheet()) return;
    requestAnimationFrame(() => {
      if (animateSheetIn(findDialogPanel(this.renderRoot.querySelector('ha-dialog')))) {
        this._mobileSheetAnimated = true;
      }
    });
  }

  private _handleViewEnergy = (): void => {
    const navigate = this._params?.onViewEnergy;
    if (!navigate) {
      this.closeDialog();
      return;
    }
    // Home Assistant closes the dialog with history.back(); navigate after that.
    closeDialogThenNavigate(this.localName, () => this.closeDialog(), navigate);
  };

  protected override render() {
    if (!this._params) return nothing;
    const title = this._t('home.house_power_usage');

    return html`
      <ha-dialog
        open
        width="large"
        @closed=${this.closeDialog}
        @cancel=${() => this.closeDialog()}
        .heading=${title}
        .type=${''}
        flexContent
        hideActions
      >
        <ha-dialog-header slot="header">
          <div class="sheet-handle" aria-hidden="true"></div>
          <ha-icon-button
            slot="navigationIcon"
            .label=${this._t('common.close')}
            .path=${mdiClose}
            @click=${() => this.closeDialog()}
          ></ha-icon-button>
          <span slot="title" class="dialog-title">
            <span class="dialog-title-icon" aria-hidden="true">
              <ha-icon icon="mdi:flash"></ha-icon>
            </span>
            <span class="dialog-title-text">${title}</span>
          </span>
          ${this._params.onViewEnergy ? html`
            <button
              slot="actionItems"
              class="dialog-header-link"
              type="button"
              aria-label=${this._t('navigation.view_energy_sensors')}
              @click=${this._handleViewEnergy}
            >
              <span class="label-long">${this._t('navigation.view_energy_sensors')}</span>
              <span class="label-short">${this._t('devices.energy')}</span>
              <ha-icon icon="mdi:chevron-right" aria-hidden="true"></ha-icon>
            </button>
          ` : nothing}
        </ha-dialog-header>

        <div class="content">
          <dwains-dashboard-next-house-power-panel
            .hass=${this.hass}
            .config=${this._params.config}
          ></dwains-dashboard-next-house-power-panel>
        </div>
      </ha-dialog>
    `;
  }

  static override styles = [dialogSheetStyles, css`
    :host {
      --dialog-accent: ${unsafeCSS(getDomainColor('energy'))};
      --domain-color: ${unsafeCSS(getDomainColor('energy'))};
    }
  `];
}

declare global {
  interface HTMLElementTagNameMap {
    'dwains-dashboard-next-house-power-dialog': DwainsHousePowerDialog;
  }
}
