import { signal } from '../../reactivity/signal.ts';
import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { prop, syncProp } from '../../core/reactive-prop.ts';
import type { ReactiveProp } from '../../core/reactive-prop.ts';

/**
 * Selectable navigation item within a nav component.
 * @attr {string} value - Item value emitted on selection
 * @attr {boolean} disabled - Disables this item
 * @attr {string} label - Display label (falls back to text content)
 * @fires ui-select - Fired on click with `{ value, label }` detail
 */
export class UINavItem extends UIElement {
  static observedAttributes = ['value', 'disabled', 'label'];

  #internals: ElementInternals;
  #value = signal('');
  #disabled: ReactiveProp<boolean>;
  #label = signal('');

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'option';
    this.#disabled = prop(this, 'disabled', { type: 'boolean' });
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

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) { this.#disabled.set(val); }

  get label(): string {
    return this.#label.value || this.textContent?.trim() || '';
  }

  set label(val: string) {
    this.#label.value = val;
    if (val) {
      if (this.getAttribute('label') !== val) {
        this.setAttribute('label', val);
      }
    } else {
      this.removeAttribute('label');
    }
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    if (syncProp({ disabled: this.#disabled }, name, val)) {
      super.attributeChangedCallback?.(name, old, val);
      return;
    }
    switch (name) {
      case 'value':
        this.#value.value = val ?? '';
        break;
      case 'label':
        this.#label.value = val ?? '';
        break;
    }
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();

    this.addEffect(createDisabledEffect(this, this.#disabled.signal, this.#internals));

    this.addEventListener('click', this.#onClick);
  }

  teardown(): void {
    this.removeEventListener('click', this.#onClick);
    super.teardown();
  }

  #onClick = (): void => {
    if (this.disabled) return;
    this.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true,
      composed: true,
      detail: { value: this.#value.value, label: this.label },
    }));
  };
}
