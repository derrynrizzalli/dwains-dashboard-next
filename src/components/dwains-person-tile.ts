import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { getDomainColor } from '../utils/icons';
import type { PersonPresence } from '../utils/home-information';

/**
 * One person in the People popup: avatar (or icon), name and presence. The
 * tile is a real button; a click on it bubbles out of the element.
 */
@customElement('dwains-dashboard-next-person-tile')
export class DwainsPersonTile extends LitElement {
  @property({ attribute: false }) public name = '';
  @property({ attribute: false }) public stateLabel = '';
  @property({ attribute: false }) public picture = '';
  @property({ attribute: false }) public icon = 'mdi:account';
  @property({ attribute: false }) public presence: PersonPresence = 'unknown';

  protected override render() {
    return html`
      <button
        class="tile is-${this.presence}"
        type="button"
        aria-label=${this.stateLabel ? `${this.name}: ${this.stateLabel}` : this.name}
      >
        <span class="avatar ${this.picture ? 'has-picture' : ''}" aria-hidden="true">
          ${this.picture
            ? html`<img src=${this.picture} alt="" loading="lazy" decoding="async">`
            : html`<ha-icon icon=${this.icon}></ha-icon>`}
        </span>
        <span class="copy">
          <span class="name">${this.name}</span>
          ${this.stateLabel ? html`<span class="state">${this.stateLabel}</span>` : nothing}
        </span>
        <ha-icon class="chevron" icon="mdi:chevron-right" aria-hidden="true"></ha-icon>
      </button>
    `;
  }

  static override styles = css`
    :host {
      --person-color: ${unsafeCSS(getDomainColor('person'))};
      --person-home-color: #2f9b62;
      display: block;
      min-width: 0;
    }

    .tile {
      width: 100%;
      min-height: 62px;
      padding: 10px 12px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 12px;
      border: 0;
      border-radius: 14px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font: inherit;
      text-align: left;
      cursor: pointer;
      box-shadow:
        0 10px 24px rgba(15, 23, 42, 0.05),
        inset 0 0 0 1px color-mix(in srgb, var(--primary-text-color) 6%, transparent);
      -webkit-tap-highlight-color: transparent;
      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease;
    }

    .tile:hover {
      box-shadow:
        0 14px 28px rgba(15, 23, 42, 0.08),
        inset 0 0 0 1px color-mix(in srgb, var(--primary-color) 14%, transparent);
    }

    .tile:active {
      transform: scale(0.985);
    }

    .tile:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .avatar {
      width: 40px;
      height: 40px;
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 999px;
      color: var(--person-color);
      background: color-mix(in srgb, var(--person-color) 13%, transparent);
    }

    .avatar ha-icon {
      --mdc-icon-size: 22px;
    }

    .avatar.has-picture {
      background: var(--secondary-background-color);
    }

    .avatar img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }

    .copy {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .name,
    .state {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .name {
      font-size: 14px;
      font-weight: 850;
      line-height: 1.15;
    }

    .state {
      color: var(--secondary-text-color);
      font-size: 12px;
      font-weight: 750;
      line-height: 1.15;
    }

    .is-home .state {
      color: var(--person-home-color);
    }

    .is-home .avatar {
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--person-home-color) 55%, transparent);
    }

    /* No tracker: neutral, clearly not home, away or in a zone. */
    .is-unknown .avatar {
      opacity: 0.6;
      filter: grayscale(1);
    }

    .is-unknown .state {
      color: var(--disabled-text-color, var(--secondary-text-color));
      font-style: italic;
    }

    .chevron {
      --mdc-icon-size: 18px;
      flex: 0 0 auto;
      color: color-mix(in srgb, var(--primary-text-color) 38%, transparent);
    }

    @media (prefers-reduced-motion: reduce) {
      .tile {
        transition: none;
      }

      .tile:active {
        transform: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'dwains-dashboard-next-person-tile': DwainsPersonTile;
  }
}
