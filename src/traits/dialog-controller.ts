export interface DialogOptions {
  contentTarget?: (dialog: HTMLDialogElement) => HTMLElement;
}

/** Creates and manages a native `<dialog>` element with modal, close, and dismiss behavior. */
export class DialogController {
  readonly host: HTMLElement;

  #dialog: HTMLDialogElement | null = null;
  #contentTarget: ((dialog: HTMLDialogElement) => HTMLElement) | undefined;

  constructor(host: HTMLElement, options: DialogOptions = {}) {
    this.host = host;
    this.#contentTarget = options.contentTarget;
    this.#setup();
  }

  get open(): boolean {
    return this.#dialog?.open ?? false;
  }

  showModal(): void {
    if (!this.#dialog || this.open) return;
    this.#dialog.showModal();
    this.host.toggleAttribute('open', true);
  }

  close(): void {
    if (!this.#dialog || !this.open) return;
    this.#dialog.close();
    this.host.toggleAttribute('open', false);
    this.host.dispatchEvent(new Event('close'));
  }

  destroy(): void {
    if (this.#dialog) {
      this.#dialog.removeEventListener('cancel', this.#onCancel);
      this.#dialog.removeEventListener('click', this.#onClick);
    }
    this.host.removeEventListener('ui-dismiss', this.#onDismiss);
    this.#dialog = null;
  }

  // WHY: Arrow properties for stable references — addEventListener/removeEventListener match
  #onCancel = (e: Event): void => {
    e.preventDefault();
    if (!this.host.hasAttribute('no-close-on-escape')) this.close();
  };

  #onClick = (e: MouseEvent): void => {
    if (e.target === this.#dialog && !this.host.hasAttribute('no-close-on-backdrop')) this.close();
  };

  #onDismiss = (): void => {
    if (!this.host.hasAttribute('no-close-on-escape')) this.close();
  };

  #setup(): void {
    const dialog = document.createElement('dialog');
    const target = this.#contentTarget ? this.#contentTarget(dialog) : dialog;

    while (this.host.firstChild) target.appendChild(this.host.firstChild);
    if (target !== dialog) dialog.appendChild(target);
    this.host.appendChild(dialog);
    this.#dialog = dialog;

    dialog.addEventListener('cancel', this.#onCancel);
    dialog.addEventListener('click', this.#onClick);
    this.host.addEventListener('ui-dismiss', this.#onDismiss);
  }
}
