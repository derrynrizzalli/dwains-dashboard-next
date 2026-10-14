// Drag-to-close for the dialogs that show as a bottom sheet on phones
// (600px wide or less). Pulling the sheet down moves its panel along with
// the finger; letting go past the close distance closes the dialog,
// otherwise the panel snaps back.

/** Movement before a touch turns into a drag, in pixels. */
export const SHEET_DRAG_START_PX = 8;
/** Close distance: this many pixels, or a quarter of the sheet when that is less. */
export const SHEET_CLOSE_DISTANCE_PX = 120;
export const SHEET_CLOSE_FRACTION = 0.25;
export const SHEET_SNAP_BACK_MS = 250;
const SHEET_CLOSE_MS = 180;
/** Taps right after a drag are ignored, so letting go does not press a button. */
export const SHEET_TAP_SUPPRESS_MS = 400;

const SHEET_MEDIA_QUERY = '(max-width: 600px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Whether letting go `offset` pixels down closes a sheet of `sheetHeight` pixels. */
export function shouldCloseSheet(offset: number, sheetHeight: number): boolean {
  if (!(offset > 0)) return false;
  const height = sheetHeight > 0 ? sheetHeight : Number.POSITIVE_INFINITY;
  return offset > Math.min(SHEET_CLOSE_DISTANCE_PX, height * SHEET_CLOSE_FRACTION);
}

export interface DragStartInput {
  /** Movement since the touch started; positive is down. */
  deltaX: number;
  deltaY: number;
  /** The touch started on a form control, slider or chart. */
  onControl: boolean;
  /** The touch started in content that is scrolled away from its top. */
  contentScrolled: boolean;
}

/** Whether a touch turns into a sheet drag: a downward pull of more than 8px. */
export function canStartDrag({ deltaX, deltaY, onControl, contentScrolled }: DragStartInput): boolean {
  if (onControl || contentScrolled) return false;
  return deltaY > SHEET_DRAG_START_PX && deltaY > Math.abs(deltaX);
}

const CONTROL_TAGS: ReadonlySet<string> = new Set([
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'HA-SLIDER',
  'HA-CONTROL-SLIDER',
  'HA-TEXTFIELD',
  'HA-SELECT',
  'HA-CHART-BASE',
  'MWC-SLIDER',
  'MD-SLIDER',
]);

function isControl(element: Element): boolean {
  if (CONTROL_TAGS.has(element.tagName)) return true;
  if (element.getAttribute('role') === 'slider') return true;
  return element instanceof HTMLElement && element.isContentEditable;
}

function isScrolled(element: Element): boolean {
  if (element.scrollTop <= 0 || element.scrollHeight <= element.clientHeight) return false;
  const overflowY = getComputedStyle(element).overflowY;
  return overflowY === 'auto' || overflowY === 'scroll';
}

/**
 * The panel Home Assistant's ha-dialog shows, in old (mwc) and new (Web
 * Awesome) versions of the dialog.
 */
export function findDialogPanel(haDialog: Element | null | undefined): HTMLElement | null {
  const haDialogRoot = haDialog?.shadowRoot;
  const waDialogRoot = haDialogRoot?.querySelector('wa-dialog')?.shadowRoot;
  return (
    waDialogRoot?.querySelector('[part~="panel"]') ||
    waDialogRoot?.querySelector('dialog') ||
    haDialogRoot?.querySelector('.mdc-dialog__surface') ||
    haDialogRoot?.querySelector('[part~="surface"]')
  ) as HTMLElement | null;
}

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

export interface SheetDragOptions {
  /** The panel that moves; looked up when a touch starts. */
  getPanel: () => HTMLElement | null;
  /** Closes the dialog after the sheet was pulled down far enough. */
  onClose: () => void;
}

type DragPhase = 'idle' | 'pending' | 'dragging';

/**
 * Adds drag-to-close to a dialog element. Listens to touches on `host` (the
 * dialog's own element: touches in its shadow tree pass through it).
 */
export class SheetDragController {
  private _phase: DragPhase = 'idle';
  private _startX = 0;
  private _startY = 0;
  private _offset = 0;
  private _blocked = false;
  private _contentScrolled = false;
  private _panel: HTMLElement | null = null;
  private _suppressClicksUntil = 0;
  private _settleTimer?: number;

  constructor(private readonly _host: HTMLElement, private readonly _options: SheetDragOptions) {}

  public attach(): void {
    this._host.addEventListener('touchstart', this._onTouchStart, { passive: true });
    this._host.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this._host.addEventListener('touchend', this._onTouchEnd);
    this._host.addEventListener('touchcancel', this._onTouchCancel);
    this._host.addEventListener('click', this._onClickCapture, true);
  }

  public detach(): void {
    this._host.removeEventListener('touchstart', this._onTouchStart);
    this._host.removeEventListener('touchmove', this._onTouchMove);
    this._host.removeEventListener('touchend', this._onTouchEnd);
    this._host.removeEventListener('touchcancel', this._onTouchCancel);
    this._host.removeEventListener('click', this._onClickCapture, true);
    this._reset();
  }

