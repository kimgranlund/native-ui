import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { prop, syncProp } from '../../core/reactive-prop.ts';
import type { ReactiveProp } from '../../core/reactive-prop.ts';
import { PressController } from '../../traits/press-controller.ts';

/**
 * Individual segment within a segmented control.
 * @attr {string} value - Segment value emitted on selection
 * @attr {boolean} disabled - Disables this segment
 * @fires ui-select - Fired on press with `{ value, label }` detail
 */
export class UISegment extends UIElement {
  static observedAttributes = ['value', 'disabled'];

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

  get disabled(): boolean {
    return this.#disabled.value;
  }

  set disabled(val: boolean) {
    this.#disabled.set(val);
  }

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
    this.#press = new PressController(this, {
      disabled: () => this.disabled,
    });
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');

    this.addEffect(createDisabledEffect(this, this.#disabled.signal, this.#internals));

    this.addEventListener('ui-press', this.#onPress);
  }

  teardown(): void {
    this.removeEventListener('ui-press', this.#onPress);
    this.#press.destroy();
    super.teardown();
  }

  #onPress = (): void => {
    if (this.#disabled.value) return;
    this.dispatchEvent(new CustomEvent('ui-select', {
      bubbles: true,
      composed: true,
      detail: { value: this.value, label: this.label },
    }));
  };
}
