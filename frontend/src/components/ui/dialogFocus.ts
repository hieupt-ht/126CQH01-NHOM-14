import type { KeyboardEvent } from "react";

// Keep Tab inside native modal dialogs, including browsers that tab to browser chrome.
export function trapDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
    "button:not(:disabled), input:not(:disabled), a[href], [tabindex='0']",
  )).filter((element) => element.getClientRects().length > 0);
  const first = controls[0], last = controls.at(-1);
  if (!first) {
    event.preventDefault();
    event.currentTarget.focus();
  } else if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) {
    event.preventDefault();
    first.focus();
  }
}
