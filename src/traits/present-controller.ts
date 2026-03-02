export interface PresentOptions {
  /** Safety margin from viewport edges (default: '2rem') */
  inset?: string;
  /** Show close X button in top-right corner (default: true) */
  closeButton?: boolean;
}

/**
 * Shows content in a full-viewport dialog overlay with an optional close button.
 *
 * Moves the host element into a modal `<dialog>`, centers it within an inset
 * wrapper, and restores it to its original DOM position on dismiss.
 *
 * Events:
 * - `native:present` — dispatched after dialog opens
 * - `native:dismiss` — dispatched after dialog closes and host is restored
 */
export class PresentController {
  readonly host: HTMLElement;

  #dialog: HTMLDialogElement | null = null;
  #originalParent: HTMLElement | null = null;
  #originalNext: Node | null = null;
  #inset: string;
  #closeButton: boolean;

  constructor(host: HTMLElement, options: PresentOptions = {}) {
    this.host = host;
    this.#inset = options.inset ?? '2rem';
    this.#closeButton = options.closeButton !== false;
  }

  get open(): boolean {
    return this.#dialog?.open ?? false;
  }

  present(): void {
    if (this.open) return;

    // Save original position so we can restore on dismiss
    this.#originalParent = this.host.parentElement;
    this.#originalNext = this.host.nextSibling;

    // Create dialog
    const dialog = document.createElement('dialog');
    dialog.style.cssText = `
      border: none;
      background: transparent;
      padding: 0;
      width: 100vw;
      max-width: 100vw;
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
    `;

    // Create centering wrapper with inset margin
    const wrapper = document.createElement('div');
    const inset = this.#inset;
    wrapper.style.cssText = `
      display: grid;
      place-items: center;
      width: calc(100vw - ${inset} * 2);
      height: calc(100vh - ${inset} * 2);
      margin: ${inset};
      position: relative;
    `;

    // Create close button if requested
    if (this.#closeButton) {
      const closeBtn = document.createElement('n-button');
      closeBtn.setAttribute('variant', 'ghost');
      closeBtn.setAttribute('size', 'sm');
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        z-index: 1;
      `;
      closeBtn.innerHTML = '<n-icon name="x"></n-icon>';
      closeBtn.addEventListener('native:press', () => this.dismiss());
      wrapper.appendChild(closeBtn);
    }

    // Move host into wrapper
    wrapper.appendChild(this.host);
    dialog.appendChild(wrapper);
    document.body.appendChild(dialog);
    this.#dialog = dialog;

    // Wire backdrop + escape dismiss
    dialog.addEventListener('cancel', this.#onCancel);
    dialog.addEventListener('click', this.#onClick);

    // Open
    dialog.showModal();
    this.host.dispatchEvent(new CustomEvent('native:present', { bubbles: true }));
  }

  dismiss(): void {
    if (!this.open || !this.#dialog) return;

    // Move host back to original position
    if (this.#originalParent) {
      if (this.#originalNext) {
        this.#originalParent.insertBefore(this.host, this.#originalNext);
      } else {
        this.#originalParent.appendChild(this.host);
      }
    }

    // Clean up dialog
    this.#dialog.close();
    this.#dialog.removeEventListener('cancel', this.#onCancel);
    this.#dialog.removeEventListener('click', this.#onClick);
    this.#dialog.remove();
    this.#dialog = null;

    this.host.dispatchEvent(new CustomEvent('native:dismiss', { bubbles: true }));
  }

  destroy(): void {
    if (this.open) this.dismiss();
  }

  // WHY: Arrow properties for stable references — addEventListener/removeEventListener match
  #onCancel = (e: Event): void => {
    e.preventDefault();
    this.dismiss();
  };

  #onClick = (e: MouseEvent): void => {
    if (e.target === this.#dialog) this.dismiss();
  };
}
