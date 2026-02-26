import { uid } from '../core/uid.ts';
import { DismissController } from './dismiss-controller.ts';

/** Wires anchor positioning between elements and manages popover show/hide with dismiss layer. */
export class PopoverController {
  readonly host: HTMLElement;
  readonly #dismiss: DismissController;

  #popoverEl: HTMLElement | null = null;

  constructor(host: HTMLElement) {
    this.host = host;
    this.#dismiss = new DismissController(host);
  }

  wirePopover(anchor: HTMLElement, popover: HTMLElement): void {
    this.#popoverEl = popover;
    const id = uid('anchor');
    anchor.style.setProperty('anchor-name', `--${id}`);
    popover.style.setProperty('position-anchor', `--${id}`);
  }

  syncPopover(open: boolean): void {
    if (open) {
      // WHY: showPopover() throws InvalidStateError if already open (e.g. effect re-run)
      try { this.#popoverEl?.showPopover(); } catch { /* already open */ }
      this.#dismiss.enable();
    } else {
      // WHY: hidePopover() throws InvalidStateError if already hidden (e.g. initial effect run)
      try { this.#popoverEl?.hidePopover(); } catch { /* already hidden */ }
      this.#dismiss.disable();
    }
  }

  destroy(): void {
    this.#dismiss.destroy();
    this.#popoverEl = null;
  }
}
