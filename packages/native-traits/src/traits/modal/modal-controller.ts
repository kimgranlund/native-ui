import { DismissController } from '../dismiss/dismiss-controller.ts';
import { FocusTrapController } from '../focus-trap/focus-trap-controller.ts';

export interface ModalOptions {
  /** Enable dismiss-on-outside-click/Escape. Default: true. */
  dismiss?: boolean;
  /** Enable focus trapping within the host. Default: true. */
  focusTrap?: boolean;
}

/**
 * Combines dismiss (outside click / Escape) and focus-trap behaviors
 * into a single controller for modal surfaces (dialogs, drawers, etc.).
 *
 * Dispatches `native:dismiss` when the user clicks outside or presses Escape.
 * Traps Tab focus within the host element when enabled.
 */
export class ModalController {
  readonly host: HTMLElement;
  readonly #dismiss: DismissController;
  readonly #focusTrap: FocusTrapController;

  #dismissEnabled: boolean;
  #focusTrapEnabled: boolean;
  #active = false;

  constructor(host: HTMLElement, options: ModalOptions = {}) {
    this.host = host;
    this.#dismissEnabled = options.dismiss !== false;
    this.#focusTrapEnabled = options.focusTrap !== false;
    this.#dismiss = new DismissController(host);
    this.#focusTrap = new FocusTrapController(host);
  }

  /** Whether dismiss behavior is active. */
  get dismiss(): boolean { return this.#dismissEnabled; }
  set dismiss(value: boolean) {
    if (value === this.#dismissEnabled) return;
    this.#dismissEnabled = value;
    if (this.#active) {
      if (value) this.#dismiss.enable();
      else this.#dismiss.disable();
    }
  }

  /** Whether focus trapping is active. */
  get focusTrap(): boolean { return this.#focusTrapEnabled; }
  set focusTrap(value: boolean) {
    if (value === this.#focusTrapEnabled) return;
    this.#focusTrapEnabled = value;
    if (this.#active) {
      if (value) this.#focusTrap.enable();
      else this.#focusTrap.disable();
    }
  }

  /** Whether the modal is currently active (enabled). */
  get active(): boolean { return this.#active; }

  enable(): void {
    if (this.#active) return;
    this.#active = true;
    if (this.#dismissEnabled) this.#dismiss.enable();
    if (this.#focusTrapEnabled) this.#focusTrap.enable();
  }

  disable(): void {
    if (!this.#active) return;
    this.#active = false;
    if (this.#dismissEnabled) this.#dismiss.disable();
    if (this.#focusTrapEnabled) this.#focusTrap.disable();
  }

  destroy(): void {
    this.#dismiss.destroy();
    this.#focusTrap.destroy();
    this.#active = false;
  }
}
