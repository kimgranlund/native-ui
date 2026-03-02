import { signal } from '../../reactivity/signal.ts';
import { NativeElement } from '../../core/native-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';

/**
 * Selectable item within a command palette.
 * @attr {string} value - Item value emitted on selection
 * @attr {boolean} disabled - Disables this item
 * @attr {string} keywords - Additional search terms for filtering
 * @fires native:select - Fired on click with `{ value, label }` detail
 */
export class NCommandItem extends NativeElement {
  static observedAttributes = ['value', 'disabled', 'keywords'];

  #internals: ElementInternals;
  #value = signal('');
  #disabled = signal(false);
  #keywords = signal('');

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'option';
  }

  get value(): string {
    return this.#value.value;
  }

  set value(val: string) {
    this.#value.value = val;
    if (this.getAttribute('value') !== val) {
      this.setAttribute('value', val);
    }
  }

  get disabled(): boolean {
    return this.#disabled.value;
  }

  set disabled(val: boolean) {
    this.#disabled.value = val;
    this.toggleAttribute('disabled', val);
  }

  get keywords(): string {
    return this.#keywords.value;
  }

  set keywords(val: string) {
    this.#keywords.value = val;
    if (val) {
      if (this.getAttribute('keywords') !== val) {
        this.setAttribute('keywords', val);
      }
    } else {
      this.removeAttribute('keywords');
    }
  }

  get label(): string {
    return this.textContent?.trim() || '';
  }

  get searchText(): string {
    return `${this.label} ${this.#value.value} ${this.#keywords.value}`.toLowerCase();
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    switch (name) {
      case 'value':
        this.#value.value = val ?? '';
        break;
      case 'disabled':
        this.#disabled.value = val !== null;
        break;
      case 'keywords':
        this.#keywords.value = val ?? '';
        break;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();

    this.addEffect(createDisabledEffect(this, this.#disabled, this.#internals));

    this.addEventListener('click', this.#onClick);
  }

  teardown(): void {
    this.removeEventListener('click', this.#onClick);
    super.teardown();
  }

  #onClick = (): void => {
    if (this.#disabled.value) return;
    this.dispatchEvent(new CustomEvent('native:select', {
      bubbles: true,
      composed: true,
      detail: { value: this.#value.value, label: this.label },
    }));
  };
}
