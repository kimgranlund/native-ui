import { NativeElement } from '../../core/native-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { prop, syncProp } from '../../core/reactive-prop.ts';
import type { ReactiveProp } from '../../core/reactive-prop.ts';
import { PressController } from '../../traits/press-controller.ts';

/**
 * Individual radio button within a radio group.
 * @attr {string} value - Radio value emitted on selection
 * @attr {boolean} disabled - Disables this radio
 * @fires native:select - Fired on click with `{ value, label }` detail
 */
export class NRadio extends NativeElement {
  static observedAttributes = ['disabled'];

  #internals: ElementInternals;
  #disabled: ReactiveProp<boolean>;
  #press!: PressController;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'radio';
    this.#disabled = prop(this, 'disabled', { type: 'boolean' });
  }

  get value(): string {
    return this.getAttribute('value') ?? '';
  }

  set value(val: string) {
    this.setAttribute('value', val);
  }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) { this.#disabled.set(val); }

  get label(): string {
    return this.getAttribute('label') ?? this.textContent?.trim() ?? '';
  }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    syncProp({ disabled: this.#disabled }, name, val);
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();
    this.setAttribute('aria-checked', 'false');
    this.#press = new PressController(this, {
      disabled: () => this.disabled,
    });
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');

    this.addEffect(createDisabledEffect(this, this.#disabled.signal, this.#internals));

    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeyDown);
  }

  teardown(): void {
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('keydown', this.#onKeyDown);
    this.#press.destroy();
    super.teardown();
  }

  #onClick = (): void => {
    if (this.disabled) return;
    this.dispatchEvent(new CustomEvent('native:select', {
      bubbles: true,
      composed: true,
      detail: { value: this.value, label: this.label },
    }));
  };

  // WHY: Enter/Space should also select (roving focus lands here via arrow keys)
  #onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (this.disabled) return;
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('native:select', {
      bubbles: true,
      composed: true,
      detail: { value: this.value, label: this.label },
    }));
  };
}
