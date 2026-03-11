import { NativeElement } from '@nonoun/native-core';

/**
 * Search input wrapper for the command palette.
 * @fires native:input - Fired on keystroke with `{ value }` detail
 */
export class NCommandInput extends NativeElement {
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
    this.dispatchEvent(new CustomEvent('native:input', {
      bubbles: true,
      composed: true,
      detail: { value },
    }));
  };
}
