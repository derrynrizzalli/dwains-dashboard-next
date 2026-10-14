import { css } from 'lit';

/**
 * Home information popups (people, climate and device groups): one card per
 * room with its own action, compact entity rows and the people grid.
 *
 * Desktop: rooms with two entities or fewer take half the width, fuller
 * rooms span the dialog with three entity columns (two on small tablets,
 * four on very wide screens). Phones: one column.
 */
export const homeInformationDialogStyles = css`
  .room-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    align-items: start;
  }

  .room-card {
    --room-accent: var(--primary-color);
    min-width: 0;
    padding: 14px;
    border-radius: 16px;
    background: var(--card-background-color);
    box-shadow:
      0 14px 34px rgba(15, 23, 42, 0.06),
      inset 0 0 0 1px rgba(15, 23, 42, 0.04);
  }

  .room-card.is-full {
    grid-column: 1 / -1;
  }

  .room-head {
    min-height: 40px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .room-icon {
    width: 36px;
    height: 36px;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    color: var(--room-accent);
    background: color-mix(in srgb, var(--room-accent) 13%, transparent);
  }

  .room-icon ha-icon {
    --mdc-icon-size: 20px;
  }

  .room-name {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: var(--primary-text-color);
    font-size: 16px;
    font-weight: 850;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .room-count {
    color: var(--secondary-text-color);
    font-size: 13px;
    font-weight: 750;
    font-variant-numeric: tabular-nums;
  }

  .room-entities {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }

  .room-card.is-full .room-entities {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  /* Room toggle: "active/total" with a switch track. */
  .room-toggle {
    min-height: 32px;
    padding: 4px 5px 4px 10px;
    flex: 0 0 auto;
    border: 0;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--secondary-text-color);
    background: color-mix(in srgb, var(--secondary-background-color) 80%, transparent);
    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition: color 0.18s ease;
  }

  .room-toggle-track {
    position: relative;
    width: 34px;
    height: 20px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: color-mix(in srgb, var(--primary-text-color) 18%, transparent);
    transition: background-color 0.18s ease;
  }

  .room-toggle-track::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
    transition: transform 0.18s ease;
  }

  .room-toggle.is-on {
    color: var(--room-accent);
  }

  .room-toggle.is-on .room-toggle-track {
    background: var(--room-accent);
  }

  .room-toggle.is-on .room-toggle-track::after {
    transform: translateX(14px);
  }

  /* Room open/close and lock/unlock. */
  .room-segmented {
    padding: 3px;
    flex: 0 0 auto;
    display: inline-flex;
    gap: 3px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--secondary-background-color) 80%, transparent);
    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
  }

  .room-segment {
    width: 34px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: color-mix(in srgb, var(--primary-text-color) 58%, transparent);
    background: transparent;
    cursor: pointer;
    transition:
      background-color 0.18s ease,
      color 0.18s ease;
  }

  .room-segment.is-current {
    color: #ffffff;
    background: var(--room-accent);
    box-shadow: 0 6px 12px color-mix(in srgb, var(--room-accent) 22%, transparent);
  }

  .room-segment ha-icon {
    --mdc-icon-size: 17px;
  }

  .room-toggle:focus-visible,
  .room-segment:focus-visible,
  .domain-entity-card:focus-visible,
  .domain-entity-action:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  /* Entity row: icon, name and state, action. */
  .domain-entity-card.is-row {
    min-height: 64px;
    padding: 10px 12px;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    border-radius: 14px;
    background: var(--primary-background-color);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-text-color) 7%, transparent);
  }

  .domain-entity-card.is-row.is-active {
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--entity-color) 24%, transparent);
  }

  .domain-entity-card.is-row .domain-entity-copy {
    flex: 1;
  }

  .domain-entity-card.is-row .domain-entity-name {
    font-size: 14px;
    line-height: 1.15;
  }

  .domain-entity-card.is-row .domain-entity-status {
    margin-top: 3px;
  }

  /* People: one group without a header. */
  .person-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
    gap: 10px;
  }

  @media (pointer: coarse) {
    .room-toggle {
      min-height: 40px;
    }

    .room-segment {
      width: 40px;
      height: 34px;
    }

    .domain-entity-card.is-row .domain-cover-action {
      width: 34px;
      height: 34px;
    }

    .domain-entity-toggle,
    .domain-entity-more,
    .domain-lock-action {
      position: relative;
    }

    /* 40px touch area around the small entity controls. */
    .domain-entity-toggle::after,
    .domain-entity-more::after,
    .domain-lock-action::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 44px;
      height: 44px;
      transform: translate(-50%, -50%);
    }
  }

  @media (min-width: 601px) and (max-width: 1000px) {
    .room-card.is-full .room-entities {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 2000px) {
    :host {
      --mdc-dialog-max-width: 1280px;
    }

    .room-card.is-full .room-entities {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (max-width: 600px) {
    .room-grid {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }

    .room-card {
      padding: 12px;
      border-radius: 14px;
    }

    .room-card.is-full {
      grid-column: auto;
    }

    .room-card .room-entities,
    .room-card.is-full .room-entities,
    .person-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .room-toggle,
    .room-toggle-track,
    .room-toggle-track::after,
    .room-segment,
    .domain-entity-card,
    .domain-entity-action,
    .domain-entity-toggle::before {
      transition: none;
    }
  }
`;
