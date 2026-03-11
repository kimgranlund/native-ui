import { NativeElement } from '@nonoun/native-core';

/**
 * Toast notification element with intent-based styling and optional dismiss button.
 * Created by ToastController — not typically authored in HTML directly.
 *
 * @attr {string} message - Toast message text
 * @attr {'info'|'success'|'warning'|'danger'} intent - Visual intent (default: info)
 * @attr {boolean} dismissible - Show dismiss button
 */
export class NToast extends NativeElement {
  static observedAttributes = ['message', 'dismissible'];

  #internals: ElementInternals;
  #messageEl: HTMLSpanElement | null = null;
  #closeEl: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'alert';
  }

  setup(): void {
    super.setup();

    this.#messageEl = document.createElement('span');
    this.#messageEl.className = 'n-toast-message';
    this.#messageEl.textContent = this.getAttribute('message') ?? '';
    this.appendChild(this.#messageEl);

    if (this.hasAttribute('dismissible')) {
      this.#addCloseButton();
    }
  }

  teardown(): void {
    this.#messageEl = null;
    this.#closeEl = null;
    super.teardown();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (name === 'message' && this.#messageEl) {
      this.#messageEl.textContent = val ?? '';
    }
    if (name === 'dismissible' && this.isConnected) {
      if (val !== null && !this.#closeEl) {
        this.#addCloseButton();
      } else if (val === null && this.#closeEl) {
        this.#closeEl.remove();
        this.#closeEl = null;
      }
    }
    super.attributeChangedCallback(name, old, val);
  }

  #addCloseButton(): void {
    this.#closeEl = document.createElement('button');
    this.#closeEl.className = 'n-toast-close';
    this.#closeEl.setAttribute('aria-label', 'Dismiss');
    this.#closeEl.textContent = '\u00d7';
    this.#closeEl.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('native:dismiss', { bubbles: true, composed: true }));
    });
    this.appendChild(this.#closeEl);
  }
}
