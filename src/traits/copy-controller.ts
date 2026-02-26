export interface CopyOptions {
  value?: string | (() => string);
  feedbackDuration?: number;
}

/** Copies a value to the clipboard and shows visual feedback, dispatching `ui-copy`. */
export class CopyController {
  readonly host: HTMLElement;
  value: string | (() => string);
  feedbackDuration: number;

  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(host: HTMLElement, options: CopyOptions = {}) {
    this.host = host;
    this.value = options.value ?? '';
    this.feedbackDuration = options.feedbackDuration ?? 2000;
  }

  async copy(): Promise<void> {
    const val = typeof this.value === 'function' ? this.value() : this.value;
    await navigator.clipboard.writeText(val);
    this.host.toggleAttribute('copied', true);
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.host.removeAttribute('copied'), this.feedbackDuration);
    this.host.dispatchEvent(new CustomEvent('ui-copy', {
      bubbles: true,
      composed: true,
      detail: { value: val },
    }));
  }

  destroy(): void {
    clearTimeout(this.#timer);
  }
}
