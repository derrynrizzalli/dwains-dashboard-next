import { fireEvent } from "./fire-event";
import type { HousePowerDialogParams } from "../dwains-house-power-dialog";

const DIALOG_TAG = "dwains-dashboard-next-house-power-dialog";

export const loadHousePowerDialog = () => import("../dwains-house-power-dialog");

let isDialogOpen = false;

/** Opens the house power popup through Home Assistant's dialog manager. */
export const showHousePowerDialog = (
  element: HTMLElement,
  dialogParams: HousePowerDialogParams
): void => {
  if (isDialogOpen) return;
  isDialogOpen = true;

  const dialogClosedHandler = (e: Event) => {
    if ((e as CustomEvent).detail?.dialog === DIALOG_TAG) {
      isDialogOpen = false;
      element.removeEventListener("dialog-closed", dialogClosedHandler);
    }
  };

  element.addEventListener("dialog-closed", dialogClosedHandler);

  fireEvent(element, "show-dialog", {
    dialogTag: DIALOG_TAG,
    dialogImport: loadHousePowerDialog,
    dialogParams,
  });

  // Fallback in case the dialog-closed event does not reach the element.
  setTimeout(() => {
    if (isDialogOpen) {
      isDialogOpen = false;
      element.removeEventListener("dialog-closed", dialogClosedHandler);
    }
  }, 2000);
};
