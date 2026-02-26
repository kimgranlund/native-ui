import { UIElement } from '../../core/ui-element.ts';
import { createDisabledEffect } from '../../core/effects.ts';
import { prop, syncProp } from '../../core/reactive-prop.ts';
import type { ReactiveProp } from '../../core/reactive-prop.ts';
import { PressController } from '../../traits/press-controller.ts';
import { FormAssociable } from '../../core/form-associable.ts';

/**
 * Toggle switch with on/off state and form association.
 * @attr {boolean} checked - Whether the switch is on
 * @attr {boolean} disabled - Disables interaction
 * @attr {string} name - Form field name
 * @attr {string} value - Form value when checked (defaults to "on")
 * @fires ui-change - Fired on toggle with `{ checked, value }` detail
 */
export class UISwitch extends FormAssociable(UIElement) {
  static observedAttributes = ['checked', 'disabled', 'name', 'value'];

  #internals: ElementInternals;
  #checked: ReactiveProp<boolean>;
  #disabled: ReactiveProp<boolean>;
  #initialChecked = false;
  #press!: PressController;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'switch';
    this.#checked = prop(this, 'checked', { type: 'boolean' });
    this.#disabled = prop(this, 'disabled', { type: 'boolean' });
  }

  get checked(): boolean { return this.#checked.value; }
  set checked(val: boolean) { this.#checked.set(val); }

  get disabled(): boolean { return this.#disabled.value; }
  set disabled(val: boolean) { this.#disabled.set(val); }

  get name(): string { return this.getAttribute('name') ?? ''; }
  set name(val: string) { this.setAttribute('name', val); }

  get value(): string { return this.getAttribute('value') ?? 'on'; }
  set value(val: string) { this.setAttribute('value', val); }

  attributeChangedCallback(name: string, old: string | null, val: string | null): void {
    if (old === val) return;
    syncProp({ checked: this.#checked, disabled: this.#disabled }, name, val);
    super.attributeChangedCallback?.(name, old, val);
  }

  setup(): void {
    super.setup();
    this.#press = new PressController(this, {
      disabled: () => this.disabled,
    });
    this.#initialChecked = this.hasAttribute('checked');
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');

    this.addEffect(createDisabledEffect(this, this.#disabled.signal, this.#internals, { manageTabindex: true }));

    this.addEffect(() => {
      const checked = this.#checked.value;
      // WHY: setAttribute (not internals.ariaChecked) so CSS [aria-checked] selectors match
      this.setAttribute('aria-checked', checked ? 'true' : 'false');
      this.#internals.setFormValue(checked ? this.value : null);
    });

    this.addEventListener('ui-press', this.#onPress);
  }

  teardown(): void {
    this.removeEventListener('ui-press', this.#onPress);
    this.#press.destroy();
    super.teardown();
  }

  override onFormDisabled(disabled: boolean): void {
    this.#disabled.signal.value = disabled;
  }

  override onFormReset(): void {
    this.#checked.set(this.#initialChecked);
  }

  #onPress = (): void => {
    if (this.#disabled.value) return;

    this.checked = !this.#checked.value;

    this.dispatchEvent(new CustomEvent('ui-change', {
      bubbles: true,
      composed: true,
      detail: { checked: this.#checked.value, value: this.value },
    }));
  };
}
