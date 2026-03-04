export interface PresentOptions {
  /** Safety margin from viewport edges (default: '2rem') */
  inset?: string;
  /** Show close X button in top-right corner (default: true) */
  closeButton?: boolean;
}

/**
 * Shows content in a full-viewport dialog overlay with an optional close button.
 *
 * Wraps the host element in a modal `<dialog>` at its current DOM position.
 * `showModal()` promotes to the top layer for rendering, so the dialog stays
 * in the original DOM context — CSS custom properties inherit normally.
 * On dismiss the host is unwrapped back to its original position.
 *
 * Events:
 * - `native:present` — dispatched after dialog opens
 * - `native:dismiss` — dispatched after dialog closes and host is restored
 */
export class PresentController {
  readonly host: HTMLElement;

  #dialog: HTMLDialogElement | null = null;
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

    // WHY: Save the host's next sibling so the dialog takes its exact position.
    const parent = this.host.parentElement;
    const next = this.host.nextSibling;

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

    // Dark backdrop — inline stylesheet scoped to this dialog
    const backdropStyle = document.createElement('style');
    backdropStyle.textContent = `dialog[data-present]::backdrop { background: rgba(0,0,0,0.75); }`;
    dialog.setAttribute('data-present', '');
    dialog.appendChild(backdropStyle);

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
      closeBtn.innerHTML = '<svg viewBox="0 0 256 256" fill="currentColor" style="width:1em;height:1em"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>';
      closeBtn.addEventListener('native:press', () => this.dismiss());
      wrapper.appendChild(closeBtn);
    }

    // WHY: Insert dialog where the host was, then move host inside it.
    // showModal() promotes to the top layer for rendering, so the dialog
    // doesn't need to be on document.body. Staying in place preserves
    // CSS custom property inheritance from ancestor elements.
    // WHY: _reparenting flag prevents NativeElement from firing teardown+setup
    // during the synchronous DOM move (disconnect → reconnect in same task).
    // Must set on host AND all NativeElement descendants — child elements also
    // receive disconnect/connect callbacks during the move.
    setReparenting(this.host, true);
    wrapper.appendChild(this.host);
    dialog.appendChild(wrapper);
    parent?.insertBefore(dialog, next);
    setReparenting(this.host, false);
    this.#dialog = dialog;

    // Wire backdrop + escape dismiss
    dialog.addEventListener('cancel', this.#onCancel);
    dialog.addEventListener('click', this.#onClick);

    // Open — save focused element so showModal() autofocus doesn't steal it
    const priorFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    if (priorFocus && this.host.contains(priorFocus)) {
      priorFocus.focus();
    } else {
      // Nothing inside was focused — blur whatever showModal picked
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    this.host.toggleAttribute('presented', true);
    this.host.dispatchEvent(new CustomEvent('native:present', { bubbles: true }));
  }

  toggle(): void {
    if (this.open) this.dismiss();
    else this.present();
  }

  dismiss(): void {
    if (!this.open || !this.#dialog) return;

    // WHY: The dialog sits where the host was. Replace dialog with host
    // to restore the original DOM structure.
    this.#dialog.close();
    this.#dialog.removeEventListener('cancel', this.#onCancel);
    this.#dialog.removeEventListener('click', this.#onClick);
    setReparenting(this.host, true);
    this.#dialog.replaceWith(this.host);
    setReparenting(this.host, false);
    this.#dialog = null;

    this.host.removeAttribute('presented');
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

/** Set _reparenting on an element and all NativeElement descendants. */
function setReparenting(root: HTMLElement, value: boolean): void {
  type Reparentable = HTMLElement & { _reparenting?: boolean };
  const el = root as Reparentable;
  if ('_reparenting' in el) el._reparenting = value;
  for (const child of root.querySelectorAll('*')) {
    if ('_reparenting' in child) (child as Reparentable)._reparenting = value;
  }
}
