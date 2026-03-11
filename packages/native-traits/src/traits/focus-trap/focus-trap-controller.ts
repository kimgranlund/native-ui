const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

/** Traps Tab key focus within the host element, cycling between first and last focusable children. */
export class FocusTrapController {
  readonly host: HTMLElement;

  #previousFocus: Element | null = null;
  #trapHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(host: HTMLElement) {
    this.host = host;
  }

  enable(): void {
    // WHY: Remove previous handler before creating a new one to prevent listener leak
    if (this.#trapHandler) {
      this.host.removeEventListener('keydown', this.#trapHandler);
    }
    this.#previousFocus = document.activeElement;

    this.#trapHandler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = [...this.host.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    this.host.addEventListener('keydown', this.#trapHandler);

    // WHY: Focus priority — [autofocus] > first focusable > container
    const autofocus = this.host.querySelector<HTMLElement>('[autofocus]');
    if (autofocus) {
      autofocus.focus();
    } else {
      const focusables = this.host.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        this.host.setAttribute('tabindex', '-1');
        this.host.focus();
      }
    }
  }

  disable(): void {
    if (this.#trapHandler) {
      this.host.removeEventListener('keydown', this.#trapHandler);
      this.#trapHandler = null;
    }
    // WHY: Check isConnected — if the previously focused element was removed from the DOM
    // while the trap was active, calling focus() silently fails and focus is lost
    if (this.#previousFocus instanceof HTMLElement && this.#previousFocus.isConnected) {
      this.#previousFocus.focus();
    }
    this.#previousFocus = null;
  }

  destroy(): void {
    this.disable();
  }
}
