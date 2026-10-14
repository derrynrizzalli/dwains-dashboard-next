import { css } from 'lit';

/**
 * Shared look of the dashboard's own dialogs (rendered in Home Assistant's
 * ha-dialog): a centred dialog on desktop and a bottom sheet with a drag
 * handle on phones. Also the header title badge and the header link.
 */
export const dialogSheetStyles = css`
  :host {
    /* Home Assistant's dialog (width="large") and the older mwc dialog. */
    --ha-dialog-width-lg: 1200px;
    --mdc-dialog-min-width: 90vw;
    --mdc-dialog-max-width: 1200px;
    --mdc-dialog-max-height: 90vh;
    --mdc-dialog-z-index: 10;
    --dialog-backdrop-opacity: 0.4;
    -webkit-tap-highlight-color: transparent;
  }

  ha-dialog {
    --mdc-dialog-heading-ink-color: var(--primary-text-color);
    --mdc-dialog-content-ink-color: var(--primary-text-color);
    --dialog-content-padding: 0;
    --ha-dialog-scrim-backdrop-filter: brightness(72%) blur(2px);
    --mdc-dialog-scrim-color: rgba(0, 0, 0, 0.28);
  }

  ha-dialog-header {
    --mdc-typography-headline6-font-size: 20px;
    --mdc-typography-headline6-font-weight: 500;
  }

  .sheet-handle {
    display: none;
  }

  .content {
    padding: 16px 18px 22px !important;
    overflow: auto;
    overscroll-behavior: contain;
    max-height: calc(90vh - 120px);
    background: var(--primary-background-color);
  }

  .dialog-title {
    min-width: 0;
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    vertical-align: middle;
  }

  .dialog-title-icon {
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    color: var(--dialog-accent, var(--primary-color));
    background: color-mix(in srgb, var(--dialog-accent, var(--primary-color)) 14%, transparent);
  }

  .dialog-title-icon ha-icon {
    --mdc-icon-size: 18px;
  }

  .dialog-title-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dialog-header-link {
    min-height: 32px;
    margin-inline-end: 8px;
    padding: 0 8px 0 12px;
    border: 0;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--primary-color);
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 0.18s ease;
  }

  .dialog-header-link:hover {
    background: color-mix(in srgb, var(--primary-color) 18%, transparent);
  }

  .dialog-header-link:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .dialog-header-link ha-icon {
    --mdc-icon-size: 16px;
  }

  .dialog-header-link .label-short {
    display: none;
  }

  /* Narrow phones: a short label, so the title keeps its room. */
  @media (max-width: 420px) {
    .dialog-header-link .label-long {
      display: none;
    }

    .dialog-header-link .label-short {
      display: inline;
    }
  }

  @media (pointer: coarse) {
    .dialog-header-link {
      min-height: 40px;
    }
  }

  @media (max-width: 600px) {
    :host {
      --mdc-dialog-min-width: min(calc(100vw - 4px), 480px);
      --mdc-dialog-max-width: min(calc(100vw - 4px), 480px);
      --mdc-dialog-min-height: calc(100dvh - 54px);
      --mdc-dialog-max-height: calc(100dvh - 54px);
      --ha-dialog-min-height: calc(100dvh - 54px);
      --ha-dialog-max-height: calc(100dvh - 54px);
      --vertical-align-dialog: flex-end;
      --dialog-surface-margin-top: 54px;
      --dialog-container-padding: 0;
      --ha-dialog-scrim-backdrop-filter: brightness(66%) blur(2px);
      --mdc-dialog-scrim-color: rgba(0, 0, 0, 0.34);
    }

    ha-dialog {
      margin: 0 !important;
      border-radius: 24px 24px 0 0 !important;
      --mdc-dialog-container-elevation: 0 18px 50px rgba(15, 23, 42, 0.28);
      --ha-dialog-border-radius: 24px 24px 0 0;
      --ha-dialog-show-duration: 1ms;
      --show-duration: 1ms;
      --ha-dialog-hide-duration: 160ms;
      --hide-duration: 160ms;
    }

    ha-dialog .mdc-dialog__surface {
      border-radius: 24px 24px 0 0 !important;
      overflow: hidden;
    }

    ha-dialog-header {
      position: relative;
      padding-top: 22px;
    }

    .sheet-handle {
      display: block;
      position: absolute;
      top: 8px;
      left: 50%;
      width: 38px;
      height: 4px;
      border-radius: 999px;
      transform: translateX(-50%);
      background: color-mix(in srgb, var(--secondary-text-color) 24%, transparent);
    }

    .content {
      max-height: calc(100dvh - 148px);
      padding: 12px 12px calc(84px + env(safe-area-inset-bottom, 0px)) !important;
    }

    .dialog-title-icon {
      width: 28px;
      height: 28px;
      border-radius: 9px;
    }
  }
`;
