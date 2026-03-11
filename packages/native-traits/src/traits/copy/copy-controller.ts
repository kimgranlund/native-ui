export interface CopyOptions {
  value?: string | (() => string);
  feedbackDuration?: number;
  /** Trigger copy on host click. Default: false (for imperative use), true when used as trait. */
  trigger?: 'click' | false;
}

/** Copies a value to the clipboard and shows visual feedback, dispatching `native:copy`. */
export class CopyController {
  readonly host: HTMLElement;
  value: string | (() => string);
  feedbackDuration: number;

  #timer: ReturnType<typeof setTimeout> | undefined;
  #trigger: 'click' | false;
  #clickHandler: (() => void) | null = null;

  constructor(host: HTMLElement, options: CopyOptions = {}) {
    this.host = host;
    this.value = options.value ?? '';
    this.feedbackDuration = options.feedbackDuration ?? 2000;
    this.#trigger = options.trigger ?? false;
    if (this.#trigger === 'click') {
      this.#clickHandler = () => { this.copy(); };
      this.host.addEventListener('click', this.#clickHandler);
    }
  }

  async copy(): Promise<void> {
    const val = typeof this.value === 'function' ? this.value() : this.value;
    await navigator.clipboard.writeText(val);
    this.host.toggleAttribute('copied', true);
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.host.removeAttribute('copied'), this.feedbackDuration);
    this.host.dispatchEvent(new CustomEvent('native:copy', {
      bubbles: true,
      composed: true,
      detail: { value: val },
    }));
  }

  destroy(): void {
    clearTimeout(this.#timer);
    if (this.#clickHandler) {
      this.host.removeEventListener('click', this.#clickHandler);
      this.#clickHandler = null;
    }
  }
}