  private _onTouchStart = (event: TouchEvent): void => {
    if (event.touches.length !== 1 || !matches(SHEET_MEDIA_QUERY)) {
      this._cancel();
      return;
    }

    const panel = this._options.getPanel();
    const path = event.composedPath();
    // Only touches on the sheet itself, not on the backdrop around it.
    if (!panel || !path.includes(panel)) return;

    const touch = event.touches[0]!;
    this._clearSettleTimer();
    this._panel = panel;
    this._phase = 'pending';
    this._startX = touch.clientX;
    this._startY = touch.clientY;
    this._offset = 0;
    this._blocked = false;
    this._contentScrolled = false;

    for (const target of path) {
      if (target === panel) break;
      if (!(target instanceof Element)) continue;
      if (isControl(target)) this._blocked = true;
      if (isScrolled(target)) this._contentScrolled = true;
    }
  };

  private _onTouchMove = (event: TouchEvent): void => {
    if (this._phase === 'idle' || !this._panel) return;
    const touch = event.touches[0];
    if (!touch || event.touches.length !== 1) {
      this._cancel();
      return;
    }

    const deltaX = touch.clientX - this._startX;
    const deltaY = touch.clientY - this._startY;

    if (this._phase === 'pending') {
      if (Math.abs(deltaX) <= SHEET_DRAG_START_PX && Math.abs(deltaY) <= SHEET_DRAG_START_PX) return;
      if (!canStartDrag({ deltaX, deltaY, onControl: this._blocked, contentScrolled: this._contentScrolled })) {
        // Scrolling or moving a control: leave this touch alone.
        this._phase = 'idle';
        return;
      }
      this._phase = 'dragging';
      this._startY = touch.clientY;
      this._panel.style.transition = 'none';
      this._panel.style.willChange = 'transform';
    }

    this._offset = Math.max(0, touch.clientY - this._startY);
    this._panel.style.transform = `translate3d(0, ${this._offset}px, 0)`;
    if (event.cancelable) event.preventDefault();
  };

  private _onTouchEnd = (): void => {
    if (this._phase !== 'dragging' || !this._panel) {
      this._phase = 'idle';
      return;
    }

    const panel = this._panel;
    const height = panel.getBoundingClientRect().height;
    this._phase = 'idle';
    this._suppressClicksUntil = Date.now() + SHEET_TAP_SUPPRESS_MS;

    if (shouldCloseSheet(this._offset, height)) {
      this._settle(panel, `translate3d(0, ${Math.max(height, this._offset)}px, 0)`, SHEET_CLOSE_MS, () => {
        this._options.onClose();
        this._resetPanel(panel);
      });
    } else {
      this._settle(panel, 'translate3d(0, 0, 0)', SHEET_SNAP_BACK_MS, () => this._resetPanel(panel));
    }
  };

  private _onTouchCancel = (): void => {
    this._cancel();
  };

  private _onClickCapture = (event: Event): void => {
    if (Date.now() >= this._suppressClicksUntil) return;
    event.preventDefault();
    event.stopPropagation();
  };

  /** Animates the panel to `transform` and calls `done` afterwards (right away with reduced motion). */
  private _settle(panel: HTMLElement, transform: string, duration: number, done: () => void): void {
    this._clearSettleTimer();
    if (matches(REDUCED_MOTION_QUERY)) {
      panel.style.transform = transform;
      done();
      return;
    }
    panel.style.transition = `transform ${duration}ms ${EASING}`;
    panel.style.transform = transform;
    this._settleTimer = window.setTimeout(() => {
      this._settleTimer = undefined;
      done();
    }, duration);
  }

  private _cancel(): void {
    const panel = this._panel;
    const wasDragging = this._phase === 'dragging';
    this._phase = 'idle';
    if (wasDragging && panel) {
      this._settle(panel, 'translate3d(0, 0, 0)', SHEET_SNAP_BACK_MS, () => this._resetPanel(panel));
    }
  }

  private _resetPanel(panel: HTMLElement): void {
    panel.style.removeProperty('transition');
    panel.style.removeProperty('transform');
    panel.style.removeProperty('will-change');
    if (this._panel === panel) this._panel = null;
  }

  private _clearSettleTimer(): void {
    if (this._settleTimer !== undefined) {
      window.clearTimeout(this._settleTimer);
      this._settleTimer = undefined;
    }
  }

  private _reset(): void {
    this._clearSettleTimer();
    this._phase = 'idle';
    if (this._panel) this._resetPanel(this._panel);
    this._panel = null;
  }
}

/**
 * Slides a sheet panel in from the bottom on phones. The animation leaves
 * no fill behind, so the drag controller can move the panel afterwards.
 * Returns false when the panel is not there yet.
 */
export function animateSheetIn(panel: HTMLElement | null): boolean {
  if (!panel?.animate) return false;
  panel.animate(
    [
      { transform: 'translate3d(0, 100%, 0)', opacity: 0.98 },
      { transform: 'translate3d(0, 0, 0)', opacity: 1 },
    ],
    { duration: 280, easing: EASING, fill: 'backwards' }
  );
  return true;
}

/** Whether dialogs show as a bottom sheet and may animate. */
export function shouldAnimateSheet(): boolean {
  return matches(SHEET_MEDIA_QUERY) && !matches(REDUCED_MOTION_QUERY);
}
