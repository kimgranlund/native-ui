import { UIElement } from '../../core/ui-element.ts';

/**
 * Search input wrapper for the command palette.
 * @fires ui-input - Fired on keystroke with `{ value }` detail
 */
export class UICommandInput extends UIElement {
  #input: HTMLInputElement | null = null;

  setup(): void {
    super.setup();

    this.deferChildren(() => {
      this.#input = this.querySelector<HTMLInputElement>('input');
      if (this.#input) {
        this.#input.addEventListener('input', this.#onInput);
      }
    });
  }

  teardown(): void {
    if (this.#input) {
      this.#input.removeEventListener('input', this.#onInput);
    }
    this.#input = null;
    super.teardown();
  }

  get inputElement(): HTMLInputElement | null {
    return this.#input;
  }

  focus(options?: FocusOptions): void {
    this.#input?.focus(options);
  }

  clear(): void {
    if (this.#input) {
      this.#input.value = '';
      this.#onInput();
    }
  }

  #onInput = (): void => {
    const value = this.#input?.value ?? '';
    this.dispatchEvent(new CustomEvent('ui-input', {
      bubbles: true,
      composed: true,
      detail: { value },
    }));
  };
}
